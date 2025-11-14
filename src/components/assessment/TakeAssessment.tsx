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

  useEffect(() => {
    loadAssessment();
  }, [attemptId]);

  useEffect(() => {
    if (timeRemaining <= 0 && assessment) {
      handleSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, assessment]);

  // Security: Monitor page visibility and focus
  useEffect(() => {
    const handleViolation = async () => {
      const newViolations = violations + 1;
      setViolations(newViolations);
      
      // Update violations count in database
      await supabase
        .from("attempts")
        .update({ violations: newViolations })
        .eq("id", attemptId);

      if (newViolations >= 3) {
        // Auto-submit on 3rd violation
        toast.error("Too many violations! Assessment auto-submitted.");
        handleSubmit(true);
      } else {
        setShowWarning(true);
        toast.warning(`Warning ${newViolations}/3: Don't leave the exam page!`);
        setTimeout(() => setShowWarning(false), 3000);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && !submitting) {
        handleViolation();
      }
    };

    const handleBlur = () => {
      if (!submitting) {
        handleViolation();
      }
    };

    // Add event listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [violations, submitting, attemptId]);

  const loadAssessment = async () => {
    try {
      const { data: attempt, error: attemptError } = await supabase
        .from("attempts")
        .select("*, assessments(*)")
        .eq("id", attemptId)
        .single();

      if (attemptError) throw attemptError;

      setAssessment(attempt.assessments);
      setTimeRemaining(attempt.assessments.duration_minutes * 60);

      const { data: questionsData, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .eq("assessment_id", attempt.assessment_id)
        .order("created_at");

      if (questionsError) throw questionsError;

      setQuestions(questionsData);
      
      // Update total_questions in attempt
      await supabase
        .from("attempts")
        .update({ total_questions: questionsData.length })
        .eq("id", attemptId);

      setLoading(false);
    } catch (error) {
      console.error("Error loading assessment:", error);
      toast.error("Failed to load assessment");
      navigate("/dashboard");
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleSubmit = async (autoSubmitted = false) => {
    if (submitting) return;
    setSubmitting(true);

    try {
      // Calculate score
      let correctCount = 0;
      const answerPromises = questions.map(async (question) => {
        const selectedAnswer = answers[question.id];
        const isCorrect = selectedAnswer === question.correct_answer;
        if (isCorrect) correctCount++;

        return supabase.from("answers").insert({
          attempt_id: attemptId!,
          question_id: question.id,
          selected_answer: selectedAnswer || null,
          is_correct: isCorrect,
        });
      });

      await Promise.all(answerPromises);

      const score = correctCount;
      const passed = score >= assessment.passing_score;

      // Update attempt
      await supabase
        .from("attempts")
        .update({
          score,
          passed,
          submitted_at: new Date().toISOString(),
          auto_submitted: autoSubmitted,
        })
        .eq("id", attemptId);

      // Get student email for notification
      const { data: attempt } = await supabase
        .from("attempts")
        .select("student_id, profiles!attempts_student_id_fkey(email, full_name)")
        .eq("id", attemptId)
        .single();

      if (attempt?.profiles) {
        notifyUserAction(
          attempt.profiles.email,
          attempt.profiles.full_name,
          "assessment_submitted",
          `You scored ${score} out of ${questions.length}. ${passed ? 'Congratulations, you passed!' : 'Keep practicing!'}`
        );
      }

      console.log("Assessment completed:", {
        student: attempt?.profiles?.full_name,
        score,
        passed,
      });

      toast.success(`Assessment submitted! Score: ${score}/${questions.length}`);
      navigate("/dashboard");
    } catch (error) {
      console.error("Error submitting assessment:", error);
      toast.error("Failed to submit assessment");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Questions Available</CardTitle>
            <CardDescription>This assessment has no questions yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background p-6">
      {showWarning && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-destructive text-destructive-foreground px-6 py-4 rounded-lg shadow-lg animate-in slide-in-from-top">
          <p className="font-semibold">⚠️ Warning: Don't leave the exam page!</p>
          <p className="text-sm">Violations: {violations}/3 - Assessment will auto-submit on 3rd violation</p>
        </div>
      )}
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{assessment.title}</CardTitle>
                <CardDescription>
                  Question {currentQuestionIndex + 1} of {questions.length}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Clock className="w-5 h-5" />
                <span className={timeRemaining < 60 ? "text-destructive" : ""}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
            </div>
            <Progress value={progress} className="mt-4" />
          </CardHeader>
        </Card>

        {/* Question */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">{currentQuestion.question_text}</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={answers[currentQuestion.id] || ""}
              onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
            >
              <div className="space-y-3">
                {["A", "B", "C", "D"].map((option) => (
                  <div
                    key={option}
                    className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-accent cursor-pointer"
                  >
                    <RadioGroupItem value={option} id={`option-${option}`} />
                    <Label htmlFor={`option-${option}`} className="flex-1 cursor-pointer">
                      {currentQuestion[`option_${option.toLowerCase()}`]}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="text-sm text-muted-foreground">
            {Object.keys(answers).length} of {questions.length} answered
          </div>

          {currentQuestionIndex < questions.length - 1 ? (
            <Button
              onClick={() =>
                setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))
              }
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
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