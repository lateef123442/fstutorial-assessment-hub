import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReminderRequest {
  assessmentId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { assessmentId }: ReminderRequest = await req.json();

    // Get assessments scheduled for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    let query = supabase
      .from("assessments")
      .select(`
        id,
        title,
        scheduled_date,
        scheduled_time,
        duration_minutes,
        passing_score,
        subjects (name)
      `)
      .eq("is_active", true)
      .gte("scheduled_date", tomorrow.toISOString().split("T")[0])
      .lt("scheduled_date", dayAfterTomorrow.toISOString().split("T")[0]);

    if (assessmentId) {
      query = query.eq("id", assessmentId);
    }

    const { data: assessments, error: assessmentError } = await query;

    if (assessmentError) throw assessmentError;

    if (!assessments || assessments.length === 0) {
      console.log("No assessments scheduled for tomorrow");
      return new Response(
        JSON.stringify({ message: "No assessments to remind" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get all students
    const { data: students, error: studentsError } = await supabase
      .from("user_roles")
      .select("user_id, profiles(email, full_name)")
      .eq("role", "student");

    if (studentsError) throw studentsError;

    const emailPromises: Promise<Response>[] = [];

    for (const assessment of assessments) {
      const subjectName = (assessment.subjects as any)?.name || "Unknown Subject";
      
      for (const student of students || []) {
        const profile = student.profiles as any;
        if (!profile?.email) continue;

        const scheduledDateTime = new Date(assessment.scheduled_date as string);
        if (assessment.scheduled_time) {
          const [hours, minutes] = (assessment.scheduled_time as string).split(":");
          scheduledDateTime.setHours(parseInt(hours), parseInt(minutes));
        }

        const emailPromise = fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "F.S.Tutorial <onboarding@resend.dev>",
            to: [profile.email],
            subject: `Reminder: Assessment Tomorrow - ${assessment.title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #333;">Assessment Reminder</h1>
                <p>Dear ${profile.full_name || "Student"},</p>
                <p>This is a reminder that you have an upcoming assessment scheduled for tomorrow:</p>
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h2 style="color: #555; margin-top: 0;">${assessment.title}</h2>
                  <p><strong>Subject:</strong> ${subjectName}</p>
                  <p><strong>Date:</strong> ${scheduledDateTime.toLocaleDateString()}</p>
                  ${assessment.scheduled_time ? `<p><strong>Time:</strong> ${assessment.scheduled_time}</p>` : ""}
                  <p><strong>Duration:</strong> ${assessment.duration_minutes} minutes</p>
                  <p><strong>Passing Score:</strong> ${assessment.passing_score}%</p>
                </div>
                <p>Please make sure to:</p>
                <ul>
                  <li>Be ready at the scheduled time</li>
                  <li>Have a stable internet connection</li>
                  <li>Ensure your device is charged</li>
                  <li>Find a quiet place without distractions</li>
                  <li><strong>DO NOT leave the exam page during the test</strong></li>
                </ul>
                <p style="color: #d32f2f; font-weight: bold;">⚠️ Important: Any attempt to leave the exam page will result in automatic submission!</p>
                <p>Good luck!</p>
                <p>Best regards,<br>F.S.Tutorial Team</p>
              </div>
            `,
          }),
        });

        emailPromises.push(emailPromise);
      }
    }

    await Promise.all(emailPromises);

    console.log(`Sent ${emailPromises.length} reminder emails`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent: emailPromises.length,
        assessments: assessments.length 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
