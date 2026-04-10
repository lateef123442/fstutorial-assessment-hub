import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Plus, Trash2, BookOpen, Edit, Save, X } from "lucide-react";

const ManageQuestionBank = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | undefined>(undefined);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "A" });
  const [formData, setFormData] = useState({
    question_text: "",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_answer: "A",
  });

  useEffect(() => { fetchSubjects(); }, []);
  useEffect(() => { fetchQuestions(); }, [selectedSubjectFilter]);

  const fetchSubjects = async () => {
    const { data, error } = await supabase.from("subjects").select("id, name").order("name");
    if (!error && data) setSubjects(data);
  };

  const fetchQuestions = async () => {
    let query = supabase.from("question_bank").select("*, subjects(name), profiles:added_by(full_name)").order("created_at", { ascending: false });
    if (selectedSubjectFilter !== "all") query = query.eq("subject_id", selectedSubjectFilter);
    const { data, error } = await query;
    if (error) { toast.error("Failed to load questions"); } else { setQuestions(data || []); }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId) { toast.error("Please select a subject"); return; }
    if (!formData.question_text.trim() || !formData.option_a.trim() || !formData.option_b.trim() || !formData.option_c.trim() || !formData.option_d.trim()) { toast.error("Please fill in all fields"); return; }
    setLoading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("question_bank").insert({
        subject_id: selectedSubjectId, question_text: formData.question_text.trim(),
        option_a: formData.option_a.trim(), option_b: formData.option_b.trim(),
        option_c: formData.option_c.trim(), option_d: formData.option_d.trim(),
        correct_answer: formData.correct_answer, added_by: user.id,
      });
      if (error) throw error;
      toast.success("Question added to bank!");
      setFormData({ question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "A" });
      fetchQuestions();
    } catch (error: any) { toast.error(error.message || "Failed to add question"); } finally { setLoading(false); }
  };

  const handleEdit = (q: any) => {
    setEditingId(q.id);
    setEditData({ question_text: q.question_text, option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d, correct_answer: q.correct_answer });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase.from("question_bank").update(editData).eq("id", editingId);
    if (error) { toast.error("Failed to update question"); } else { toast.success("Question updated"); setEditingId(null); fetchQuestions(); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this question from the bank?")) return;
    const { error } = await supabase.from("question_bank").delete().eq("id", id);
    if (error) { toast.error("Failed to delete question"); } else { toast.success("Question deleted"); fetchQuestions(); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5" />Add Question to Bank</CardTitle>
          <CardDescription>Add questions by subject for students to practice</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddQuestion} className="space-y-4">
            <div>
              <Label>Subject</Label>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>{subjects.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div><Label>Question Text</Label><Textarea value={formData.question_text} onChange={(e) => setFormData({ ...formData, question_text: e.target.value })} maxLength={2000} required /></div>
            <div className="grid md:grid-cols-2 gap-4">
              <div><Label>Option A</Label><Input value={formData.option_a} onChange={(e) => setFormData({ ...formData, option_a: e.target.value })} maxLength={500} required /></div>
              <div><Label>Option B</Label><Input value={formData.option_b} onChange={(e) => setFormData({ ...formData, option_b: e.target.value })} maxLength={500} required /></div>
              <div><Label>Option C</Label><Input value={formData.option_c} onChange={(e) => setFormData({ ...formData, option_c: e.target.value })} maxLength={500} required /></div>
              <div><Label>Option D</Label><Input value={formData.option_d} onChange={(e) => setFormData({ ...formData, option_d: e.target.value })} maxLength={500} required /></div>
            </div>
            <div>
              <Label>Correct Answer</Label>
              <RadioGroup value={formData.correct_answer} onValueChange={(v) => setFormData({ ...formData, correct_answer: v })} className="flex gap-4 mt-1">
                {["A", "B", "C", "D"].map((opt) => (<div key={opt} className="flex items-center gap-1"><RadioGroupItem value={opt} id={`bank-${opt}`} /><Label htmlFor={`bank-${opt}`}>{opt}</Label></div>))}
              </RadioGroup>
            </div>
            <Button type="submit" disabled={loading}><Plus className="w-4 h-4 mr-2" />{loading ? "Adding..." : "Add Question"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Question Bank</CardTitle>
          <CardDescription>All questions available for student practice</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label>Filter by Subject</Label>
            <Select value={selectedSubjectFilter} onValueChange={setSelectedSubjectFilter}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          {questions.length === 0 ? (
            <p className="text-muted-foreground">No questions in the bank yet.</p>
          ) : (
            <div className="space-y-3">
              {questions.map((q, i) => (
                <div key={q.id} className="p-4 border rounded-lg">
                  {editingId === q.id ? (
                    <div className="space-y-3">
                      <Textarea value={editData.question_text} onChange={(e) => setEditData({ ...editData, question_text: e.target.value })} />
                      <div className="grid grid-cols-2 gap-2">
                        <Input value={editData.option_a} onChange={(e) => setEditData({ ...editData, option_a: e.target.value })} placeholder="Option A" />
                        <Input value={editData.option_b} onChange={(e) => setEditData({ ...editData, option_b: e.target.value })} placeholder="Option B" />
                        <Input value={editData.option_c} onChange={(e) => setEditData({ ...editData, option_c: e.target.value })} placeholder="Option C" />
                        <Input value={editData.option_d} onChange={(e) => setEditData({ ...editData, option_d: e.target.value })} placeholder="Option D" />
                      </div>
                      <div>
                        <Label>Correct Answer</Label>
                        <RadioGroup value={editData.correct_answer} onValueChange={(v) => setEditData({ ...editData, correct_answer: v })} className="flex gap-4 mt-1">
                          {["A", "B", "C", "D"].map((opt) => (<div key={opt} className="flex items-center gap-1"><RadioGroupItem value={opt} id={`edit-bank-${opt}`} /><Label htmlFor={`edit-bank-${opt}`}>{opt}</Label></div>))}
                        </RadioGroup>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit}><Save className="w-4 h-4 mr-1" />Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}><X className="w-4 h-4 mr-1" />Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">{q.subjects?.name} • Added by {q.profiles?.full_name}</p>
                        <p className="font-medium mb-2">{i + 1}. {q.question_text}</p>
                        <div className="grid grid-cols-2 gap-1 text-sm">
                          <p className={q.correct_answer === "A" ? "text-green-600 font-semibold" : ""}>A: {q.option_a}</p>
                          <p className={q.correct_answer === "B" ? "text-green-600 font-semibold" : ""}>B: {q.option_b}</p>
                          <p className={q.correct_answer === "C" ? "text-green-600 font-semibold" : ""}>C: {q.option_c}</p>
                          <p className={q.correct_answer === "D" ? "text-green-600 font-semibold" : ""}>D: {q.option_d}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(q)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(q.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
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

export default ManageQuestionBank;
