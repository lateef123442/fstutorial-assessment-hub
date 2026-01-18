import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
}

interface Answer {
  question_id: string;
  selected_answer: string;
  is_correct: boolean;
}

interface Attempt {
  id: string;
  score: number;
  total_questions: number;
  passed: boolean;
  violations: number;
  auto_submitted: boolean;
  submitted_at: string;
  assessments: {
    title: string;
    subjects: {
      name: string;
    };
  };
}

const AssessmentReview = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);

  useEffect(() => {
    fetchReviewData();
  }, [attemptId]);

  const fetchReviewData = async () => {
    try {
      // Fetch attempt details
      const { data: attemptData, error: attemptError } = await supabase
        .from("attempts")
        .select(`
          *,
          assessments(title, subjects(name))
        `)
        .eq("id", attemptId)
        .single();

      if (attemptError) {
        console.error("Attempt fetch error:", attemptError);
        toast.error("Failed to load attempt details");
        navigate("/dashboard");
        return;
      }
      
      if (!attemptData) {
        toast.error("Attempt not found");
        navigate("/dashboard");
        return;
      }

      setAttempt(attemptData as Attempt);

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .eq("assessment_id", attemptData.assessment_id);

      if (questionsError) {
        console.error("Questions fetch error:", questionsError);
        toast.error("Failed to load questions");
      } else {
        setQuestions(questionsData || []);
      }

      // Fetch answers
      const { data: answersData, error: answersError } = await supabase
        .from("answers")
        .select("*")
        .eq("attempt_id", attemptId);

      if (answersError) {
        console.error("Answers fetch error:", answersError);
        toast.error("Failed to load answers");
      } else {
        setAnswers(answersData || []);
      }

      setLoading(false);
    } catch (error: any) {
      console.error("Review fetch error:", error);
      toast.error("Failed to load review data");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading review...</p>
        </div>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No attempt data found</p>
          <Button onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const percentage = attempt.total_questions 
    ? Math.round((attempt.score / attempt.total_questions) * 100) 
    : 0;

  const correctCount = answers.filter(a => a.is_correct).length;
  const incorrectCount = answers.filter(a => !a.is_correct).length;
  const unansweredCount = questions.length - answers.length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Summary Card */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{attempt.assessments?.title || "Assessment Review"}</CardTitle>
                <CardDescription>{attempt.assessments?.subjects?.name || "Subject"}</CardDescription>
              </div>
              <Badge className="text-lg px-4 py-2" variant={attempt.passed ? "default" : "destructive"}>
                {attempt.passed ? "PASSED" : "FAILED"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-5 gap-4 text-center">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Score</p>
                <p className="text-3xl font-bold">{attempt.score}/{attempt.total_questions}</p>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Percentage</p>
                <p className="text-3xl font-bold">{percentage}%</p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/20 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Correct</p>
                <p className="text-3xl font-bold text-green-600">{correctCount}</p>
              </div>
              <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Incorrect</p>
                <p className="text-3xl font-bold text-red-600">{incorrectCount}</p>
              </div>
              <div className="bg-amber-100 dark:bg-amber-900/20 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Unanswered</p>
                <p className="text-3xl font-bold text-amber-600">{unansweredCount}</p>
              </div>
            </div>

            {/* Violations Warning */}
            {(attempt.violations > 0 || attempt.auto_submitted) && (
              <div className="mt-4 p-4 bg-amber-100 dark:bg-amber-900/20 rounded-lg flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-400">
                    Assessment Information
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-500">
                    {attempt.violations > 0 && `${attempt.violations} violation(s) recorded. `}
                    {attempt.auto_submitted && "This assessment was auto-submitted."}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Questions Review */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Question Review</h2>
          
          {questions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No questions found for this assessment.</p>
              </CardContent>
            </Card>
          ) : (
            questions.map((question, index) => {
              const answer = answers.find(a => a.question_id === question.id);
              const isCorrect = answer?.is_correct || false;
              const isAnswered = !!answer;
              const selectedAnswer = answer?.selected_answer || null;

              return (
                <Card 
                  key={question.id} 
                  className={`border-l-4 ${
                    !isAnswered
                      ? "border-l-amber-500"
                      : isCorrect 
                      ? "border-l-green-500" 
                      : "border-l-red-500"
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          Question {index + 1}
                          {!isAnswered ? (
                            <Badge variant="outline" className="border-amber-500 text-amber-600">Unanswered</Badge>
                          ) : isCorrect ? (
                            <Badge variant="default" className="bg-green-500">Correct</Badge>
                          ) : (
                            <Badge variant="destructive">Incorrect</Badge>
                          )}
                        </CardTitle>
                        <p className="mt-2 text-base font-normal">{question.question_text}</p>
                      </div>
                      {!isAnswered ? (
                        <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
                      ) : isCorrect ? (
                        <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-2">
                      {[
                        { label: "A", value: question.option_a },
                        { label: "B", value: question.option_b },
                        { label: "C", value: question.option_c },
                        { label: "D", value: question.option_d },
                      ].map((option) => {
                        const isSelected = selectedAnswer === option.label;
                        const isCorrectAnswer = question.correct_answer === option.label;

                        return (
                          <div
                            key={option.label}
                            className={`p-3 rounded-lg border-2 transition-all ${
                              isCorrectAnswer
                                ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                                : isSelected
                                ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                                : "border-border"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-semibold w-6">{option.label}.</span>
                              <span className="flex-1">{option.value}</span>
                              {isCorrectAnswer && (
                                <Badge variant="default" className="bg-green-500 ml-auto">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Correct Answer
                                </Badge>
                              )}
                              {isSelected && !isCorrectAnswer && (
                                <Badge variant="destructive" className="ml-auto">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Your Answer
                                </Badge>
                              )}
                              {isSelected && isCorrectAnswer && (
                                <Badge variant="default" className="bg-green-500 ml-auto">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Your Answer ✓
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {(!isAnswered || !isCorrect) && (
                      <div className="bg-muted p-4 rounded-lg mt-4">
                        <p className="font-semibold text-sm mb-1">Explanation:</p>
                        <p className="text-sm text-muted-foreground">
                          The correct answer is <strong className="text-green-600">{question.correct_answer}</strong>. 
                          {!isAnswered ? (
                            <> You did not answer this question.</>
                          ) : (
                            <> You selected <strong className="text-red-600">{selectedAnswer}</strong>.</>
                          )}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Button onClick={() => navigate("/dashboard")} size="lg">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </main>
    </div>
  );
};

export default AssessmentReview;
