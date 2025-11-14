import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sendAssessmentReminder } from "@/lib/emailNotifications";
import { toast } from "sonner";
import { Mail } from "lucide-react";

const ScheduleReminders = () => {
  const handleSendReminders = async () => {
    toast.loading("Sending reminder emails...");
    
    const result = await sendAssessmentReminder();
    
    if (result.success) {
      toast.success(`Reminder emails sent successfully!`);
    } else {
      toast.error("Failed to send reminder emails");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assessment Reminders</CardTitle>
        <CardDescription>
          Send reminder emails to students about assessments scheduled for tomorrow
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleSendReminders} className="w-full">
          <Mail className="w-4 h-4 mr-2" />
          Send Reminder Emails
        </Button>
      </CardContent>
    </Card>
  );
};

export default ScheduleReminders;
