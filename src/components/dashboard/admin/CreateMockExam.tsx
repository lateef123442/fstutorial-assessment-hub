
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { notifyUserAction } from "@/lib/emailNotifications";
import { User } from "@supabase/supabase-js";

interface Question {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
}

interface Subject {
  id: string;
  name: string;
}

interface SubjectData {
  subjectId: string;
  subject: string;
  questions: Question[];
}

const CreateMockExam = () => {
  const [formData, setFormData] = useState({
    title: "",
    total_duration_minutes: 120,
    passing_score: 50,
    is_active: true,
    scheduled_date: "",
    scheduled_time: "",
  });

  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ Fetch logged user & verify admin role
  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) return toast.error("Login required");

      setUser(data.user);

      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .single();

      setIsAdmin(role?.role === "admin");
    };

    loadUser();
  }, []);

  // ✅ Load subjects
  useEffect(() => {
    supabase.from("subjects").select("id, name").then(({ data }) => {
      if (data) setAvailableSubjects(data);
    });
  }, []);

  // ✅ Sync selected subjects
  useEffect(() => {
    const real = availableSubjects.filter(s => selectedSubjectIds.includes(s.id));
    setSubjects(
      real.map(s => ({
        subjectId: s.id,
        subject: s.name,
        questions: [{
          question_text: "",
          option_a: "",
          option_b: "",
          option_c: "",
          option_d: "",
          correct_answer: "A"
        }]
      }))
    );
  }, [selectedSubjectIds, availableSubjects]);

  // ✅ Subject toggle
  const handleSubjectSelection = (id: string, checked: boolean) => {
    if (checked && selectedSubjectIds.length === 4)
      return toast.error("Only 4 subjects allowed");

    setSelectedSubjectIds(prev => checked
      ? [...prev, id]
      : prev.filter(x => x !== id)
    );
  };

  // ✅ Question handlers
  const updateQuestion = (s: number, q: number, key: keyof Question, value: string) => {
    const clone = [...subjects];
    clone[s].questions[q][key] = value;
    setSubjects(clone);
  };

  const addQuestion = (s: number) => {
    const clone = [...subjects];
    clone[s].questions.push({
      question_text: "",
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      correct_answer: "A"
    });
    setSubjects(clone);
  };

  const removeQuestion = (s: number, q: number) => {
    const clone = [...subjects];
    clone[s].questions.splice(q, 1);
    setSubjects(clone);
  };

  // ✅ SUBMIT
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !user) return toast.error("Unauthorized");
    if (!subjects.length) return toast.error("Select at least one subject");

    setLoading(true);

    try {
      // ✅ Create Mock Exam
      const { data: mockExam, error } = await supabase
        .from("mock_exam")
        .insert({
          title: formData.title,
          total_duration_minutes: formData.total_duration_minutes,
          passing_score: formData.passing_score,
          is_active: formData.is_active,
          scheduled_date: formData.scheduled_date || null,
          scheduled_time: formData.scheduled_time || null,
          admin_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // ✅ Create assessments per subject
      for (const subj of subjects) {

        const { data: assessment, error: assessErr } = await supabase
          .from("assessments")
          .insert({
            title: `${formData.title} - ${subj.subject}`,
            subject_id: subj.subjectId,
            teacher_id: user.id,
            duration_minutes: Math.floor(formData.total_duration_minutes / subjects.length),
            passing_score: formData.passing_score,
          })
          .select()
          .single();

        if (assessErr) throw assessErr;

        // ✅ Insert questions
        const questions = subj.questions.map(q => ({
          ...q,
          assessment_id: assessment!.id
        }));
        await supabase.from("questions").insert(questions);

        // ✅ Link mock + assessment
        await supabase.from("mock_exam_assessments").insert({
          mock_exam_id: mockExam.id,
          assessment_id: assessment!.id,
          subject_name: subj.subject
        });
      }

      // ✅ Notify students
      const { data: students } = await supabase
        .from("user_roles")
        .select("profiles(email, full_name)")
        .eq("role", "student");

      students?.forEach(s => {
        if (s.profiles)
          notifyUserAction(
            s.profiles.email,
            s.profiles.full_name,
            "mock_created",
            `A new mock exam "${formData.title}" has been created.`
          );
      });

      toast.success("Mock Exam Created!");

      // ✅ Reset
      setSelectedSubjectIds([]);
      setSubjects([]);
      setFormData({
        title: "",
        total_duration_minutes: 120,
        passing_score: 50,
        is_active: true,
        scheduled_date: "",
        scheduled_time: "",
      });

    } catch (err: any) {
      toast.error(err.message);
    }

    setLoading(false);
  };

  if (!isAdmin) return <div className="p-4">Admin access only</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Mock Exam</CardTitle>
          <CardDescription>Select subjects and add questions</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">

            <div className="grid md:grid-cols-3 gap-4">

              <div>
                <Label>Title</Label>
                <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
              </div>

              <div>
                <Label>Total Time (mins)</Label>
                <Input type="number" value={formData.total_duration_minutes} onChange={e => setFormData({ ...formData, total_duration_minutes: +e.target.value })} />
              </div>

              <div>
                <Label>Passing Score (%)</Label>
                <Input type="number" value={formData.passing_score} onChange={e => setFormData({ ...formData, passing_score: +e.target.value })} />
              </div>

              <div>
                <Label>Exam Date</Label>
                <Input type="date" value={formData.scheduled_date} onChange={e => setFormData({ ...formData, scheduled_date: e.target.value })} />
              </div>

              <div>
                <Label>Exam Time</Label>
                <Input type="time" value={formData.scheduled_time} onChange={e => setFormData({ ...formData, scheduled_time: e.target.value })} />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox checked={formData.is_active} onCheckedChange={v => setFormData({ ...formData, is_active: Boolean(v) })} />
                <Label>Active</Label>
              </div>

            </div>

            {/* SUBJECT PICKER */}
            <div>
              <Label>Subjects (Max 4)</Label>
              <div className="grid md:grid-cols-2 gap-2 mt-2">
                {availableSubjects.map(s => (
                  <div key={s.id} className="flex items-center space-x-2">
                    <Checkbox checked={selectedSubjectIds.includes(s.id)} onCheckedChange={(v) => handleSubjectSelection(s.id, Boolean(v))} />
                    <Label>{s.name}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* QUESTIONS */}
            {subjects.length > 0 && (
              <Tabs defaultValue={subjects[0].subjectId}>
                <TabsList>
                  {subjects.map(s => (
                    <TabsTrigger key={s.subjectId} value={s.subjectId}>{s.subject}</TabsTrigger>
                  ))}
                </TabsList>

                {subjects.map((sub, i) => (
                  <TabsContent key={sub.subjectId} value={sub.subjectId}>

                    <div className="flex justify-between">
                      <h3>{sub.subject}</h3>
                      <Button variant="outline" onClick={() => addQuestion(i)} type="button">
                        <Plus className="w-4 h-4 mr-1" /> Add
                      </Button>
                    </div>

                    {sub.questions.map((q, qi) => (
                      <Card key={qi}>
                        <CardContent className="space-y-3 mt-3">

                          <div className="flex justify-between">
                            <b>Question {qi + 1}</b>
                            {sub.questions.length > 1 && (
                              <Button size="sm" variant="ghost" type="button" onClick={() => removeQuestion(i, qi)}>
                                <Trash2 />
                              </Button>
                            )}
                          </div>

                          <Input placeholder="Question text" value={q.question_text} onChange={e => updateQuestion(i, qi, "question_text", e.target.value)} />

                          {["a", "b", "c", "d"].map(opt => (
                            <Input key={opt} placeholder={`Option ${opt.toUpperCase()}`} value={(q as any)[`option_${opt}`]} onChange={e => updateQuestion(i, qi, `option_${opt}` as any, e.target.value)} />
                          ))}

                          <Select value={q.correct_answer} onValueChange={v => updateQuestion(i, qi, "correct_answer", v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {["A", "B", "C", "D"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                            </SelectContent>
                          </Select>

                        </CardContent>
                      </Card>
                    ))}

                  </TabsContent>
                ))}
              </Tabs>
            )}

            <Button disabled={loading} className="w-full">
              {loading ? "Creating..." : "Create Mock Exam"}
            </Button>

          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateMockExam;
