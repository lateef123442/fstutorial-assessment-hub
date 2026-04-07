import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, ShieldCheck } from "lucide-react";

const ManageAdmins = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    password: "",
  });
  const [formErrors, setFormErrors] = useState<{ email?: string; fullName?: string; password?: string }>({});

  const validateForm = () => {
    const errors: typeof formErrors = {};
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = "Valid email is required";
    }
    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
      errors.fullName = "Full name must be at least 2 characters";
    }
    if (!formData.password || formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-admin", {
        body: {
          email: formData.email.trim(),
          fullName: formData.fullName.trim(),
          password: formData.password,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Admin user created successfully!");
      setFormData({ email: "", fullName: "", password: "" });
    } catch (error: any) {
      toast.error(error.message || "Failed to create admin user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Add New Admin
          </CardTitle>
          <CardDescription>Create a new administrator account with full system access</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddAdmin} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="adminFullName">Full Name</Label>
                <Input
                  id="adminFullName"
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
                <Label htmlFor="adminEmail">Email</Label>
                <Input
                  id="adminEmail"
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
                <Label htmlFor="adminPassword">Password</Label>
                <Input
                  id="adminPassword"
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
              {loading ? "Creating..." : "Add Admin"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManageAdmins;
