import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Edit } from "lucide-react";

// Generate a random password
const generatePassword = () => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const ManageStudents = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ full_name: "", email: "" });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from("user_roles")
      .select(`
        user_id,
        profiles(full_name, email)
      `)
      .eq("role", "student");

    if (!error && data) {
      setStudents(data);
    }
    setLoading(false);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if current user is admin
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in as an admin.");
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (roleError || roleData?.role !== "admin") {
        toast.error("Only admins can add students.");
        return;
      }

      // Generate a password for the student
      const generatedPassword = generatePassword();

      // Create admin client with service role
      const supabaseAdmin = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
      );

      // Create user with password
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: formData.email,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: { full_name: formData.fullName },
      });

      if (userError) throw userError;

      if (userData.user) {
        // Insert role using admin client
        const { error: roleInsertError } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: userData.user.id, role: "student" });

        if (roleInsertError) throw roleInsertError;

        // Send credentials email
        const { error: emailError } = await supabase.functions.invoke("send-student-credentials", {
          body: {
            email: formData.email,
            password: generatedPassword,
            fullName: formData.fullName,
          },
        });

        if (emailError) {
          console.error("Email error:", emailError);
          toast.warning("Student created but email failed to send. Password: " + generatedPassword, {
            duration: 10000,
          });
        } else {
          toast.success("Student added! Login credentials sent to their email.", {
            duration: 5000,
          });
        }

        setFormData({ email: "", fullName: "" });
        fetchStudents();
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (window.confirm("Delete this student? This will remove all their data.")) {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (error) {
        toast.error("Failed to delete student");
      } else {
        toast.success("Student deleted successfully");
        fetchStudents();
      }
    }
  };

  const handleEdit = (student: any) => {
    setEditingId(student.user_id);
    setEditData({
      full_name: student.profiles?.full_name || "",
      email: student.profiles?.email || ""
    });
  };

  const handleSaveEdit = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: editData.full_name })
      .eq("id", userId);

    if (error) {
      toast.error("Failed to update student");
    } else {
      toast.success("Student updated successfully");
      setEditingId(null);
      fetchStudents();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Student</CardTitle>
          <CardDescription>Add a new student (login credentials will be sent to their email)</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddStudent} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={loading}>
              <Plus className="w-4 h-4 mr-2" />
              Add Student
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Students</CardTitle>
          <CardDescription>Total: {students.length} students</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {students.map((student) => (
              <div key={student.user_id} className="p-4 border rounded-lg">
                {editingId === student.user_id ? (
                  <div className="space-y-4">
                    <Input
                      value={editData.full_name}
                      onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                      placeholder="Full Name"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSaveEdit(student.user_id)}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{student.profiles?.full_name}</p>
                      <p className="text-sm text-muted-foreground">{student.profiles?.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(student)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(student.user_id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManageStudents;
