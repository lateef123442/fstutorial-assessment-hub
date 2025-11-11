import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
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

const AssessmentReview = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<any>(null);
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

      if (attemptError) throw attemptError;
      setAttempt(attemptData);

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .eq("assessment_id", attemptData.assessment_id);

      if (questionsError) throw questionsError;
      setQuestions(questionsData);

      // Fetch answers
      const { data: answersData, error: answersError } = await supabase
        .from("answers")
        .select("*")
        .eq("attempt_id", attemptId);

      if (answersError) throw answersError;
      setAnswers(answersData);

      setLoading(false);
    } catch (error: any) {
      toast.error(error.message);
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

  if (!attempt) return null;

  const percentage = ((attempt.score / attempt.total_questions) * 100).toFixed(0);

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
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{attempt.assessments.title}</CardTitle>
            <CardDescription>{attempt.assessments.subjects.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Score</p>
                <p className="text-2xl font-bold">{attempt.score}/{attempt.total_questions}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Percentage</p>
                <p className="text-2xl font-bold">{percentage}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Result</p>
                <Badge className="text-lg" variant={attempt.passed ? "default" : "destructive"}>
                  {attempt.passed ? "PASSED" : "FAILED"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Question Review</h2>
          {questions.map((question, index) => {
            const answer = answers.find(a => a.question_id === question.id);
            const isCorrect = answer?.is_correct;
            const selectedAnswer = answer?.selected_answer;

            return (
              <Card key={question.id} className={isCorrect ? "border-green-500/20" : "border-red-500/20"}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        Question {index + 1}
                      </CardTitle>
                      <p className="mt-2 text-base">{question.question_text}</p>
                    </div>
                    {isCorrect ? (
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
                          className={`p-3 rounded-lg border-2 ${
                            isCorrectAnswer
                              ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                              : isSelected
                              ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                              : "border-border"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{option.label}.</span>
                            <span>{option.value}</span>
                            {isCorrectAnswer && (
                              <Badge variant="default" className="ml-auto">Correct Answer</Badge>
                            )}
                            {isSelected && !isCorrectAnswer && (
                              <Badge variant="destructive" className="ml-auto">Your Answer</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {!isCorrect && (
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="font-semibold text-sm mb-1">Explanation:</p>
                      <p className="text-sm text-muted-foreground">
                        The correct answer is <strong>{question.correct_answer}</strong>. 
                        You selected <strong>{selectedAnswer}</strong>.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default AssessmentReview;
