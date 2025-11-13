import { supabase } from "@/integrations/supabase/client";

interface EmailNotification {
  to: string;
  subject: string;
  userName: string;
  action: string;
  details?: string;
}

export const sendEmailNotification = async (notification: EmailNotification) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-notification-email', {
      body: notification
    });

    if (error) {
      console.error("Error sending email:", error);
      return false;
    }

    console.log("Email sent successfully:", data);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
};

// Helper function to send notifications on key actions
export const notifyUserAction = async (
  userEmail: string,
  userName: string,
  actionType: "signup" | "assessment_created" | "assessment_submitted" | "teacher_assigned" | "student_enrolled",
  details?: string
) => {
  const subjects: Record<string, string> = {
    signup: "Welcome to Assessment System!",
    assessment_created: "New Assessment Created",
    assessment_submitted: "Assessment Submitted Successfully",
    teacher_assigned: "You've Been Assigned to a Subject",
    student_enrolled: "Welcome to Your New Course"
  };

  const actions: Record<string, string> = {
    signup: "Your account has been successfully created. You can now log in and start using the Assessment System.",
    assessment_created: "A new assessment has been created and is now available.",
    assessment_submitted: "Your assessment has been submitted successfully. Results will be available soon.",
    teacher_assigned: "You have been assigned to a new subject. Check your dashboard for details.",
    student_enrolled: "You have been enrolled in a new course. Start exploring your assessments!"
  };

  return sendEmailNotification({
    to: userEmail,
    subject: subjects[actionType],
    userName,
    action: actions[actionType],
    details
  });
};
