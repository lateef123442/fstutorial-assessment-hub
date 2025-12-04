import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { notifyUserAction } from "@/lib/emailNotifications";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
}

interface Assessment {
  id: string;
  title: string;
  duration_minutes: number;
  passing_score: number;
}

const TakeAssessment = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadAssessment = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error("You must be logged in to take this assessment");
        navigate("/dashboard");
        return;
      }

      const { data: attempt, error: attemptError } = await supabase
        .from("attempts")
        .select("*, assessments(*)")
        .eq("id", attemptId)
        .eq("student_id", user.id)
        .single();

      if (attemptError || !attempt) {
        toast.error("Attempt not found or unauthorized");
        navigate("/dashboard");
        return;
      }

      if (attempt.submitted_at) {
        toast.error("You have already completed this assessment");
        navigate("/dashboard");
        return;
      }

      const { data: previousAttempts, error: prevError } = await supabase
        .from("attempts")
        .select("id")
        .eq("assessment_id", attempt.assessment_id)
        .eq("student_id", user.id)
        .not("submitted_at", "is", null);

      if (prevError) {
        toast.error("Failed to verify assessment history");
        navigate("/dashboard");
        return;
      }

      if (previousAttempts && previousAttempts.length > 0) {
        toast.error("You have already completed this assessment");
        navigate("/dashboard");
        return;
      }

      setAssessment(attempt.assessments as Assessment);
      setTimeRemaining((attempt.assessments as Assessment).duration_minutes * 60);

      const { data: questionsData } = await supabase
        .from("questions")
        .select("*")
        .eq("assessment_id", attempt.assessment_id)
        .order("created_at");

      setQuestions(questionsData || []);

      await supabase
        .from("attempts")
        .update({ total_questions: questionsData?.length || 0 })
        .eq("id", attemptId);

      setLoading(false);

    } catch (err) {
      console.error(err);
      toast.error("Failed to load assessment");
      navigate("/dashboard");
    }
  };

  useEffect(() => {
    if (!attemptId) {
      toast.error("Invalid assessment link");
      navigate("/dashboard");
      return;
    }
    loadAssessment();
  }, [attemptId]);

  useEffect(() => {
    if (!assessment) return;

    if (timeRemaining <= 0) {
      handleSubmit(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((t) => Math.max(t - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, assessment]);

  useEffect(() => {
    const handleLeave = () => handleSubmit(true);

    const onVisibility = () => {
      if (document.hidden) handleLeave();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", handleLeave);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", handleLeave);
    };
  }, []);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (autoSubmitted = false) => {
    if (submitting) return;
    setSubmitting(true);

    try {
      let correct = 0;

      for (const q of questions) {
        const selected = answers[q.id];
        const isCorrect = selected === q.correct_answer;
        if (isCorrect) correct++;

        await supabase.from("answers").insert({
          attempt_id: attemptId,
          question_id: q.id,
          selected_answer: selected || null,
          is_correct: isCorrect,
        });
      }

      const passed = correct >= (assessment?.passing_score || 0);

      const { error: updateErr } = await supabase
        .from("attempts")
        .update({
          score: correct,
          passed,
          submitted_at: new Date().toISOString(),
          auto_submitted: autoSubmitted,
        })
        .eq("id", attemptId);

      if (updateErr) {
        toast.error("Submission blocked by RLS policy");
        return;
      }

      const percentage = Math.round((correct / questions.length) * 100);
      toast.success(`Assessment Submitted! Score: ${correct}/${questions.length} (${percentage}%)`);
      navigate("/dashboard");

    } catch (err) {
      console.error(err);
      toast.error("Failed to submit assessment");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );

  const q = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  if (!q) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        No questions available.
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex justify-between">
              <div>
                <CardTitle>{assessment?.title}</CardTitle>
                <CardDescription>
                  Question {currentQuestionIndex + 1} of {questions.length}
                </CardDescription>
              </div>

              <div className="flex items-center gap-2 font-bold">
                <Clock className="w-5 h-5" />
                {formatTime(timeRemaining)}
              </div>
            </div>
            <Progress value={progress} className="mt-3" />
          </CardHeader>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{q.question_text}</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={answers[q.id] || ""}
              onValueChange={(v) => handleAnswerChange(q.id, v)}
            >
              {["A", "B", "C", "D"].map((opt) => (
                <div key={opt} className="border p-3 rounded-lg flex items-center gap-3">
                  <RadioGroupItem value={opt} id={opt} />
                  <Label htmlFor={opt}>{q[`option_${opt.toLowerCase()}` as keyof Question]}</Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        <div className="flex justify-between mt-6">
          <Button
            onClick={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
            disabled={currentQuestionIndex === 0}
            variant="outline"
          >
            <ChevronLeft /> Previous
          </Button>

          {currentQuestionIndex < questions.length - 1 ? (
            <Button onClick={() => setCurrentQuestionIndex((i) => i + 1)}>
              Next <ChevronRight />
            </Button>
          ) : (
            <Button onClick={() => handleSubmit(false)} disabled={submitting}>
              Submit Assessment
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TakeAssessment;
