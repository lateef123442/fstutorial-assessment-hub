import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Clock, CheckCircle, Trash2, Edit, Save, X, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface MyAssessmentsProps {
  teacherId: string;
  refreshKey?: number;
}

const MyAssessments = ({ teacherId, refreshKey }: MyAssessmentsProps) => {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ title: "", duration_minutes: 0, passing_score: 0 });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [assessmentQuestions, setAssessmentQuestions] = useState<any[]>([]);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editQuestionData, setEditQuestionData] = useState({ question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "A" });

  useEffect(() => { fetchAssessments(); }, [teacherId, refreshKey]);

  const fetchAssessments = async () => {
    const { data } = await supabase.from("assessments").select("*, subjects(name), questions(id)").eq("teacher_id", teacherId).eq("is_mock_exam", false).order("created_at", { ascending: false });
    if (data) {
      setAssessments(data.map(a => ({ ...a, questionCount: a.questions?.length || 0 })));
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this assessment? This will also delete all questions and attempts.")) {
      const { error } = await supabase.from("assessments").delete().eq("id", id);
      if (error) toast.error("Failed to delete assessment"); else { toast.success("Assessment deleted"); fetchAssessments(); }
    }
  };

  const handleEdit = (a: any) => { setEditingId(a.id); setEditData({ title: a.title, duration_minutes: a.duration_minutes, passing_score: a.passing_score }); };
  const handleSaveEdit = async (id: string) => {
    const { error } = await supabase.from("assessments").update(editData).eq("id", id);
    if (error) toast.error("Failed to update"); else { toast.success("Updated"); setEditingId(null); fetchAssessments(); }
  };

  const toggleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    const { data } = await supabase.from("questions").select("*").eq("assessment_id", id).order("created_at");
    setAssessmentQuestions(data || []);
  };

  const startEditQuestion = (q: any) => {
    setEditingQuestionId(q.id);
    setEditQuestionData({ question_text: q.question_text, option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d, correct_answer: q.correct_answer });
  };

  const saveEditQuestion = async () => {
    if (!editingQuestionId) return;
    const { error } = await supabase.from("questions").update(editQuestionData).eq("id", editingQuestionId);
    if (error) toast.error("Failed to update question"); else {
      toast.success("Question updated");
      setEditingQuestionId(null);
      if (expandedId) toggleExpand(expandedId);
    }
  };

  const deleteQuestion = async (qId: string) => {
    if (!window.confirm("Delete this question?")) return;
    const { error } = await supabase.from("questions").delete().eq("id", qId);
    if (error) toast.error("Failed to delete"); else { toast.success("Question deleted"); if (expandedId) toggleExpand(expandedId); fetchAssessments(); }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Assessments</CardTitle>
          <CardDescription>All assessments you've created</CardDescription>
        </CardHeader>
        <CardContent>
          {assessments.length === 0 ? (
            <p className="text-muted-foreground">No assessments yet.</p>
          ) : (
            <div className="space-y-4">
              {assessments.map((assessment) => (
                <div key={assessment.id} className="border rounded-lg p-4">
                  {editingId === assessment.id ? (
                    <div className="space-y-4">
                      <Input value={editData.title} onChange={(e) => setEditData({ ...editData, title: e.target.value })} placeholder="Title" />
                      <div className="grid grid-cols-2 gap-4">
                        <Input type="number" value={editData.duration_minutes} onChange={(e) => setEditData({ ...editData, duration_minutes: parseInt(e.target.value) })} placeholder="Duration" />
                        <Input type="number" value={editData.passing_score} onChange={(e) => setEditData({ ...editData, passing_score: parseInt(e.target.value) })} placeholder="Passing %" />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveEdit(assessment.id)}>Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{assessment.title}</h3>
                          <p className="text-sm text-muted-foreground">{assessment.subjects?.name}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{assessment.duration_minutes} mins</span>
                            <span className="flex items-center gap-1"><FileText className="w-4 h-4" />{assessment.questionCount} questions</span>
                            <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4" />Pass: {assessment.passing_score}%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`px-3 py-1 rounded-full text-sm ${assessment.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                            {assessment.is_active ? 'Active' : 'Inactive'}
                          </div>
                          <Button size="sm" variant="outline" onClick={() => toggleExpand(assessment.id)}>
                            {expandedId === assessment.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleEdit(assessment)}><Edit className="w-4 h-4" /></Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(assessment.id)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>

                      {expandedId === assessment.id && (
                        <div className="mt-4 border-t pt-4 space-y-3">
                          <h4 className="font-semibold text-sm">Questions</h4>
                          {assessmentQuestions.map((q, i) => (
                            <div key={q.id} className="p-3 border rounded-lg">
                              {editingQuestionId === q.id ? (
                                <div className="space-y-2">
                                  <Textarea value={editQuestionData.question_text} onChange={(e) => setEditQuestionData({ ...editQuestionData, question_text: e.target.value })} />
                                  <div className="grid grid-cols-2 gap-2">
                                    <Input value={editQuestionData.option_a} onChange={(e) => setEditQuestionData({ ...editQuestionData, option_a: e.target.value })} placeholder="Option A" />
                                    <Input value={editQuestionData.option_b} onChange={(e) => setEditQuestionData({ ...editQuestionData, option_b: e.target.value })} placeholder="Option B" />
                                    <Input value={editQuestionData.option_c} onChange={(e) => setEditQuestionData({ ...editQuestionData, option_c: e.target.value })} placeholder="Option C" />
                                    <Input value={editQuestionData.option_d} onChange={(e) => setEditQuestionData({ ...editQuestionData, option_d: e.target.value })} placeholder="Option D" />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Correct Answer</Label>
                                    <Select value={editQuestionData.correct_answer} onValueChange={(v) => setEditQuestionData({ ...editQuestionData, correct_answer: v })}>
                                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                                      <SelectContent><SelectItem value="A">A</SelectItem><SelectItem value="B">B</SelectItem><SelectItem value="C">C</SelectItem><SelectItem value="D">D</SelectItem></SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={saveEditQuestion}><Save className="w-3 h-3 mr-1" />Save</Button>
                                    <Button size="sm" variant="outline" onClick={() => setEditingQuestionId(null)}><X className="w-3 h-3 mr-1" />Cancel</Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{i + 1}. {q.question_text}</p>
                                    <div className="grid grid-cols-2 gap-1 text-xs mt-1">
                                      <p className={q.correct_answer === "A" ? "text-green-600 font-semibold" : ""}>A: {q.option_a}</p>
                                      <p className={q.correct_answer === "B" ? "text-green-600 font-semibold" : ""}>B: {q.option_b}</p>
                                      <p className={q.correct_answer === "C" ? "text-green-600 font-semibold" : ""}>C: {q.option_c}</p>
                                      <p className={q.correct_answer === "D" ? "text-green-600 font-semibold" : ""}>D: {q.option_d}</p>
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button variant="outline" size="sm" onClick={() => startEditQuestion(q)}><Edit className="w-3 h-3" /></Button>
                                    <Button variant="destructive" size="sm" onClick={() => deleteQuestion(q.id)}><Trash2 className="w-3 h-3" /></Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyAssessments;
