import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CredentialsRequest {
  email: string;
  password: string;
  fullName: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, fullName }: CredentialsRequest = await req.json();
    
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    console.log(`Sending credentials email to: ${email}`);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "F.S.Tutorial <onboarding@resend.dev>",
        to: [email],
        subject: "Your F.S.Tutorial Account Credentials",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e0e0e0; }
              .credential-item { margin: 10px 0; }
              .credential-label { font-weight: bold; color: #666; }
              .credential-value { font-family: monospace; background: #f0f0f0; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 5px; }
              .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin-top: 20px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
              .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to F.S.Tutorial!</h1>
              </div>
              <div class="content">
                <p>Hello <strong>${fullName}</strong>,</p>
                <p>Your student account has been created. Here are your login credentials:</p>
                
                <div class="credentials">
                  <div class="credential-item">
                    <div class="credential-label">Email:</div>
                    <div class="credential-value">${email}</div>
                  </div>
                  <div class="credential-item">
                    <div class="credential-label">Password:</div>
                    <div class="credential-value">${password}</div>
                  </div>
                </div>
                
                <div class="warning">
                  <strong>⚠️ Important:</strong> Please change your password after your first login for security purposes.
                </div>
                
                <p>You can log in at any time to access your assessments and mock exams.</p>
                
                <p>Best regards,<br>The F.S.Tutorial Team</p>
              </div>
              <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error("Resend API error:", errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const result = await emailResponse.json();
    console.log("Email sent successfully:", result);

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending credentials email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
