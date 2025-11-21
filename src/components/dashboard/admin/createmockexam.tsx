import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { notifyUserAction } from "@/lib/emailNotifications";

interface CreateMockExamProps {
  adminId: string; // Assuming admin ID is passed
}

interface Question {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
}

interface SubjectData {
  subject: string;
  questions: Question[];
}

const CreateMockExam = ({ adminId }: CreateMockExamProps) => {
  const [formData, setFormData] = useState({
    title: "",
    total_duration_minutes: 120, // Default 2 hours
    passing_score: 50, // Overall passing %
  });

  const [subjects, setSubjects] = useState<SubjectData[]>([
    { subject: "English", questions: [{ question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "A" }] },
    { subject: "Physics", questions: [{ question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "A" }] },
    { subject: "Chemistry", questions: [{ question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "A" }] },
    { subject: "Biology", questions: [{ question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "A" }] },
  ]);

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

    // Validate all subjects have at least one question and fields are filled
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
          total_duration_minutes: formData.total_duration_minutes,
          passing_score: formData.passing_score,
          created_by: adminId,
        })
        .select()
        .single();

      if (mockError) throw mockError;

      // For each subject, create assessment and questions
      for (const subj of subjects) {
        const { data: assessment, error: assessError } = await supabase
          .from("assessments")
          .insert({
            title: `${formData.title} - ${subj.subject}`,
            subject: subj.subject, // Assuming subject field exists
            duration_minutes: Math.floor(formData.total_duration_minutes / 4), // Evenly distribute time
            passing_score: 0, // Per-subject passing not enforced
            teacher_id: adminId, // Or admin_id if different
          })
          .select()
          .single();

        if (assessError) throw assessError;

        // Insert questions
        const questionsWithId = subj.questions.map(q => ({ ...q, assessment_id: assessment.id }));
        const { error: qError } = await supabase.from("questions").insert(questionsWithId);
        if (qError) throw qError;

        // Link to mock exam
        await supabase.from("mock_exam_assessments").insert({
          mock_exam_id: mockExam.id,
          assessment_id: assessment.id,
          subject: subj.subject,
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
              `A new mock exam "${formData.title}" has been created and is now available for you to take.`
            );
          }
        });
      }

      toast.success("Mock Exam created successfully!");
      // Reset form
      setFormData({ title: "", total_duration_minutes: 120, passing_score: 50 });
      setSubjects(subjects.map(subj => ({ ...subj, questions: [{ question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "A" }] })));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Mock Exam</CardTitle>
          <CardDescription>Design a mock exam with questions for English, Physics, Chemistry, and Biology</CardDescription>
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
                <Label htmlFor="duration">Total Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.total_duration_minutes}
                  onChange={(e) => setFormData({ ...formData, total_duration_minutes: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="passing">Overall Passing Score (%)</Label>
                <Input
                  id="passing"
                  type="number"
                  value={formData.passing_score}
                  onChange={(e) => setFormData({ ...formData, passing_score: parseInt(e.target.value) })}
                  required
                />
              </div>
            </div>

            {subjects.map((subj, subjIndex) => (
              <Card key={subj.subject}>
                <CardHeader>
                  <CardTitle>{subj.subject}</CardTitle>
                  <CardDescription>Add questions for {subj.subject}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button type="button" onClick={() => addQuestion(subjIndex)} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Question
                  </Button>

                  {subj.questions.map((question, qIndex) => (
                    <Card key={qIndex}>
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">Question {qIndex + 1}</h4>
                          {subj.questions.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeQuestion(subjIndex, qIndex)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        <div>
                          <Label>Question Text</Label>
                          <Input
                            value={question.question_text}
                            onChange={(e) => updateQuestion(subjIndex, qIndex, "question_text", e.target.value)}
                            required
                          />
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label>Option A</Label>
                            <Input
                              value={question.option_a}
                              onChange={(e) => updateQuestion(subjIndex, qIndex, "option_a", e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <Label>Option B</Label>
                            <Input
                              value={question.option_b}
                              onChange={(e) => updateQuestion(subjIndex, qIndex, "option_b", e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <Label>Option C</Label>
                            <Input
                              value={question.option_c}
                              onChange={(e) => updateQuestion(subjIndex, qIndex, "option_c", e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <Label>Option D</Label>
                            <Input
                              value={question.option_d}
                              onChange={(e) => updateQuestion(subjIndex, qIndex, "option_d", e.target.value)}
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Correct Answer</Label>
                          <Select
                            value={question.correct_answer}
                            onValueChange={(value) => updateQuestion(subjIndex, qIndex, "correct_answer", value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
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
                </CardContent>
              </Card>
            ))}

            <Button type="submit" className="w-full">Create Mock Exam</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateMockExam;
