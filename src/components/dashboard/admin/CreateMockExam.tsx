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
    duration_minutes: 30,  // Added
    passing_score: 50,
    subject_id: "",  // Added
    is_active: true,  // Added
    scheduled_date: "",  // Added
    scheduled_time: "",  // Added
  });

  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Fetch user and check admin role
  useEffect(() => {
    const getUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        toast.error("Please log in");
        return;
      }
      setUser(user);

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (roleError || !roleData || roleData.role !== "admin") {
        toast.error("Only admins can create mock exams");
        setIsAdmin(false);
      } else {
        setIsAdmin(true);
      }
    };
    getUser();
  }, []);

  // Fetch available subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      const { data, error } = await supabase.from("subjects").select("id, name");
      if (error) {
        toast.error("Failed to load subjects");
      } else {
        setAvailableSubjects(data || []);
      }
    };
    fetchSubjects();
  }, []);

  // Update subjects state when selections change
  useEffect(() => {
    const selected = availableSubjects.filter(sub => selectedSubjectIds.includes(sub.id));
    setSubjects(selected.map(sub => ({
      subjectId: sub.id,
      subject: sub.name,
      questions: [{ question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "A" }]
    })));
  }, [selectedSubjectIds, availableSubjects]);

  const handleSubjectSelection = (subjectId: string, checked: boolean) => {
    if (checked && selectedSubjectIds.length >= 4) {
      toast.error("You can select a maximum of 4 subjects");
      return;
    }
    setSelectedSubjectIds(prev =>
      checked ? [...prev, subjectId] : prev.filter(id => id !== subjectId)
    );
  };

  const addQuestion = (subjectIndex: number) => {
    const updatedSubjects = [...subjects];
    updatedSubjects[subjectIndex].questions.push({
      question_text: "",
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      correct_answer: "A",
    });
    setSubjects(updatedSubjects);
  };

  const removeQuestion = (subjectIndex: number, questionIndex: number) => {
    const updatedSubjects = [...subjects];
    updatedSubjects[subjectIndex].questions = updatedSubjects[subjectIndex].questions.filter((_, i) => i !== questionIndex);
    setSubjects(updatedSubjects);
  };

  const updateQuestion = (subjectIndex: number, questionIndex: number, field: keyof Question, value: string) => {
    const updatedSubjects = [...subjects];
    updatedSubjects[subjectIndex].questions[questionIndex] = { ...updatedSubjects[subjectIndex].questions[questionIndex], [field]: value };
    setSubjects(updatedSubjects);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !isAdmin) {
      toast.error("Unauthorized: Only admins can create mock exams");
      return;
    }

    if (selectedSubjectIds.length === 0 || selectedSubjectIds.length > 4) {
      toast.error("Please select between 1 and 4 subjects");
      return;
    }

    // Validate questions
    for (const subj of subjects) {
      if (subj.questions.length === 0 || subj.questions.some(q => !q.question_text || !q.option_a || !q.option_b || !q.option_c || !q.option_d)) {
        toast.error(`Please fill in all fields for ${subj.subject}`);
        return;
      }
    }

    try {
      // Create mock exam in "mock_exam" table
      const { data: mockExam, error: mockError } = await supabase
        .from("mock_exam")
        .insert({
          title: formData.title,
          total_duration_minutes: formData.total_duration_minutes,
          duration_minutes: formData.duration_minutes,  // Added
          passing_score: formData.passing_score,
          subject_id: formData.subject_id || null,  // Added
          admin_id: user.id,  // Added, from user_roles
          is_active: formData.is_active,  // Added
          scheduled_date: formData.scheduled_date || null,  // Added
          scheduled_time: formData.scheduled_time || null,  // Added
          created_by: user.id,
        })
        .select()
        .single();

      if (mockError) throw mockError;

      // For each subject, create assessment
      for (const subj of subjects) {
        const { data: assessment, error: assessError } = await supabase
          .from("assessments")
          .insert({
            title: `${formData.title} - ${subj.subject}`,
            subject_id: subj.subjectId,
            teacher_id: user.id,
            duration_minutes: Math.floor(formData.total_duration_minutes / subjects.length),
            passing_score: 0,
          })
          .select()
          .single();

        if (assessError) throw assessError;

        const questionsWithId = subj.questions.map(q => ({ ...q, assessment_id: assessment.id }));
        const { error: qError } = await supabase.from("questions").insert(questionsWithId);
        if (qError) throw qError;

        await supabase.from("mock_exam_assessments").insert({
          mock_exam_id: mockExam.id,
          assessment_id: assessment.id,
          subject_name: subj.subject,
        });
      }

      // Notify students
      const { data: students } = await supabase
        .from("user_roles")
        .select("user_id, profiles(full_name, email)")
        .eq("role", "student");

      if (students) {
        students.forEach((student: any) => {
          if (student.profiles) {
            notifyUserAction(
              student.profiles.email,
              student.profiles.full_name,
              "assessment_created",
              `A new mock exam "${formData.title}" has been created.`
            );
          }
        });
      }

      toast.success("Mock Exam created successfully!");
      // Reset
      setFormData({
        title: "",
        total_duration_minutes: 120,
        duration_minutes: 30,
        passing_score: 50,
        subject_id: "",
        is_active: true,
        scheduled_date: "",
        scheduled_time: "",
      });
      setSelectedSubjectIds([]);
      setSubjects([]);
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  };

  if (!isAdmin) {
    return <div className="p-4">Access denied: Only admins can create mock exams.</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Mock Exam</CardTitle>
          <CardDescription>Select up to 4 subjects and design questions</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="title">Mock Exam Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="total_duration">Total Duration (minutes)</Label>
                <Input
                  id="total_duration"
                  type="number"
                  value={formData.total_duration_minutes}
                  onChange={(e) => setFormData({ ...formData, total_duration_minutes: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>  {/* Added */}
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="passing">Passing Score (%)</Label>
                <Input
                  id="passing"
                  type="number"
                  value={formData.passing_score}
                  onChange={(e) => setFormData({ ...formData, passing_score: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="subject">Main Subject</Label>  {/* Added */}
                <Select value={formData.subject_id} onValueChange={(value) => setFormData({ ...formData, subject_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubjects.map((subj) => (
                      <SelectItem key={subj.id} value={subj.id}>
                        {subj.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="scheduled_date">Scheduled Date</Label>  {/* Added */}
                <Input
                  id="scheduled_date"
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="scheduled_time">Scheduled Time</Label>  {/* Added */}
                <Input
                  id="scheduled_time"
                  type="time"
                  value={formData.scheduled_time}
                  onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked as boolean })}
                />
                <Label htmlFor="is_active">Is Active</Label>  {/* Added */}
              </div>
            </div>

            <div>
              <Label>Select Subjects (Max 4)</Label>
              <div className="grid md:grid-cols-2 gap-2 mt-2">
                {availableSubjects.map((subj) => (
                  <div key={subj.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={subj.id}
                      checked={selectedSubjectIds.includes(subj.id)}
                      onCheckedChange={(checked) => handleSubjectSelection(subj.id, checked as boolean)}
                    />
                    <Label htmlFor={subj.id}>{subj.name}</Label>
                  </div>
                ))}
              </div>
            </div>

            {subjects.length > 0 && (
              <Tabs defaultValue={subjects[0]?.subjectId} className="w-full">
                <TabsList className="w-full justify-start">
                  {subjects.map((subj) => (
                    <TabsTrigger key={subj.subjectId} value={subj.subjectId} className="flex-1">
                      {subj.subject}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {subjects.map((subj, subjIndex) => (
                  <TabsContent key={subj.subjectId} value={subj.subjectId} className="space-y-4 mt-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">{subj.subject} Questions</h3>
                        <Button type="button" onClick={() => addQuestion(subjIndex)} variant="outline">
                          <Plus className="w-4 h-4 mr-2" /> Add Question
                        </Button>
                      </div>

                      {subj.questions.map((question, qIndex) => (
                        <Card key={qIndex}>
                          <CardContent className="pt-6 space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold">Question {qIndex + 1}</h4>
                              {subj.questions.length > 1 && (
                                <Button type="button" variant="ghost" size="sm" onClick={() => removeQuestion(subjIndex, qIndex)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                            <div>
                              <Label>Question Text</Label>
                              <Input value={question.question_text} onChange={(e) => updateQuestion(subjIndex, qIndex, "question_text", e.target.value)} required />
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                              <div><Label>Option A</Label><Input value={question.option_a} onChange={(e) => updateQuestion(subjIndex, qIndex, "option_a", e.target.value)} required /></div>
                              <div><Label>Option B</Label><Input value={question.option_b} onChange={(e) => updateQuestion(subjIndex, qIndex, "option_b", e.target.value)} required /></div>
                              <div><Label>Option C</Label><Input value={question.option_c} onChange={(e) => updateQuestion(subjIndex, qIndex, "option_c", e.target.value)} required /></div>
                              <div><Label>Option D</Label><Input value={question.option_d} onChange={(e) => updateQuestion(subjIndex, qIndex, "option_d", e.target.value)} required /></div>
                            </div>
                            <div>
                              <Label>Correct Answer</Label>
                              <Select value={question.correct_answer} onValueChange={(value) => updateQuestion(subjIndex, qIndex, "correct_answer", value)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="A">A</SelectItem>
                                  <SelectItem value="B">B</SelectItem>
                                  <SelectItem value="C">C</SelectItem>
                                  <SelectItem value="D">D</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}

            <Button type="submit" className="w-full">Create Mock Exam</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateMockExam;
