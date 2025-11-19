import { useEffect, useState } from "react";
import { useNavigate, useParams, useBlocker } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { notifyUserAction } from "@/lib/emailNotifications";

const TakeAssessment = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [assessment, setAssessment] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ============================================
  // PUBLIC: Load Attempt + Questions + Check for Existing Submissions
  // ============================================

  useEffect(() => {
    if (!attemptId) {
      toast.error("Invalid assessment link");
      navigate("/dashboard");
      return;
    }
    loadAssessment();
  }, [attemptId]);

  const loadAssessment = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        navigate("/login");
        return;
      }

      const { data: attempt, error } = await supabase
        .from("attempts")
        .select("*, assessments(*), profiles(full_name, email)")
        .eq("id", attemptId)
        .eq("user_id", user.id)
        .single();

      if (error || !attempt) {
        toast.error("Attempt not found");
        navigate("/dashboard");
        return;
      }

      // Check for existing submitted attempts (allow up to 3)
      const { data: existingAttempts } = await supabase
        .from("attempts")
        .select("id")
        .eq("assessment_id", attempt.assessment_id)
        .eq("user_id", user.id)
        .not("submitted_at", "is", null);

      if (existingAttempts && existingAttempts.length >= 3) {
        toast.error("You have reached the maximum attempts (3) for this assessment.");
        navigate("/dashboard");
        return;
      }

      if (attempt.submitted_at) {
        toast.error("This attempt has already been submitted.");
        navigate("/dashboard");
        return;
      }

      setAssessment(attempt.assessments);
      setTimeRemaining(attempt.assessments.duration_minutes * 60);

      const { data: questionsData } = await supabase
        .from("questions")
        .select("*")
        .eq("assessment_id", attempt.assessment_id)
        .order("created_at");

      setQuestions(questionsData);

      await supabase
        .from("attempts")
        .update({ total_questions: questionsData.length })
        .eq("id", attemptId);

      setLoading(false);
    } catch (err) {
      toast.error("Failed to load assessment");
      navigate("/dashboard");
    }
  };

  // ============================================
  // TIMER
  // ============================================

  useEffect(() => {
    if (timeRemaining <= 0 && assessment) {
      handleSubmit(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, assessment]);

  // ============================================
  // BLOCK NAVIGATION AND AUTO-SUBMIT ON LEAVE
  // ============================================

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (currentLocation.pathname !== nextLocation.pathname && !submitting) {
      handleSubmit(true);
      return false;
    }
    return true;
  });

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!submitting) {
        handleSubmit(true);
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [submitting]);

  useEffect(() => {
    const handleLeave = () => {
      if (!submitting) handleSubmit(true);
    };

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) handleLeave();
    });

    window.addEventListener("blur", handleLeave);

    return () => {
      document.removeEventListener("visibilitychange", handleLeave);
      window.removeEventListener("blur", handleLeave);
    };
  }, [submitting]);

  // ============================================
  // SAVE ANSWER
  // ============================================

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  // ============================================
  // SUBMIT
  // ============================================

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
        .eq("id", attemptId)
        .select();

      if (updateErr) {
        console.log(updateErr);
        toast.error("Submission blocked by RLS policy");
        return;
      }

      const percentage = Math.round((correct / questions.length) * 100);
      notifyUserAction(
        attempt?.profiles?.email,
        attempt?.profiles?.full_name,
        "results_available",
        `You scored ${correct}/${questions.length} (${percentage}%).`
      );

      toast.success(autoSubmitted ? "Assessment auto-submitted due to leaving the page!" : "Assessment Submitted!");
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // UI COMPONENTS
  // ============================================

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );

  const q = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const formatTime = (secs) => `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex justify-between">
              <div>
                <CardTitle>{assessment.title}</CardTitle>
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
                  <Label htmlFor={opt}>{q[`option_${opt.toLowerCase()}`]}</Label>
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
