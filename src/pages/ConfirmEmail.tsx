import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom"; // Or Next.js useRouter

const ConfirmEmail = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const navigate = useNavigate(); // Or useRouter for Next.js

  useEffect(() => {
    // Extract token and email from URL query params
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get("token");
    const emailParam = urlParams.get("email");

    if (tokenParam) {
      setToken(tokenParam);
    }
    if (emailParam) {
      setEmail(emailParam);
    }

    // If no token, show error
    if (!tokenParam) {
      toast.error("Invalid or missing confirmation link.");
    }
  }, []);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error("No confirmation token found.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      // Verify the token and update password
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: "recovery", // For invitations, it might be "invite" or "recovery"; adjust if needed
      });

      if (error) throw error;

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      toast.success("Email confirmed and password set! Redirecting to login...");
      setTimeout(() => navigate("/login"), 2000); // Redirect to login
    } catch (error: any) {
      toast.error(`Confirmation failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Link</CardTitle>
            <CardDescription>This confirmation link is invalid or expired. Please check your email for a new invitation.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Confirm Your Email</CardTitle>
          <CardDescription>Set your password to complete account setup.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleConfirm} className="space-y-4">
            <div>
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Confirming..." : "Set Password & Confirm"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmEmail;
