import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Clock, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  assessment_id: string;
}

interface Assessment {
  id: string;
  title: string;
  duration_minutes: number;
  passing_score: number;
}

const MAX_VIOLATIONS = 3;

const TakeAssessment = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [violations, setViolations] = useState(0);

  const [loading, setLoading] = useState(true);
  const isSubmittingRef = useRef(false);

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

      // Load existing violations
      setViolations(attempt.violations || 0);

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

      // Fetch questions securely via edge function (without correct_answer)
      const { data: questionsResponse, error: questionsError } = await supabase.functions.invoke(
        "get-assessment-questions",
        { body: { assessment_id: attempt.assessment_id } }
      );

      if (questionsError || !questionsResponse?.questions) {
        console.error("Error fetching questions:", questionsError);
        toast.error("Failed to load questions");
        navigate("/dashboard");
        return;
      }

      setQuestions(questionsResponse.questions);

      await supabase
        .from("attempts")
        .update({ total_questions: questionsResponse.questions.length })
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

  // Handle tab visibility change - 3 violations rule
  useEffect(() => {
    if (!assessment) return;

    const handleVisibilityChange = async () => {
      if (document.hidden && !isSubmittingRef.current) {
        const newViolations = violations + 1;
        setViolations(newViolations);

        // Update violations in database
        await supabase
          .from("attempts")
          .update({ violations: newViolations })
          .eq("id", attemptId);

        if (newViolations >= MAX_VIOLATIONS) {
          toast.error(`You have exceeded ${MAX_VIOLATIONS} violations. Your exam has been auto-submitted.`);
          handleSubmit(true);
        } else {
          const remaining = MAX_VIOLATIONS - newViolations;
          toast.warning(
            `Warning: You left the assessment tab! Violation ${newViolations}/${MAX_VIOLATIONS}. ${remaining} chance(s) remaining.`,
            { duration: 5000 }
          );
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [assessment, violations, attemptId]);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (autoSubmitted = false) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    try {
      // Prepare answers for submission
      const answersToSubmit = questions.map((q) => ({
        question_id: q.id,
        selected_answer: answers[q.id] || "",
      }));

      // Submit via edge function for server-side scoring
      const { data: result, error: submitError } = await supabase.functions.invoke(
        "submit-assessment-answers",
        {
          body: {
            attempt_id: attemptId,
            answers: answersToSubmit,
            auto_submitted: autoSubmitted,
          },
        }
      );

      if (submitError || !result?.success) {
        console.error("Submit error:", submitError);
        toast.error("Failed to submit assessment");
        isSubmittingRef.current = false;
        return;
      }

      if (autoSubmitted) {
        toast.info(
          `Assessment auto-submitted. Score: ${result.score}/${result.total_questions}`
        );
      } else {
        toast.success(
          `Assessment submitted! Score: ${result.score}/${result.total_questions} (${result.percentage}%)`
        );
      }

      navigate("/dashboard");

    } catch (err) {
      console.error(err);
      toast.error("Failed to submit assessment");
      isSubmittingRef.current = false;
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading assessment...</p>
        </div>
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
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{assessment?.title}</CardTitle>
                <CardDescription>
                  Question {currentQuestionIndex + 1} of {questions.length}
                </CardDescription>
              </div>

              <div className="flex items-center gap-4">
                {/* Violations Warning */}
                {violations > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="flex items-center gap-1"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    {violations}/{MAX_VIOLATIONS} Violations
                  </Badge>
                )}
                
                {/* Timer */}
                <div className={`flex items-center gap-2 font-bold ${timeRemaining < 60 ? "text-red-500 animate-pulse" : ""}`}>
                  <Clock className="w-5 h-5" />
                  {formatTime(timeRemaining)}
                </div>
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
                <div 
                  key={opt} 
                  className={`border p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-colors ${
                    answers[q.id] === opt ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem value={opt} id={opt} />
                  <Label htmlFor={opt} className="flex-1 cursor-pointer">
                    <span className="font-medium mr-2">{opt}.</span>
                    {q[`option_${opt.toLowerCase()}` as keyof Question]}
                  </Label>
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
            <Button onClick={() => handleSubmit(false)} disabled={isSubmittingRef.current}>
              Submit Assessment
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TakeAssessment;
