import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Clock, FileText, CheckCircle, Timer, Lock } from "lucide-react";
import { useCountdown } from "@/hooks/useCountdown";

interface AvailableAssessmentsProps {
  studentId: string;
}

interface Assessment {
  id: string;
  title: string;
  duration_minutes: number;
  passing_score: number;
  scheduled_date: string | null;
  scheduled_time: string | null;
  subjects: { name: string } | null;
  profiles: { full_name: string } | null;
}

const CountdownDisplay = ({ targetDate }: { targetDate: Date }) => {
  const countdown = useCountdown(targetDate);

  if (countdown.isExpired) {
    return (
      <Badge className="bg-green-500 hover:bg-green-600">
        <CheckCircle className="w-3 h-3 mr-1" />
        Open Now
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
        <Timer className="w-3 h-3 mr-1 animate-pulse" />
        Opens in: {countdown.formatted}
      </Badge>
    </div>
  );
};

const AssessmentCard = ({ 
  assessment, 
  onStart 
}: { 
  assessment: Assessment; 
  onStart: (id: string) => void;
}) => {
  const getScheduledAt = () => {
    if (!assessment.scheduled_date) return null;

    const [y, m, d] = String(assessment.scheduled_date).split("-").map(Number);
    const scheduled = new Date(y, (m ?? 1) - 1, d ?? 1);

    if (assessment.scheduled_time) {
      const [hours, minutes] = String(assessment.scheduled_time).split(":");
      scheduled.setHours(parseInt(hours || "0"), parseInt(minutes || "0"), 0, 0);
    }

    return scheduled;
  };

  const scheduledAt = getScheduledAt();
  const countdown = useCountdown(scheduledAt);
  const isAvailableNow = !scheduledAt || countdown.isExpired;

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg">{assessment.title}</h3>
            {scheduledAt && <CountdownDisplay targetDate={scheduledAt} />}
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {assessment.subjects?.name} • by {assessment.profiles?.full_name}
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {assessment.duration_minutes} minutes
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Pass: {assessment.passing_score}%
            </span>
            {scheduledAt && !isAvailableNow && (
              <span className="flex items-center gap-1 text-amber-600">
                <FileText className="w-4 h-4" />
                Scheduled: {scheduledAt.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <Button
          onClick={() => isAvailableNow && onStart(assessment.id)}
          disabled={!isAvailableNow}
          variant={isAvailableNow ? "default" : "secondary"}
        >
          {isAvailableNow ? (
            "Start Test"
          ) : (
            <>
              <Lock className="w-4 h-4 mr-1" />
              Not Yet Open
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

const AvailableAssessments = ({ studentId }: AvailableAssessmentsProps) => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    const { data, error } = await supabase
      .from("assessments")
      .select(`
        *,
        subjects(name),
        profiles(full_name)
      `)
      .eq("is_active", true)
      .eq("is_mock_exam", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching assessments:", error);
      setLoading(false);
      return;
    }

    setAssessments(data ?? []);
    setLoading(false);
  };

  const handleStartAssessment = async (assessmentId: string) => {
    const { data: attempt, error } = await supabase
      .from("attempts")
      .insert({
        student_id: studentId,
        assessment_id: assessmentId,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
    } else {
      navigate(`/take-assessment/${attempt.id}`);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Available Assessments</CardTitle>
          <CardDescription>Select an assessment to begin</CardDescription>
        </CardHeader>
        <CardContent>
          {assessments.length === 0 ? (
            <p className="text-muted-foreground">No assessments available at the moment.</p>
          ) : (
            <div className="grid gap-4">
              {assessments.map((assessment) => (
                <AssessmentCard
                  key={assessment.id}
                  assessment={assessment}
                  onStart={handleStartAssessment}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AvailableAssessments;
