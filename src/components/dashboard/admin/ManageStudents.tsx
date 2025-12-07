import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Edit } from "lucide-react";
import { studentSchema } from "@/lib/validationSchemas";

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
  const [formErrors, setFormErrors] = useState<{ email?: string; fullName?: string }>({});
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

  const validateForm = () => {
    const result = studentSchema.safeParse(formData);
    if (!result.success) {
      const errors: { email?: string; fullName?: string } = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        errors[field as keyof typeof errors] = err.message;
      });
      setFormErrors(errors);
      return false;
    }
    setFormErrors({});
    return true;
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Generate a password for the student
      const generatedPassword = generatePassword();

      // Call secure edge function to create student
      const { data, error: createError } = await supabase.functions.invoke("create-student", {
        body: {
          email: formData.email.trim(),
          fullName: formData.fullName.trim(),
          password: generatedPassword,
        },
      });

      if (createError) {
        throw new Error(createError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Send credentials email
      const { error: emailError } = await supabase.functions.invoke("send-student-credentials", {
        body: {
          email: formData.email.trim(),
          password: generatedPassword,
          fullName: formData.fullName.trim(),
        },
      });

      if (emailError) {
        console.error("Email error:", emailError);
        toast.warning("Student created but email failed to send. Please provide credentials manually.", {
          duration: 10000,
        });
      } else {
        toast.success("Student added! Login credentials sent to their email.", {
          duration: 5000,
        });
      }

      setFormData({ email: "", fullName: "" });
      fetchStudents();
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (window.confirm("Delete this student? This will permanently remove their account and all their data.")) {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("delete-student", {
          body: { student_id: userId },
        });

        if (error || data?.error) {
          throw new Error(error?.message || data?.error || "Failed to delete student");
        }

        toast.success("Student deleted successfully");
        fetchStudents();
      } catch (err: any) {
        toast.error(`Error: ${err.message}`);
      } finally {
        setLoading(false);
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
    // Validate edit data
    const editValidation = studentSchema.safeParse({
      email: editData.email,
      fullName: editData.full_name,
    });

    if (!editValidation.success) {
      toast.error(editValidation.error.errors[0]?.message || "Invalid data");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: editData.full_name.trim() })
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
                  onChange={(e) => {
                    setFormData({ ...formData, fullName: e.target.value });
                    if (formErrors.fullName) setFormErrors({ ...formErrors, fullName: undefined });
                  }}
                  maxLength={100}
                  required
                />
                {formErrors.fullName && (
                  <p className="text-sm text-destructive mt-1">{formErrors.fullName}</p>
                )}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (formErrors.email) setFormErrors({ ...formErrors, email: undefined });
                  }}
                  maxLength={255}
                  required
                />
                {formErrors.email && (
                  <p className="text-sm text-destructive mt-1">{formErrors.email}</p>
                )}
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
                      maxLength={100}
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
