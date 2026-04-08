import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { subjectSchema } from "@/lib/validationSchemas";

const ManageSubjects = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [formErrors, setFormErrors] = useState<{ name?: string; description?: string }>({});
  const [assignData, setAssignData] = useState({ teacherId: "", subjectId: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: "", description: "" });

  useEffect(() => {
    fetchSubjects();
    fetchTeachers();
  }, []);

  const fetchSubjects = async () => {
    const { data, error } = await supabase.from("subjects").select("*").order("name");
    if (error) {
      toast.error("Failed to load subjects");
    } else {
      setSubjects(data || []);
    }
    setLoading(false);
  };

  const fetchTeachers = async () => {
    try {
      const { data: teacherRoles } = await supabase.from("user_roles").select("user_id").eq("role", "teacher");
      if (!teacherRoles || teacherRoles.length === 0) { setTeachers([]); return; }
      const teacherIds = teacherRoles.map((t) => t.user_id);
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", teacherIds);
      setTeachers(profiles?.map((p) => ({ user_id: p.id, profiles: { full_name: p.full_name, email: p.email } })) || []);
    } catch {
      toast.error("Failed to load teachers");
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = subjectSchema.safeParse(formData);
    if (!result.success) {
      const errors: any = {};
      result.error.errors.forEach((err) => { errors[err.path[0] as string] = err.message; });
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    const { error } = await supabase.from("subjects").insert({ name: formData.name.trim(), description: formData.description.trim() || null });
    if (error) { toast.error(error.message); } else {
      toast.success("Subject added!");
      setFormData({ name: "", description: "" });
      fetchSubjects();
    }
  };

  const handleDeleteSubject = async (id: string, name: string) => {
    if (!window.confirm(`Delete subject "${name}"? This may affect existing assessments.`)) return;
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) { toast.error(error.message); } else {
      toast.success("Subject deleted");
      fetchSubjects();
    }
  };

  const startEdit = (subject: any) => {
    setEditingId(subject.id);
    setEditData({ name: subject.name, description: subject.description || "" });
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editData.name.trim()) { toast.error("Name is required"); return; }
    const { error } = await supabase.from("subjects").update({ name: editData.name.trim(), description: editData.description.trim() || null }).eq("id", editingId);
    if (error) { toast.error(error.message); } else {
      toast.success("Subject updated");
      setEditingId(null);
      fetchSubjects();
    }
  };

  const handleAssignTeacher = async () => {
    if (!assignData.teacherId || !assignData.subjectId) { toast.error("Please select both teacher and subject"); return; }
    const { error } = await supabase.from("teacher_subjects").insert({ teacher_id: assignData.teacherId, subject_id: assignData.subjectId });
    if (error) { toast.error(error.message); } else {
      toast.success("Teacher assigned!");
      setAssignData({ teacherId: "", subjectId: "" });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Subject</CardTitle>
          <CardDescription>Create a new subject for assessments</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddSubject} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Subject Name</Label>
                <Input value={formData.name} onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setFormErrors({ ...formErrors, name: undefined }); }} maxLength={100} required />
                {formErrors.name && <p className="text-sm text-destructive mt-1">{formErrors.name}</p>}
              </div>
              <div>
                <Label>Description</Label>
                <Input value={formData.description} onChange={(e) => { setFormData({ ...formData, description: e.target.value }); setFormErrors({ ...formErrors, description: undefined }); }} maxLength={500} />
                {formErrors.description && <p className="text-sm text-destructive mt-1">{formErrors.description}</p>}
              </div>
            </div>
            <Button type="submit"><Plus className="w-4 h-4 mr-2" />Add Subject</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assign Teacher to Subject</CardTitle>
          <CardDescription>Allocate subjects to teachers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Select Teacher</Label>
                <Select value={assignData.teacherId || undefined} onValueChange={(v) => setAssignData({ ...assignData, teacherId: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose teacher" /></SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => (
                      <SelectItem key={t.user_id} value={t.user_id}>{t.profiles?.full_name || t.profiles?.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Select Subject</Label>
                <Select value={assignData.subjectId || undefined} onValueChange={(v) => setAssignData({ ...assignData, subjectId: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleAssignTeacher}>Assign Teacher</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Subjects</CardTitle>
          <CardDescription>Total: {subjects.length} subjects</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : subjects.length === 0 ? (
            <p className="text-muted-foreground">No subjects yet.</p>
          ) : (
            <div className="space-y-3">
              {subjects.map((subject) => (
                <div key={subject.id} className="p-4 border rounded-lg flex items-center justify-between gap-4">
                  {editingId === subject.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="max-w-[200px]" />
                      <Input value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} placeholder="Description" className="max-w-[250px]" />
                      <Button size="sm" variant="ghost" onClick={handleSaveEdit}><Check className="w-4 h-4 text-green-600" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="w-4 h-4 text-red-600" /></Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <p className="font-semibold">{subject.name}</p>
                        {subject.description && <p className="text-sm text-muted-foreground">{subject.description}</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => startEdit(subject)}><Pencil className="w-4 h-4" /></Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteSubject(subject.id, subject.name)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
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

export default ManageSubjects;
