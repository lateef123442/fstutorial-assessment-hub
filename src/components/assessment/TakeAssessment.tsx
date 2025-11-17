        import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [violations, setViolations] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  // LOAD ASSESSMENT + QUESTIONS
  useEffect(() => {
    loadAssessment();
  }, [attemptId]);

  const loadAssessment = async () => {
    try {
      const { data: attempt, error: attemptError } = await supabase
        .from("attempts")
        .select("*, assessments(*)")
        .eq("id", attemptId)
        .single();

      if (attemptError) throw attemptError;

      // ❌ Prevent retake
      if (attempt.submitted_at) {
        toast.error("You cannot retake this assessment.");
        navigate("/dashboard");
        return;
      }

      setAssessment(attempt.assessments);
      setTimeRemaining(attempt.assessments.duration_minutes * 60);

      const { data: questionsData, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .eq("assessment_id", attempt.assessment_id)
        .order("created_at");

      if (questionsError) throw questionsError;

      setQuestions(questionsData);

      await supabase
        .from("attempts")
        .update({ total_questions: questionsData.length })
        .eq("id", attemptId);

      setLoading(false);
    } catch (error) {
      toast.error("Failed to load assessment");
      navigate("/dashboard");
    }
  };

  // TIMER
  useEffect(() => {
    if (timeRemaining <= 0 && assessment) {
      handleSubmit(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, assessment]);

  // AUTO-SUBMIT ON LEAVE, MINIMIZE, TAB CHANGE, WINDOW BLUR
  useEffect(() => {
    if (!attemptId) return;

    const handleViolation = async () => {
      if (submitting) return;

      setViolations((v) => v + 1);

      await supabase
        .from("attempts")
        .update({ violations: violations + 1 })
        .eq("id", attemptId);

      toast.error("You left the exam! Auto-submitting...");
      await handleSubmit(true);
    };

    const visibilityListener = () => {
      if (document.hidden) handleViolation();
    };

    const blurListener = () => {
      handleViolation();
    };

    const minimizeListener = () => {
      if (window.outerHeight < window.innerHeight + 50) {
        handleViolation();
      }
    };

    document.addEventListener("visibilitychange", visibilityListener);
    window.addEventListener("blur", blurListener);
    window.addEventListener("resize", minimizeListener);

    return () => {
      document.removeEventListener("visibilitychange", visibilityListener);
      window.removeEventListener("blur", blurListener);
      window.removeEventListener("resize", minimizeListener);
    };
  }, [attemptId, submitting, violations]);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  // SUBMIT LOGIC
  const handleSubmit = async (autoSubmitted = false) => {
    if (submitting) return;

    setSubmitting(true);

    try {
      let correct = 0;

      const writes = questions.map(async (q) => {
        const selected = answers[q.id];
        const isCorrect = selected === q.correct_answer;
        if (isCorrect) correct++;

        return supabase.from("answers").insert({
          attempt_id: attemptId,
          question_id: q.id,
          selected_answer: selected || null,
          is_correct: isCorrect,
        });
      });

      await Promise.all(writes);

      const passed = correct >= assessment.passing_score;

      await supabase
        .from("attempts")
        .update({
          score: correct,
          passed,
          submitted_at: new Date().toISOString(),
          auto_submitted: autoSubmitted,
        })
        .eq("id", attemptId);

      const { data: attempt } = await supabase
        .from("attempts")
        .select("profiles(email, full_name)")
        .eq("id", attemptId)
        .single();

      if (attempt?.profiles) {
        const msg = `You scored ${correct}/${questions.length} (${Math.round(
          (correct / questions.length) * 100
        )}%).`;

        notifyUserAction(attempt.profiles.email, attempt.profiles.full_name, "results_available", msg);
      }

      toast.success("Assessment Submitted!");
      navigate("/dashboard");
    } catch (err) {
      toast.error("Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );

  if (questions.length === 0)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>No Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/dashboard")}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );

  const q = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen p-6">
      {showWarning && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
          ⚠️ Do not leave the page!
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
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
                <span className={timeRemaining < 60 ? "text-red-500" : ""}>{formatTime(timeRemaining)}</span>
              </div>
            </div>
            <Progress value={progress} className="mt-3" />
          </CardHeader>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{q.question_text}</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={answers[q.id] || ""} onValueChange={(v) => handleAnswerChange(q.id, v)}>
              <div className="space-y-3">
                {["A", "B", "C", "D"].map((Option) => (
                  <div key={Option} className="flex items-center gap-3 border p-4 rounded-lg cursor-pointer">
                    <RadioGroupItem value={Option} id={Option} />
                    <Label htmlFor={Option}>{q[`option_${Option.toLowerCase()}`]}</Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <div className="flex justify-between items-center">
          <Button
            onClick={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
            variant="outline"
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-2" /> Previous
          </Button>

          <span className="text-sm text-muted-foreground">
            {Object.keys(answers).length} / {questions.length} answered
          </span>

          {currentQuestionIndex < questions.length - 1 ? (
            <Button onClick={() => setCurrentQuestionIndex((i) => i + 1)}>
              Next <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={() => handleSubmit(false)} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Assessment"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TakeAssessment;
