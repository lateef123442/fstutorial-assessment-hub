import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, BookOpen } from "lucide-react";
import { notifyUserAction } from "@/lib/emailNotifications";

interface CreateAssessmentProps {
  teacherId: string;
  onCreated?: () => void;
}

interface Question {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
}

const CreateAssessment = ({ teacherId, onCreated }: CreateAssessmentProps) => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    subject_id: "",
    duration_minutes: 30,
    passing_score: 70,
    marks_per_question: 1,
    scheduled_date: "",
    scheduled_time: "",
  });
  const [questions, setQuestions] = useState<Question[]>([
    { question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "A" },
  ]);

  const [showBankImport, setShowBankImport] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [selectedBankIds, setSelectedBankIds] = useState<Set<string>>(new Set());
  const [assessmentQuestions, setAssessmentQuestions] = useState<any[]>([]);
  const [selectedAssessmentIds, setSelectedAssessmentIds] = useState<Set<string>>(new Set());

  useEffect(() => { fetchTeacherSubjects(); }, [teacherId]);

  useEffect(() => {
    if (showBankImport && formData.subject_id) {
      fetchAvailableQuestions();
    }
  }, [showBankImport, formData.subject_id]);

  const fetchTeacherSubjects = async () => {
    const { data } = await supabase.from("teacher_subjects").select("subjects(*)").eq("teacher_id", teacherId);
    if (data) setSubjects(data.map((ts: any) => ts.subjects));
  };

  const fetchAvailableQuestions = async () => {
    // Fetch ALL question bank questions for this subject (from any teacher or admin)
    const { data: qbData } = await supabase.from("question_bank")
      .select("id, question_text, option_a, option_b, option_c, option_d, correct_answer, added_by, profiles:added_by(full_name)")
      .eq("subject_id", formData.subject_id);
    setBankQuestions((qbData || []).map((q: any) => ({ ...q, source_label: q.profiles?.full_name || "Unknown" })));

    // Fetch from ALL existing assessments & mock exams for this subject
    const { data: aqData } = await supabase.from("questions")
      .select("id, question_text, option_a, option_b, option_c, option_d, correct_answer, assessment_id, assessments!inner(subject_id, title, is_mock_exam)")
      .eq("assessments.subject_id", formData.subject_id);
    setAssessmentQuestions((aqData || []).map((q: any) => ({
      ...q,
      source_label: q.assessments?.is_mock_exam ? `Mock: ${q.assessments?.title}` : `Assessment: ${q.assessments?.title}`
    })));
  };

  const toggleBankQuestion = (id: string) => {
    setSelectedBankIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const toggleAssessmentQuestion = (id: string) => {
    setSelectedAssessmentIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const selectAllBank = () => {
    if (selectedBankIds.size === bankQuestions.length) {
      setSelectedBankIds(new Set());
    } else {
      setSelectedBankIds(new Set(bankQuestions.map(q => q.id)));
    }
  };

  const selectAllAssessment = () => {
    if (selectedAssessmentIds.size === assessmentQuestions.length) {
      setSelectedAssessmentIds(new Set());
    } else {
      setSelectedAssessmentIds(new Set(assessmentQuestions.map(q => q.id)));
    }
  };

  const importSelected = () => {
    const imported: Question[] = [];
    const seen = new Set<string>();

    // Add existing questions to seen set to avoid duplicates
    questions.forEach(q => { if (q.question_text.trim()) seen.add(q.question_text.trim().toLowerCase()); });

    bankQuestions.filter(q => selectedBankIds.has(q.id)).forEach(q => {
      const key = q.question_text.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        imported.push({ question_text: q.question_text, option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d, correct_answer: q.correct_answer });
      }
    });

    assessmentQuestions.filter(q => selectedAssessmentIds.has(q.id)).forEach(q => {
      const key = q.question_text.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        imported.push({ question_text: q.question_text, option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d, correct_answer: q.correct_answer });
      }
    });

    if (imported.length === 0) { toast.error("No new questions selected (duplicates removed)"); return; }

    const existing = questions.filter(q => q.question_text.trim() !== "");
    setQuestions([...existing, ...imported]);
    setShowBankImport(false);
    setSelectedBankIds(new Set());
    setSelectedAssessmentIds(new Set());
    toast.success(`${imported.length} question(s) imported`);
  };

  const addQuestion = () => {
    setQuestions([...questions, { question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "A" }]);
  };

  const removeQuestion = (index: number) => { setQuestions(questions.filter((_, i) => i !== index)); };
  const updateQuestion = (index: number, field: keyof Question, value: string) => {
    const updated = [...questions]; updated[index] = { ...updated[index], [field]: value }; setQuestions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject_id) { toast.error("Please select a subject"); return; }
    if (questions.some(q => !q.question_text || !q.option_a || !q.option_b || !q.option_c || !q.option_d)) { toast.error("Please fill in all question fields"); return; }

    try {
      const { data: assessment, error: assessmentError } = await supabase.from("assessments").insert({ ...formData, teacher_id: teacherId, scheduled_time: formData.scheduled_time || null }).select().single();
      if (assessmentError) throw assessmentError;

      const { error: questionsError } = await supabase.from("questions").insert(questions.map(q => ({ ...q, assessment_id: assessment.id })));
      if (questionsError) throw questionsError;

      const { data: students } = await supabase.from("user_roles").select("user_id, profiles(full_name, email)").eq("role", "student");
      if (students) {
        students.forEach((student: any) => {
          if (student.profiles) {
            notifyUserAction(student.profiles.email, student.profiles.full_name, "assessment_created", `A new assessment "${formData.title}" has been created and is now available for you to take.`);
          }
        });
      }

      toast.success("Assessment created successfully!");
      onCreated?.();
      setFormData({ title: "", subject_id: "", duration_minutes: 30, passing_score: 70, marks_per_question: 1, scheduled_date: "", scheduled_time: "" });
      setQuestions([{ question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "A" }]);
    } catch (error: any) { toast.error(error.message); }
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
            <div className="grid md:grid-cols-3 gap-4">
              <div><Label htmlFor="title">Assessment Title</Label><Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required /></div>
              <div>
                <Label>Subject</Label>
                <Select value={formData.subject_id} onValueChange={(value) => setFormData({ ...formData, subject_id: value })}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent className="bg-background z-50">{subjects.map((subject) => (<SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div><Label htmlFor="duration">Duration (minutes)</Label><Input id="duration" type="number" value={formData.duration_minutes} onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })} required /></div>
              <div><Label htmlFor="passing">Passing Score (%)</Label><Input id="passing" type="number" value={formData.passing_score} onChange={(e) => setFormData({ ...formData, passing_score: parseInt(e.target.value) })} required /></div>
              <div><Label htmlFor="marks">Marks per Question</Label><Input id="marks" type="number" min={1} value={formData.marks_per_question} onChange={(e) => setFormData({ ...formData, marks_per_question: parseInt(e.target.value) || 1 })} required /></div>
              <div><Label htmlFor="scheduled_date">Scheduled Date</Label><Input id="scheduled_date" type="date" value={formData.scheduled_date} onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })} required /></div>
              <div><Label htmlFor="scheduled_time">Scheduled Time</Label><Input id="scheduled_time" type="time" value={formData.scheduled_time} onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })} required /></div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-lg font-semibold">Questions ({questions.filter(q => q.question_text.trim()).length})</h3>
                <div className="flex gap-2">
                  {formData.subject_id && (
                    <Button type="button" variant="outline" onClick={() => setShowBankImport(!showBankImport)}>
                      <BookOpen className="w-4 h-4 mr-2" />
                      {showBankImport ? "Hide Import" : "Import Questions"}
                    </Button>
                  )}
                  <Button type="button" onClick={addQuestion} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />Add Question
                  </Button>
                </div>
              </div>

              {showBankImport && (
                <Card className="border-primary/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Import from All Sources</CardTitle>
                    <CardDescription>Select from question bank (yours + admin), past assessments, and mock exams</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {bankQuestions.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-sm">Question Bank ({bankQuestions.length})</h4>
                          <Button type="button" variant="ghost" size="sm" onClick={selectAllBank}>
                            {selectedBankIds.size === bankQuestions.length ? "Deselect All" : "Select All"}
                          </Button>
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {bankQuestions.map((q) => (
                            <label key={q.id} className="flex items-start gap-2 p-2 border rounded cursor-pointer hover:bg-muted/50">
                              <Checkbox checked={selectedBankIds.has(q.id)} onCheckedChange={() => toggleBankQuestion(q.id)} className="mt-1" />
                              <div className="text-sm flex-1">
                                <p className="font-medium">{q.question_text}</p>
                                <p className="text-muted-foreground text-xs">A: {q.option_a} | B: {q.option_b} | C: {q.option_c} | D: {q.option_d} • Correct: {q.correct_answer}</p>
                                <Badge variant="outline" className="text-xs mt-1">By: {q.source_label}</Badge>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    {assessmentQuestions.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-sm">Assessments & Mock Exams ({assessmentQuestions.length})</h4>
                          <Button type="button" variant="ghost" size="sm" onClick={selectAllAssessment}>
                            {selectedAssessmentIds.size === assessmentQuestions.length ? "Deselect All" : "Select All"}
                          </Button>
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {assessmentQuestions.map((q) => (
                            <label key={q.id} className="flex items-start gap-2 p-2 border rounded cursor-pointer hover:bg-muted/50">
                              <Checkbox checked={selectedAssessmentIds.has(q.id)} onCheckedChange={() => toggleAssessmentQuestion(q.id)} className="mt-1" />
                              <div className="text-sm flex-1">
                                <p className="font-medium">{q.question_text}</p>
                                <p className="text-muted-foreground text-xs">A: {q.option_a} | B: {q.option_b} | C: {q.option_c} | D: {q.option_d} • Correct: {q.correct_answer}</p>
                                <Badge variant="secondary" className="text-xs mt-1">{q.source_label}</Badge>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    {bankQuestions.length === 0 && assessmentQuestions.length === 0 && (
                      <p className="text-muted-foreground text-sm">No existing questions for this subject.</p>
                    )}
                    <Button type="button" onClick={importSelected} disabled={selectedBankIds.size + selectedAssessmentIds.size === 0}>
                      Import {selectedBankIds.size + selectedAssessmentIds.size} Question(s)
                    </Button>
                  </CardContent>
                </Card>
              )}

              {questions.map((question, index) => (
                <Card key={index}>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Question {index + 1}</h4>
                      {questions.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeQuestion(index)}><Trash2 className="w-4 h-4" /></Button>
                      )}
                    </div>
                    <div><Label>Question Text</Label><Input value={question.question_text} onChange={(e) => updateQuestion(index, "question_text", e.target.value)} required /></div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div><Label>Option A</Label><Input value={question.option_a} onChange={(e) => updateQuestion(index, "option_a", e.target.value)} required /></div>
                      <div><Label>Option B</Label><Input value={question.option_b} onChange={(e) => updateQuestion(index, "option_b", e.target.value)} required /></div>
                      <div><Label>Option C</Label><Input value={question.option_c} onChange={(e) => updateQuestion(index, "option_c", e.target.value)} required /></div>
                      <div><Label>Option D</Label><Input value={question.option_d} onChange={(e) => updateQuestion(index, "option_d", e.target.value)} required /></div>
                    </div>
                    <div>
                      <Label>Correct Answer</Label>
                      <select
                        value={question.correct_answer}
                        onChange={(e) => updateQuestion(index, "correct_answer", e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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

            <Button type="submit" className="w-full">Create Assessment</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateAssessment;
