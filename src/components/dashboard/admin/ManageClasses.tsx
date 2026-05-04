import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Users } from "lucide-react";

interface ClassRow {
  id: string;
  name: string;
  description: string | null;
  studentCount?: number;
}

interface StudentRow {
  id: string;
  full_name: string;
  email: string;
  class_id: string | null;
}

const ManageClasses = () => {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const { data: cls } = await supabase.from("classes").select("id, name, description").order("name");
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "student");
    const studentIds = (roles || []).map(r => r.user_id);
    let stu: StudentRow[] = [];
    if (studentIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email, class_id")
        .in("id", studentIds);
      stu = profs || [];
    }
    const counts: Record<string, number> = {};
    stu.forEach(s => { if (s.class_id) counts[s.class_id] = (counts[s.class_id] || 0) + 1; });
    setClasses((cls || []).map(c => ({ ...c, studentCount: counts[c.id] || 0 })));
    setStudents(stu);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("classes").insert({
      name: name.trim(),
      description: description.trim() || null,
      created_by: user.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Class created");
    setName(""); setDescription("");
    fetchAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this class? Students in it will be unassigned.")) return;
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Class deleted");
    fetchAll();
  };

  const assignStudent = async (studentId: string, classId: string) => {
    const newClassId = classId === "none" ? null : classId;
    const { error } = await supabase.from("profiles").update({ class_id: newClassId }).eq("id", studentId);
    if (error) { toast.error(error.message); return; }
    toast.success("Student assigned");
    fetchAll();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Class</CardTitle>
          <CardDescription>Classes group students for assessments and mock exams</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Class Name *</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., SS3 A" required />
              </div>
              <div>
                <Label htmlFor="desc">Description</Label>
                <Input id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <Button type="submit"><Plus className="w-4 h-4 mr-2" />Create Class</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Classes</CardTitle>
          <CardDescription>Total: {classes.length} classes</CardDescription>
        </CardHeader>
        <CardContent>
          {classes.length === 0 ? (
            <p className="text-muted-foreground">No classes yet. Create one above.</p>
          ) : (
            <div className="space-y-3">
              {classes.map(c => (
                <div key={c.id} className="p-4 border rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Users className="w-3 h-3" /> {c.studentCount} student(s)
                    </p>
                  </div>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(c.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assign Students to Classes</CardTitle>
          <CardDescription>Each student belongs to one class</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : students.length === 0 ? (
            <p className="text-muted-foreground">No students yet.</p>
          ) : (
            <div className="space-y-2">
              {students.map(s => (
                <div key={s.id} className="p-3 border rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{s.full_name}</p>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                  </div>
                  <select
                    value={s.class_id || "none"}
                    onChange={e => assignStudent(s.id, e.target.value)}
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="none">— No class —</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ManageClasses;
