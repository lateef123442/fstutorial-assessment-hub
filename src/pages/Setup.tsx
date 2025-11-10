import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const Setup = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const createAdmin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-admin", {
        body: {
          email: "ahmed@gowithfund.org",
          password: "lateef.2008",
          fullName: "Ahmed Admin"
        }
      });

      if (error) {
        throw error;
      }

      toast.success("Admin user created successfully! You can now login.");
      navigate("/login");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Failed to create admin user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Initial Setup</CardTitle>
          <CardDescription>
            Create the initial admin user to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm"><strong>Email:</strong> ahmed@gowithfund.org</p>
            <p className="text-sm"><strong>Password:</strong> lateef.2008</p>
            <p className="text-sm text-muted-foreground">
              This will create the first admin user with full access to manage teachers, students, and assessments.
            </p>
          </div>
          <Button onClick={createAdmin} disabled={loading} className="w-full">
            {loading ? "Creating..." : "Create Admin User"}
          </Button>
          <Button variant="outline" onClick={() => navigate("/login")} className="w-full">
            Go to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Setup;