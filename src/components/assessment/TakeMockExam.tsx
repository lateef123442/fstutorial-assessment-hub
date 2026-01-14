import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Clock, BookOpen, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
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

const MAX_VIOLATIONS = 3;

const TakeMockExam = () => {
  const { mockExamId } = useParams();
  const navigate = useNavigate();

  const [mockExam, setMockExam] = useState<MockExam | null>(null);
  const [subjects, setSubjects] = useState<SubjectWithQuestions[]>([]);
  const [activeSubjectId, setActiveSubjectId] = useState<string>("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [subjectResults, setSubjectResults] = useState<Record<string, { score: number; total: number }>>({});
  const [submittedSubjects, setSubmittedSubjects] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [violations, setViolations] = useState(0);

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
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error("You must be logged in");
        navigate("/login");
        return;
      }

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

      const subjectsWithQuestions: SubjectWithQuestions[] = [];
      
      // Normalize title for comparison (remove extra whitespace)
      const normalizeTitle = (title: string) => title.trim().replace(/\s+/g, ' ').toLowerCase();
      const normalizedMockTitle = normalizeTitle(mock.title);
      
      console.log(`Loading mock exam: "${mock.title}" (normalized: "${normalizedMockTitle}")`);
      console.log(`Found ${mockSubjects.length} subjects linked to this mock exam`);
      
      for (const ms of mockSubjects) {
        const subject = ms.subjects as any;
        console.log(`Processing subject: ${subject.name} (${ms.subject_id})`);
        
        // Find all mock exam assessments for this subject
        const { data: assessments, error: assessError } = await supabase
          .from("assessments")
          .select("id, title")
          .eq("subject_id", ms.subject_id)
          .eq("is_mock_exam", true);

        if (assessError) {
          console.error(`Error fetching assessments for subject ${subject.name}:`, assessError);
          continue;
        }

        console.log(`Found ${assessments?.length || 0} mock assessments for ${subject.name}:`, assessments?.map(a => a.title));

        // Find the best matching assessment - normalize both titles for comparison
        const assessment = assessments?.find(a => {
          const normalizedAssessTitle = normalizeTitle(a.title);
          return normalizedAssessTitle.includes(normalizedMockTitle) ||
                 normalizedAssessTitle.startsWith(normalizedMockTitle);
        }) || assessments?.[0]; // Fallback to first if no title match

        if (assessment) {
          console.log(`Using assessment "${assessment.title}" (${assessment.id}) for ${subject.name}`);
          
          const { data: questionsResponse, error: questionsError } = await supabase.functions.invoke(
            "get-assessment-questions",
            { body: { assessment_id: assessment.id } }
          );

          console.log(`Questions response for ${subject.name}:`, { 
            count: questionsResponse?.questions?.length, 
            error: questionsError 
          });

          if (!questionsError && questionsResponse?.questions && questionsResponse.questions.length > 0) {
            subjectsWithQuestions.push({
              id: subject.id,
              name: subject.name,
              order_position: ms.order_position,
              assessment_id: assessment.id,
              questions: questionsResponse.questions,
            });
          } else {
            console.warn(`No questions returned for subject ${subject.name}, assessment ${assessment.id}`);
          }
        } else {
          console.warn(`No assessment found for subject ${subject.name} (${ms.subject_id})`);
        }
      }
      
      console.log(`Total subjects with questions: ${subjectsWithQuestions.length}`);

      if (subjectsWithQuestions.length === 0) {
        toast.error("No questions found for this mock exam");
        navigate("/dashboard");
        return;
      }

      subjectsWithQuestions.sort((a, b) => a.order_position - b.order_position);

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
      setActiveSubjectId(subjectsWithQuestions[0].id);
      setTimeRemaining(mock.total_duration_minutes * 60);
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

  // Timer for entire exam
  useEffect(() => {
    if (!mockExam || examCompleted) return;

    if (timeRemaining <= 0) {
      handleSubmitExam(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((t) => Math.max(t - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, mockExam, examCompleted]);

  // Handle tab visibility change - 3 violations rule
  useEffect(() => {
    if (!mockExam || examCompleted) return;

    const handleVisibilityChange = async () => {
      if (document.hidden && !submitting) {
        const newViolations = violations + 1;
        setViolations(newViolations);

        if (newViolations >= MAX_VIOLATIONS) {
          toast.error(`You have exceeded ${MAX_VIOLATIONS} violations. Your exam has been auto-submitted.`);
          handleSubmitExam(true);
        } else {
          const remaining = MAX_VIOLATIONS - newViolations;
          toast.warning(
            `Warning: You left the exam tab! Violation ${newViolations}/${MAX_VIOLATIONS}. ${remaining} chance(s) remaining.`,
            { duration: 5000 }
          );
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [mockExam, examCompleted, submitting, violations]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const getActiveSubject = () => subjects.find(s => s.id === activeSubjectId);

  const getAnsweredCount = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return 0;
    return subject.questions.filter(q => answers[q.id]).length;
  };

  const handleSubmitExam = async (autoSubmitted = false) => {
    if (submitting) return;
    setSubmitting(true);

    try {
      // Submit all subjects that haven't been submitted yet
      for (const subject of subjects) {
        if (submittedSubjects.has(subject.id)) continue;

        const subjectAnswers = subject.questions.map((q) => ({
          question_id: q.id,
          selected_answer: answers[q.id] || "",
        }));

        const { data: result, error: submitError } = await supabase.functions.invoke(
          "submit-mock-exam-subject",
          {
            body: {
              attempt_id: attemptId,
              subject_id: subject.id,
              assessment_id: subject.assessment_id,
              answers: subjectAnswers,
              is_final_subject: subject.id === subjects[subjects.length - 1].id,
            },
          }
        );

        if (!submitError && result?.success) {
          setSubjectResults((prev) => ({
            ...prev,
            [subject.id]: { score: result.score, total: result.total_questions },
          }));
          setSubmittedSubjects(prev => new Set(prev).add(subject.id));
        }
      }

      if (autoSubmitted) {
        toast.info("Time's up! Exam auto-submitted.");
      } else {
        toast.success("Exam submitted successfully!");
      }
      
      setExamCompleted(true);
    } catch (err) {
      console.error("Submit error:", err);
      toast.error("Failed to submit exam");
    } finally {
      setSubmitting(false);
    }
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

  const activeSubject = getActiveSubject();
  const currentQuestion = activeSubject?.questions[currentQuestionIndex];

  if (!activeSubject || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>No questions available.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <div className="sticky top-0 z-50 bg-background border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-semibold text-lg">{mockExam?.title}</h1>
              <p className="text-sm text-muted-foreground">
                {subjects.reduce((acc, s) => acc + s.questions.length, 0)} Total Questions
              </p>
            </div>
            <div className={cn(
              "flex items-center gap-2 text-lg font-bold px-4 py-2 rounded-lg",
              timeRemaining < 300 ? "bg-destructive/10 text-destructive animate-pulse" : "bg-muted"
            )}>
              <Clock className="w-5 h-5" />
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        {/* Subject Tabs - JAMB Style */}
        <Tabs value={activeSubjectId} onValueChange={(id) => {
          setActiveSubjectId(id);
          setCurrentQuestionIndex(0);
        }}>
          <TabsList className="w-full h-auto flex-wrap justify-start gap-2 bg-transparent p-0 mb-4">
            {subjects.map((subject) => {
              const answered = getAnsweredCount(subject.id);
              const total = subject.questions.length;
              
              return (
                <TabsTrigger
                  key={subject.id}
                  value={subject.id}
                  className={cn(
                    "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                    "px-4 py-2 rounded-lg border",
                    "flex items-center gap-2"
                  )}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>{subject.name}</span>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    answered === total ? "bg-green-500/20 text-green-700" : "bg-muted"
                  )}>
                    {answered}/{total}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {subjects.map((subject) => (
            <TabsContent key={subject.id} value={subject.id} className="mt-0">
              <div className="grid lg:grid-cols-4 gap-4">
                {/* Question Navigator Panel */}
                <Card className="lg:col-span-1">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">
                      {subject.name} Questions
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {getAnsweredCount(subject.id)} of {subject.questions.length} answered
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-5 gap-2">
                      {subject.questions.map((q, idx) => {
                        const isAnswered = !!answers[q.id];
                        const isCurrent = currentQuestionIndex === idx && activeSubjectId === subject.id;
                        
                        return (
                          <button
                            key={q.id}
                            onClick={() => setCurrentQuestionIndex(idx)}
                            className={cn(
                              "w-9 h-9 rounded-lg text-sm font-medium transition-all flex items-center justify-center",
                              isCurrent && "ring-2 ring-primary ring-offset-2",
                              isAnswered 
                                ? "bg-green-500 text-white hover:bg-green-600" 
                                : "bg-muted hover:bg-muted/80 text-muted-foreground"
                            )}
                          >
                            {idx + 1}
                          </button>
                        );
                      })}
                    </div>
                    
                    <div className="mt-4 pt-4 border-t space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-4 h-4 rounded bg-green-500"></div>
                        <span>Answered</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-4 h-4 rounded bg-muted border"></div>
                        <span>Not Answered</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Question Display */}
                <Card className="lg:col-span-3">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        Question {currentQuestionIndex + 1}
                        {answers[currentQuestion.id] ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground" />
                        )}
                      </CardTitle>
                      <span className="text-sm text-muted-foreground">
                        {currentQuestionIndex + 1} of {activeSubject.questions.length}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <p className="text-lg leading-relaxed">{currentQuestion.question_text}</p>
                    
                    <RadioGroup
                      value={answers[currentQuestion.id] || ""}
                      onValueChange={(v) => handleAnswerChange(currentQuestion.id, v)}
                    >
                      {["A", "B", "C", "D"].map((opt) => (
                        <div
                          key={opt}
                          className={cn(
                            "border p-4 rounded-lg flex items-center gap-3 cursor-pointer transition-all",
                            answers[currentQuestion.id] === opt 
                              ? "border-primary bg-primary/5 ring-1 ring-primary" 
                              : "hover:bg-muted/50"
                          )}
                        >
                          <RadioGroupItem value={opt} id={`opt-${opt}`} />
                          <Label htmlFor={`opt-${opt}`} className="flex-1 cursor-pointer">
                            <span className="font-medium mr-2">{opt}.</span>
                            {currentQuestion[`option_${opt.toLowerCase()}` as keyof Question]}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>

                    {/* Navigation */}
                    <div className="flex justify-between pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
                        disabled={currentQuestionIndex === 0}
                      >
                        Previous
                      </Button>

                      <div className="flex gap-2">
                        {currentQuestionIndex < activeSubject.questions.length - 1 ? (
                          <Button onClick={() => setCurrentQuestionIndex((i) => i + 1)}>
                            Next
                          </Button>
                        ) : (
                          <Button 
                            onClick={() => handleSubmitExam(false)} 
                            disabled={submitting}
                            variant="default"
                          >
                            {submitting ? "Submitting..." : "Submit Exam"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default TakeMockExam;
