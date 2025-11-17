import { useEffect, useRef, useState } from "react";
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

/**
 * TakeAssessment.tsx
 *
 * - Auto-submits when user leaves/minimizes/changes tab/refreshes/closes
 * - Prevents double submits using refs
 * - Prevents retake: checks attempt.submitted_at || attempt.locked on load
 * - Locks attempt on submit (locked: true)
 *
 * NOTE: Backend/database enforcement is required to fully prevent retakes.
 * Make sure your attempts table has UNIQUE(student_id, assessment_id) and a `locked` column.
 */

const TakeAssessment = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [violations, setViolations] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  // submitting state handled via ref to avoid stale closures in event handlers
  const submittingRef = useRef(false);
  const violationsRef = useRef(0);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // keep refs in sync with state
  useEffect(() => {
    violationsRef.current = violations;
  }, [violations]);

  // LOAD ASSESSMENT + PREVENT RETAKE
  useEffect(() => {
    loadAssessment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  const loadAssessment = async () => {
    try {
      const { data: attempt, error: attemptError } = await supabase
        .from("attempts")
        .select("*, assessments(*), profiles(full_name, email)")
        .eq("id", attemptId)
        .single();

      if (attemptError) throw attemptError;

      // Prevent retake if already submitted or locked
      if (attempt.submitted_at || attempt.locked) {
        toast.error("You have already taken this assessment.");
        navigate("/dashboard");
        return;
      }

      setAssessment(attempt.assessments);
      setTimeRemaining((attempt.assessments?.duration_minutes || 0) * 60);

      const { data: questionsData, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .eq("assessment_id", attempt.assessment_id)
        .order("created_at");

      if (questionsError) throw questionsError;

      setQuestions(questionsData || []);

      // Update total_questions on attempt record (best effort)
      await supabase.from("attempts").update({ total_questions: (questionsData || []).length }).eq("id", attemptId);

      setLoading(false);
    } catch (err) {
      console.error("loadAssessment error:", err);
      toast.error("Failed to load assessment");
      navigate("/dashboard");
    }
  };

  // TIMER
  useEffect(() => {
    if (timeRemaining <= 0 && assessment) {
      // try to auto-submit when time is up
      attemptAutoSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining, assessment]);

  const attemptAutoSubmit = async () => {
    if (submittingRef.current) return;
    await handleSubmit(true);
  };

  // ANTI-CHEAT: handle visibilitychange, blur, pagehide, beforeunload
  useEffect(() => {
    if (!attemptId) return;

    const handleViolation = async (reason?: string) => {
      if (submittingRef.current) return;

      // increment violation counter
      const newCount = violationsRef.current + 1;
      violationsRef.current = newCount;
      if (mountedRef.current) setViolations(newCount);

      // persist violation count (best effort)
      try {
        await supabase.from("attempts").update({ violations: newCount }).eq("id", attemptId);
      } catch (err) {
        console.warn("Failed to persist violation count:", err);
      }

      // show a warning and auto-submit
      setShowWarning(true);
      toast.error(reason ? `You left the exam (${reason}). Auto-submitting...` : "You left the exam! Auto-submitting...");
      await handleSubmit(true);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") handleViolation("tab hidden / minimized");
    };

    const onBlur = () => handleViolation("window blur");
    const onPageHide = () => handleViolation("page hide");

    // beforeunload: best-effort synchronous signal (can't rely on async)
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      try {
        // mark in localStorage as a fallback so other tabs/devices can detect
        localStorage.setItem(`attempt_submitting_${attemptId}`, "1");
      } catch (err) {
        // ignore
      }
      // attempt to submit (may not complete)
      handleViolation("before unload");
      // show default confirmation (most browsers ignore custom messages)
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  // SUBMIT LOGIC (uses submittingRef)
  const handleSubmit = async (autoSubmitted = false) => {
    if (submittingRef.current) return;
    submittingRef.current = true;

    try {
      let correct = 0;

      // Insert answers
      const writes = (questions || []).map(async (q) => {
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

      const passed = correct >= (assessment?.passing_score || 0);

      // Update attempt: score, passed, submitted_at, locked
      await supabase
        .from("attempts")
        .update({
          score: correct,
          passed,
          submitted_at: new Date().toISOString(),
          auto_submitted: autoSubmitted,
          locked: true,
        })
        .eq("id", attemptId);

      // notify user (best effort)
      try {
        const { data: attempt } = await supabase
          .from("attempts")
          .select("profiles(email, full_name)")
          .eq("id", attemptId)
          .single();

        if (attempt?.profiles) {
          const msg = `You scored ${correct}/${(questions || []).length} (${Math.round(
            ((questions.length && correct) / (questions.length || 1)) * 100
          )}%).`;
          notifyUserAction(attempt.profiles.email, attempt.profiles.full_name, "results_available", msg);
        }
      } catch (err) {
        console.warn("Failed to send notification:", err);
      }

      toast.success("Assessment Submitted!");
    } catch (err) {
      console.error("handleSubmit error:", err);
      toast.error("Failed to submit assessment");
    } finally {
      submittingRef.current = false;
      // ensure UI state reflects submission
      if (mountedRef.current) {
        // small delay so toast shows before navigation
        setTimeout(() => navigate("/dashboard"), 600);
      } else {
        // if unmounted, still try to navigate
        try {
          navigate("/dashboard");
        } catch (err) {
          // ignore
        }
      }
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
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          ⚠️ Do not leave the page — your exam will be submitted automatically.
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{assessment?.title}</CardTitle>
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

        {/* Question */}
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

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            onClick={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
            variant="outline"
            disabled={currentQuestionIndex === 0 || submittingRef.current}
          >
            <ChevronLeft className="w-4 h-4 mr-2" /> Previous
          </Button>

          <span className="text-sm text-muted-foreground">
            {Object.keys(answers).length} / {questions.length} answered
          </span>

          {currentQuestionIndex < questions.length - 1 ? (
            <Button onClick={() => setCurrentQuestionIndex((i) => i + 1)} disabled={submittingRef.current}>
              Next <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={() => handleSubmit(false)} disabled={submittingRef.current}>
              {submittingRef.current ? "Submitting..." : "Submit Assessment"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TakeAssessment;
