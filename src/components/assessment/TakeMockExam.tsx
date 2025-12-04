import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Clock, ChevronRight, BookOpen } from "lucide-react";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  assessment_id: string;
}

interface SubjectWithQuestions {
  id: string;
  name: string;
  order_position: number;
  assessment_id: string;
  questions: Question[];
}

interface MockExam {
  id: string;
  title: string;
  total_duration_minutes: number;
  duration_per_subject_minutes: number;
}

const TakeMockExam = () => {
  const { mockExamId } = useParams();
  const navigate = useNavigate();

  const [mockExam, setMockExam] = useState<MockExam | null>(null);
  const [subjects, setSubjects] = useState<SubjectWithQuestions[]>([]);
  const [currentSubjectIndex, setCurrentSubjectIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [subjectResults, setSubjectResults] = useState<Record<string, { score: number; total: number }>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [examCompleted, setExamCompleted] = useState(false);

  const loadMockExam = useCallback(async () => {
    if (!mockExamId) {
      toast.error("Invalid mock exam link");
      navigate("/dashboard");
      return;
    }

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error("You must be logged in");
        navigate("/login");
        return;
      }

      // Check for existing completed attempt
      const { data: existingAttempt } = await supabase
        .from("mock_exam_attempts")
        .select("id, is_completed")
        .eq("mock_exam_id", mockExamId)
        .eq("student_id", user.id)
        .maybeSingle();

      if (existingAttempt?.is_completed) {
        toast.error("You have already completed this mock exam");
        navigate("/dashboard");
        return;
      }

      // Fetch mock exam details
      const { data: mock, error: mockError } = await supabase
        .from("mock_exams")
        .select("id, title, total_duration_minutes, duration_per_subject_minutes, is_active")
        .eq("id", mockExamId)
        .single();

      if (mockError || !mock) {
        toast.error("Mock exam not found");
        navigate("/dashboard");
        return;
      }

      if (!mock.is_active) {
        toast.error("This mock exam is no longer active");
        navigate("/dashboard");
        return;
      }

      // Fetch subjects linked to this mock exam
      const { data: mockSubjects, error: subjectsError } = await supabase
        .from("mock_exam_subjects")
        .select(`
          subject_id,
          order_position,
          subjects (
            id,
            name
          )
        `)
        .eq("mock_exam_id", mockExamId)
        .order("order_position");

      if (subjectsError || !mockSubjects || mockSubjects.length === 0) {
        toast.error("No subjects found for this mock exam");
        navigate("/dashboard");
        return;
      }

      // Fetch assessments for each subject
      const subjectsWithQuestions: SubjectWithQuestions[] = [];
      
      for (const ms of mockSubjects) {
        const subject = ms.subjects as any;
        
        // Find assessment for this subject related to this mock exam
        const { data: assessment } = await supabase
          .from("assessments")
          .select("id")
          .eq("subject_id", ms.subject_id)
          .ilike("title", `%${mock.title}%`)
          .maybeSingle();

        if (assessment) {
          // Fetch questions for this assessment
          const { data: questions } = await supabase
            .from("questions")
            .select("id, question_text, option_a, option_b, option_c, option_d, correct_answer, assessment_id")
            .eq("assessment_id", assessment.id);

          subjectsWithQuestions.push({
            id: subject.id,
            name: subject.name,
            order_position: ms.order_position,
            assessment_id: assessment.id,
            questions: questions || [],
          });
        }
      }

      if (subjectsWithQuestions.length === 0) {
        toast.error("No questions found for this mock exam");
        navigate("/dashboard");
        return;
      }

      // Sort by order position
      subjectsWithQuestions.sort((a, b) => a.order_position - b.order_position);

      // Create or get attempt
      let currentAttemptId = existingAttempt?.id;
      
      if (!currentAttemptId) {
        const { data: newAttempt, error: attemptError } = await supabase
          .from("mock_exam_attempts")
          .insert({
            mock_exam_id: mockExamId,
            student_id: user.id,
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (attemptError) {
          toast.error("Failed to start exam");
          navigate("/dashboard");
          return;
        }
        currentAttemptId = newAttempt.id;
      }

      setAttemptId(currentAttemptId);
      setMockExam(mock);
      setSubjects(subjectsWithQuestions);
      setTimeRemaining(mock.duration_per_subject_minutes * 60);
      setLoading(false);

    } catch (err) {
      console.error("Load mock exam error:", err);
      toast.error("Failed to load mock exam");
      navigate("/dashboard");
    }
  }, [mockExamId, navigate]);

  useEffect(() => {
    loadMockExam();
  }, [loadMockExam]);

  // Timer
  useEffect(() => {
    if (!mockExam || examCompleted) return;

    if (timeRemaining <= 0) {
      handleSubjectSubmit(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((t) => Math.max(t - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, mockExam, examCompleted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubjectSubmit = async (autoSubmitted = false) => {
    if (submitting) return;
    setSubmitting(true);

    const currentSubject = subjects[currentSubjectIndex];
    let correct = 0;

    try {
      // Calculate score for this subject
      for (const q of currentSubject.questions) {
        const selected = answers[q.id];
        if (selected === q.correct_answer) correct++;
      }

      // Save subject result
      const { error: resultError } = await supabase
        .from("mock_exam_subject_results")
        .upsert({
          attempt_id: attemptId,
          subject_id: currentSubject.id,
          assessment_id: currentSubject.assessment_id,
          score: correct,
          total_questions: currentSubject.questions.length,
          completed_at: new Date().toISOString(),
        });

      if (resultError) {
        console.error("Failed to save subject result:", resultError);
      }

      // Update local results
      setSubjectResults((prev) => ({
        ...prev,
        [currentSubject.id]: { score: correct, total: currentSubject.questions.length },
      }));

      if (autoSubmitted) {
        toast.info(`Time's up! ${currentSubject.name} auto-submitted.`);
      } else {
        toast.success(`${currentSubject.name} submitted! Score: ${correct}/${currentSubject.questions.length}`);
      }

      // Move to next subject or complete exam
      if (currentSubjectIndex < subjects.length - 1) {
        setCurrentSubjectIndex((i) => i + 1);
        setCurrentQuestionIndex(0);
        setTimeRemaining(mockExam!.duration_per_subject_minutes * 60);
      } else {
        // All subjects completed
        await completeExam();
      }
    } catch (err) {
      console.error("Submit error:", err);
      toast.error("Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const completeExam = async () => {
    // Calculate total score
    let totalScore = 0;
    let totalQuestions = 0;

    // Include current subject if not already in results
    const currentSubject = subjects[currentSubjectIndex];
    let currentCorrect = 0;
    for (const q of currentSubject.questions) {
      if (answers[q.id] === q.correct_answer) currentCorrect++;
    }

    const allResults = {
      ...subjectResults,
      [currentSubject.id]: { score: currentCorrect, total: currentSubject.questions.length },
    };

    for (const result of Object.values(allResults)) {
      totalScore += result.score;
      totalQuestions += result.total;
    }

    // Update attempt as completed
    const { error: updateError } = await supabase
      .from("mock_exam_attempts")
      .update({
        is_completed: true,
        submitted_at: new Date().toISOString(),
        total_score: totalScore,
        total_questions: totalQuestions,
      })
      .eq("id", attemptId);

    if (updateError) {
      console.error("Failed to complete exam:", updateError);
    }

    setSubjectResults(allResults);
    setExamCompleted(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading mock exam...</p>
        </div>
      </div>
    );
  }

  // Show results
  if (examCompleted) {
    let totalScore = 0;
    let totalQuestions = 0;
    
    for (const result of Object.values(subjectResults)) {
      totalScore += result.score;
      totalQuestions += result.total;
    }

    const percentage = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;

    return (
      <div className="min-h-screen p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Mock Exam Completed!</CardTitle>
              <CardDescription>{mockExam?.title}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center py-6 bg-muted rounded-lg">
                <p className="text-4xl font-bold text-primary">{percentage}%</p>
                <p className="text-lg text-muted-foreground mt-2">
                  {totalScore} / {totalQuestions} correct
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">Results by Subject:</h3>
                {subjects.map((subject) => {
                  const result = subjectResults[subject.id];
                  const subjectPercentage = result ? Math.round((result.score / result.total) * 100) : 0;
                  
                  return (
                    <div key={subject.id} className="flex items-center justify-between p-3 border rounded">
                      <span className="font-medium">{subject.name}</span>
                      <span className={subjectPercentage >= 50 ? "text-green-600" : "text-red-600"}>
                        {result?.score || 0} / {result?.total || 0} ({subjectPercentage}%)
                      </span>
                    </div>
                  );
                })}
              </div>

              <Button onClick={() => navigate("/dashboard")} className="w-full">
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentSubject = subjects[currentSubjectIndex];
  const currentQuestion = currentSubject?.questions[currentQuestionIndex];
  const overallProgress = ((currentSubjectIndex) / subjects.length) * 100;
  const questionProgress = ((currentQuestionIndex + 1) / (currentSubject?.questions.length || 1)) * 100;

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>No questions available for this subject.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">{mockExam?.title}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <BookOpen className="w-4 h-4" />
                  Subject {currentSubjectIndex + 1} of {subjects.length}: <span className="font-medium">{currentSubject.name}</span>
                </CardDescription>
              </div>

              <div className={`flex items-center gap-2 text-lg font-bold ${timeRemaining < 60 ? "text-red-500 animate-pulse" : ""}`}>
                <Clock className="w-5 h-5" />
                {formatTime(timeRemaining)}
              </div>
            </div>
            
            <div className="space-y-2 mt-4">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{currentSubjectIndex}/{subjects.length} subjects</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
              
              <div className="flex justify-between text-sm mt-2">
                <span>Current Subject</span>
                <span>Question {currentQuestionIndex + 1} of {currentSubject.questions.length}</span>
              </div>
              <Progress value={questionProgress} className="h-2" />
            </div>
          </CardHeader>
        </Card>

        {/* Question */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Question {currentQuestionIndex + 1}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg mb-6">{currentQuestion.question_text}</p>
            
            <RadioGroup
              value={answers[currentQuestion.id] || ""}
              onValueChange={(v) => handleAnswerChange(currentQuestion.id, v)}
            >
              {["A", "B", "C", "D"].map((opt) => (
                <div
                  key={opt}
                  className={`border p-4 rounded-lg flex items-center gap-3 cursor-pointer transition-colors ${
                    answers[currentQuestion.id] === opt ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem value={opt} id={`opt-${opt}`} />
                  <Label htmlFor={`opt-${opt}`} className="flex-1 cursor-pointer">
                    <span className="font-medium mr-2">{opt}.</span>
                    {currentQuestion[`option_${opt.toLowerCase()}` as keyof Question]}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>

          <div className="flex gap-2">
            {currentQuestionIndex < currentSubject.questions.length - 1 ? (
              <Button onClick={() => setCurrentQuestionIndex((i) => i + 1)}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button 
                onClick={() => handleSubjectSubmit(false)} 
                disabled={submitting}
                variant="default"
              >
                {submitting ? "Submitting..." : currentSubjectIndex < subjects.length - 1 ? "Submit & Next Subject" : "Submit Exam"}
              </Button>
            )}
          </div>
        </div>

        {/* Question Navigation Grid */}
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground mb-2">Question Navigator:</p>
            <div className="flex flex-wrap gap-2">
              {currentSubject.questions.map((q, idx) => (
                <Button
                  key={q.id}
                  variant={currentQuestionIndex === idx ? "default" : answers[q.id] ? "secondary" : "outline"}
                  size="sm"
                  className="w-10 h-10"
                  onClick={() => setCurrentQuestionIndex(idx)}
                >
                  {idx + 1}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TakeMockExam;
