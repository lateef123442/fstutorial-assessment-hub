import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { notifyUserAction } from "@/lib/emailNotifications";
import { teacherSchema } from "@/lib/validationSchemas";

const ManageTeachers = () => {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    password: "",
  });
  const [formErrors, setFormErrors] = useState<{ email?: string; fullName?: string; password?: string }>({});

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      // First get all teacher user_ids
      const { data: teacherRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "teacher");

      if (rolesError) throw rolesError;

      if (!teacherRoles || teacherRoles.length === 0) {
        setTeachers([]);
        setLoading(false);
        return;
      }

      // Then get profiles for those user_ids
      const teacherIds = teacherRoles.map(t => t.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", teacherIds);

      if (profilesError) throw profilesError;

      // Get teacher subjects
      const { data: teacherSubjects, error: subjectsError } = await supabase
        .from("teacher_subjects")
        .select("teacher_id, subject_id, subjects(id, name)")
        .in("teacher_id", teacherIds);

      if (subjectsError) throw subjectsError;

      // Combine the data
      const combinedData = profiles?.map(profile => ({
        user_id: profile.id,
        profiles: {
          full_name: profile.full_name,
          email: profile.email
        },
        teacher_subjects: teacherSubjects?.filter((ts: any) => ts.teacher_id === profile.id) || []
      })) || [];

      setTeachers(combinedData);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      toast.error("Failed to load teachers");
    }
    setLoading(false);
  };

  const validateForm = () => {
    const result = teacherSchema.safeParse(formData);
    if (!result.success) {
      const errors: { email?: string; fullName?: string; password?: string } = {};
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

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: { full_name: formData.fullName.trim() },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: authData.user.id, role: "teacher" });

        if (roleError) throw roleError;

        toast.success("Teacher added successfully!");
        
        // Send welcome email
        notifyUserAction(
          formData.email.trim(),
          formData.fullName.trim(),
          "signup",
          "Your teacher account has been created. You can now log in and start creating assessments."
        );
        
        setFormData({ email: "", fullName: "", password: "" });
        fetchTeachers();
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Teacher</CardTitle>
          <CardDescription>Create a new teacher account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddTeacher} className="space-y-4">
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
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (formErrors.password) setFormErrors({ ...formErrors, password: undefined });
                  }}
                  maxLength={72}
                  required
                />
                {formErrors.password && (
                  <p className="text-sm text-destructive mt-1">{formErrors.password}</p>
                )}
              </div>
            </div>
            <Button type="submit" disabled={loading}>
              <Plus className="w-4 h-4 mr-2" />
              Add Teacher
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Teachers</CardTitle>
          <CardDescription>Manage existing teachers and their subjects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teachers.map((teacher) => (
              <div key={teacher.user_id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold">{teacher.profiles?.full_name}</p>
                    <p className="text-sm text-muted-foreground">{teacher.profiles?.email}</p>
                    {teacher.teacher_subjects && teacher.teacher_subjects.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Assigned Subjects:</p>
                        <div className="flex flex-wrap gap-1">
                          {teacher.teacher_subjects.map((ts: any) => (
                            <span key={ts.subject_id} className="px-2 py-1 bg-primary/10 text-primary rounded-md text-xs">
                              {ts.subjects?.name || 'Unknown'}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={async () => {
                      if (window.confirm(`Delete teacher ${teacher.profiles?.full_name}?`)) {
                        const { error } = await supabase
                          .from("user_roles")
                          .delete()
                          .eq("user_id", teacher.user_id);
                        
                        if (error) {
                          toast.error("Failed to delete teacher");
                        } else {
                          toast.success("Teacher deleted successfully");
                          fetchTeachers();
                        }
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManageTeachers;
