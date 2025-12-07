import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    description: "",
    scheduled_date: "",
    scheduled_time: "",
    duration_per_subject_minutes: 45,
    total_duration_minutes: 180,
    marks_per_question: 1,
    is_active: true,
  });

  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

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
        .maybeSingle();

      if (roleError || !roleData || roleData.role !== "admin") {
        toast.error("Only admins can create mock exams");
        setIsAdmin(false);
      } else {
        setIsAdmin(true);
      }
    };
    getUser();
  }, []);

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
      toast.error("Maximum of 4 subjects allowed per mock exam");
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

    if (selectedSubjectIds.length !== 4) {
      toast.error("Please select exactly 4 subjects for the mock exam");
      return;
    }

    if (!formData.scheduled_date) {
      toast.error("Please select an exam date");
      return;
    }

    for (const subj of subjects) {
      if (subj.questions.length === 0 || subj.questions.some(q => !q.question_text || !q.option_a || !q.option_b || !q.option_c || !q.option_d)) {
        toast.error(`Please fill in all fields for ${subj.subject}`);
        return;
      }
    }

    try {
      // Create mock exam
      const { data: mockExam, error: mockError } = await supabase
        .from("mock_exams")
        .insert({
          title: formData.title,
          description: formData.description || null,
          scheduled_date: formData.scheduled_date,
          scheduled_time: formData.scheduled_time || null,
          duration_per_subject_minutes: formData.duration_per_subject_minutes,
          total_duration_minutes: formData.total_duration_minutes,
          marks_per_question: formData.marks_per_question,
          is_active: formData.is_active,
          created_by: user.id,
        })
        .select()
        .single();

      if (mockError) throw mockError;

      // For each subject, create the link and assessment
      for (let i = 0; i < subjects.length; i++) {
        const subj = subjects[i];
        
        // Link subject to mock exam
        const { error: linkError } = await supabase
          .from("mock_exam_subjects")
          .insert({
            mock_exam_id: mockExam.id,
            subject_id: subj.subjectId,
            order_position: i + 1,
          });

        if (linkError) throw linkError;

        // Create assessment for this subject (flagged as mock exam)
        const { data: assessment, error: assessError } = await supabase
          .from("assessments")
          .insert({
            title: `${formData.title} - ${subj.subject}`,
            subject_id: subj.subjectId,
            teacher_id: user.id,
            duration_minutes: formData.duration_per_subject_minutes,
            passing_score: 50,
            marks_per_question: formData.marks_per_question,
            is_active: true,
            is_mock_exam: true,
            scheduled_date: formData.scheduled_date,
            scheduled_time: formData.scheduled_time || null,
          })
          .select()
          .single();

        if (assessError) throw assessError;

        // Insert questions
        const questionsWithId = subj.questions.map(q => ({ ...q, assessment_id: assessment.id }));
        const { error: qError } = await supabase.from("questions").insert(questionsWithId);
        if (qError) throw qError;
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
      setFormData({
        title: "",
        description: "",
        scheduled_date: "",
        scheduled_time: "",
        duration_per_subject_minutes: 45,
        total_duration_minutes: 180,
        marks_per_question: 1,
        is_active: true,
      });
      setSelectedSubjectIds([]);
      setSubjects([]);
    } catch (error: any) {
      console.error("Error creating mock exam:", error);
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
          <CardDescription>Select exactly 4 subjects (like JAMB) and design questions for each</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="title">Mock Exam Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., 2025 JAMB Mock"
                  required
                />
              </div>
              <div>
                <Label htmlFor="scheduled_date">Exam Date *</Label>
                <Input
                  id="scheduled_date"
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="scheduled_time">Exam Time</Label>
                <Input
                  id="scheduled_time"
                  type="time"
                  value={formData.scheduled_time}
                  onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="duration_per_subject">Duration per Subject (minutes)</Label>
                <Input
                  id="duration_per_subject"
                  type="number"
                  value={formData.duration_per_subject_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_per_subject_minutes: parseInt(e.target.value) })}
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
                <Label htmlFor="marks_per_question">Marks per Question</Label>
                <Input
                  id="marks_per_question"
                  type="number"
                  min={1}
                  value={formData.marks_per_question}
                  onChange={(e) => setFormData({ ...formData, marks_per_question: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked as boolean })}
                />
                <Label htmlFor="is_active">Active (visible to students)</Label>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description..."
              />
            </div>

            <div>
              <Label className="text-base font-semibold">
                Select 4 Subjects ({selectedSubjectIds.length}/4 selected)
              </Label>
              {selectedSubjectIds.length < 4 && (
                <p className="text-sm text-destructive mt-1">You must select exactly 4 subjects</p>
              )}
              <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-2 mt-2">
                {availableSubjects.map((subj) => (
                  <div key={subj.id} className="flex items-center space-x-2 p-2 border rounded">
                    <Checkbox
                      id={subj.id}
                      checked={selectedSubjectIds.includes(subj.id)}
                      onCheckedChange={(checked) => handleSubjectSelection(subj.id, checked as boolean)}
                      disabled={!selectedSubjectIds.includes(subj.id) && selectedSubjectIds.length >= 4}
                    />
                    <Label htmlFor={subj.id} className="cursor-pointer">{subj.name}</Label>
                  </div>
                ))}
              </div>
            </div>

            {subjects.length > 0 && (
              <Tabs defaultValue={subjects[0]?.subjectId} className="w-full">
                <TabsList className="w-full justify-start flex-wrap h-auto">
                  {subjects.map((subj, index) => (
                    <TabsTrigger key={subj.subjectId} value={subj.subjectId} className="flex-shrink-0">
                      {index + 1}. {subj.subject}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {subjects.map((subj, subjIndex) => (
                  <TabsContent key={subj.subjectId} value={subj.subjectId} className="space-y-4 mt-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">{subj.subject} Questions ({subj.questions.length})</h3>
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
                              <select
                                className="w-full p-2 border rounded"
                                value={question.correct_answer}
                                onChange={(e) => updateQuestion(subjIndex, qIndex, "correct_answer", e.target.value)}
                              >
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                                <option value="D">D</option>
                              </select>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={selectedSubjectIds.length !== 4}
            >
              Create Mock Exam ({selectedSubjectIds.length}/4 subjects)
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateMockExam;
