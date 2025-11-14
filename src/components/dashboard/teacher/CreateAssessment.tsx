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

interface CreateAssessmentProps {
  teacherId: string;
}

interface Question {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
}

const CreateAssessment = ({ teacherId }: CreateAssessmentProps) => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    subject_id: "",
    duration_minutes: 30,
    passing_score: 70,
    scheduled_date: "",
    scheduled_time: "",
  });
  const [questions, setQuestions] = useState<Question[]>([
    {
      question_text: "",
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      correct_answer: "A",
    },
  ]);

  useEffect(() => {
    fetchTeacherSubjects();
  }, [teacherId]);

  const fetchTeacherSubjects = async () => {
    const { data } = await supabase
      .from("teacher_subjects")
      .select("subjects(*)")
      .eq("teacher_id", teacherId);

    if (data) {
      setSubjects(data.map((ts: any) => ts.subjects));
    }
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question_text: "",
        option_a: "",
        option_b: "",
        option_c: "",
        option_d: "",
        correct_answer: "A",
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof Question, value: string) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subject_id) {
      toast.error("Please select a subject");
      return;
    }

    if (questions.some(q => !q.question_text || !q.option_a || !q.option_b || !q.option_c || !q.option_d)) {
      toast.error("Please fill in all question fields");
      return;
    }

    try {
      const { data: assessment, error: assessmentError } = await supabase
        .from("assessments")
        .insert({
          ...formData,
          teacher_id: teacherId,
        })
        .select()
        .single();

      if (assessmentError) throw assessmentError;

      const questionsWithAssessmentId = questions.map(q => ({
        ...q,
        assessment_id: assessment.id,
      }));

      const { error: questionsError } = await supabase
        .from("questions")
        .insert(questionsWithAssessmentId);

      if (questionsError) throw questionsError;

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
              `A new assessment "${formData.title}" has been created and is now available for you to take.`
            );
          }
        });
      }

      toast.success("Assessment created successfully!");
      setFormData({
        title: "",
        subject_id: "",
        duration_minutes: 30,
        passing_score: 70,
        scheduled_date: "",
        scheduled_time: "",
      });
      setQuestions([
        {
          question_text: "",
          option_a: "",
          option_b: "",
          option_c: "",
          option_d: "",
          correct_answer: "A",
        },
      ]);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Assessment</CardTitle>
          <CardDescription>Design a new test for your students</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Assessment Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Subject</Label>
                <Select value={formData.subject_id} onValueChange={(value) => setFormData({ ...formData, subject_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
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
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Questions</h3>
                <Button type="button" onClick={addQuestion} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              </div>

              {questions.map((question, index) => (
                <Card key={index}>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Question {index + 1}</h4>
                      {questions.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuestion(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div>
                      <Label>Question Text</Label>
                      <Input
                        value={question.question_text}
                        onChange={(e) => updateQuestion(index, "question_text", e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Option A</Label>
                        <Input
                          value={question.option_a}
                          onChange={(e) => updateQuestion(index, "option_a", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label>Option B</Label>
                        <Input
                          value={question.option_b}
                          onChange={(e) => updateQuestion(index, "option_b", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label>Option C</Label>
                        <Input
                          value={question.option_c}
                          onChange={(e) => updateQuestion(index, "option_c", e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label>Option D</Label>
                        <Input
                          value={question.option_d}
                          onChange={(e) => updateQuestion(index, "option_d", e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Correct Answer</Label>
                      <Select
                        value={question.correct_answer}
                        onValueChange={(value) => updateQuestion(index, "correct_answer", value)}
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
            </div>

            <Button type="submit" className="w-full">Create Assessment</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateAssessment;
