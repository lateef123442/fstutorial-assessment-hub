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

const TakeMockExam = () => {
  const { mockExamId } = useParams();
  const navigate = useNavigate();

  const [mockExam, setMockExam] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [currentSubjectIndex, setCurrentSubjectIndex] = useState(0);
  const [attempts, setAttempts] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ============================================
  // LOAD MOCK EXAM + SUBJECTS + QUESTIONS
  // ============================================

  const loadMockExam = async () => {
    console.log("Loading mock exam with ID:", mockExamId);
    try {
      // Fetch mock exam
      const { data: mock, error: mockError } = await supabase
        .from("mock_exam")
        .select("id, title, total_duration_minutes, passing_score, created_by")
        .eq("id", mockExamId)
        .single();

      console.log("Mock exam query result - data:", mock, "error:", mockError);

      if (mockError || !mock) {
        console.error("Mock exam fetch failed:", mockError);
        toast.error("Mock exam not found");
        navigate("/dashboard");
        return;
      }

      // Fetch a default subject (first one available)
      const { data: subjectData, error: subjectError } = await supabase
        .from("subjects")
        .select("id, name")
        .limit(1)
        .single();

      console.log("Subjects query result - data:", subjectData, "error:", subjectError);

      if (subjectError || !subjectData) {
        console.error("No subjects available:", subjectError);
        toast.error("No subjects configured for this exam");
        navigate("/dashboard");
        return;
      }

      // Fetch questions (without subject_id filter, since it doesn't exist)
      const { data: questions, error: questionsError } = await supabase
        .from("questions")
        .select("id, question_text, correct_answer, option_a, option_b, option_c, option_d")
        .limit(50);  // Limit to avoid loading too many; adjust as needed

      console.log("Questions query result - data:", questions, "error:", questionsError);

      if (questionsError) {
        console.error("Questions fetch failed:", questionsError);
        toast.error("Failed to load questions");
        navigate("/dashboard");
        return;
      }

      // Attach questions to the subject
      const subjectWithQuestions = { ...subjectData, questions: questions || [] };

      // Fetch profiles separately (if needed for email)
      let profileData = null;
      if (mock.created_by) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", mock.created_by)
          .single();

        if (profileError) {
          console.warn("Profiles fetch failed:", profileError);
        } else {
          profileData = profile;
        }
      }

         // Check if student already attempted this mock exam
   const { data: { user }, error: userError } = await supabase.auth.getUser();
   if (userError || !user) {
     console.error("User not authenticated:", userError);
     toast.error("You must be logged in");
     navigate("/dashboard");
     return;
   }

   console.log("User ID:", user.id, "Mock Exam ID:", mockExamId);

   const { data: existingAttempts, error: attemptError } = await supabase
     .from("attempts")  // Ensure this is 'attempts', not 'mock_exam_assessments'
     .select("id")
     .eq("assessment_id", mockExamId)
     .eq("student_id", user.id)
     .not("submitted_at", "is", null);

   console.log("Attempt check - data:", existingAttempts, "error:", attemptError);

   if (attemptError) {
     console.error("Attempt query failed:", attemptError);
     toast.error("Failed to verify attempt history");
     navigate("/dashboard");
     return;
   }

   if (existingAttempts.length > 0) {
     toast.error("You have already completed this mock exam");
     navigate("/dashboard");
     return;
   }
   

      // Set mock exam (attach profile if fetched)
      setMockExam({ ...mock, profiles: profileData });

      // Set subjects (with questions attached)
      setSubjects([subjectWithQuestions]);

      // Set duration (total for mock exam)
      setTimeRemaining(mock.total_duration_minutes * 60);

      setLoading(false);

    } catch (err) {
      console.error("Load mock exam error:", err);
      toast.error("Failed to load mock exam");
      navigate("/dashboard");
    }
  };

  useEffect(() => {
    if (!mockExamId) {
      toast.error("Invalid mock exam link");
      navigate("/dashboard");
      return;
    }
    loadMockExam();
  }, [mockExamId]);

  // ============================================
  // TIMER
  // ============================================

  useEffect(() => {
    if (!mockExam) return;

    if (timeRemaining <= 0) {
      handleSubmit(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((t) => Math.max(t - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, mockExam]);

  // ============================================
  // AUTO-SUBMIT ON LEAVING TAB
  // ============================================

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

  // ============================================
  // SUBMIT (OVERALL MOCK EXAM)
  // ============================================

  const handleSubmit = async (autoSubmitted = false) => {
    if (submitting) return;
    setSubmitting(true);

    try {
      // Calculate overall results from all attempts
      let totalCorrect = 0;
      let totalQuestions = 0;

      for (const subject of subjects) {
        const attemptId = attempts[subject.id];
        if (attemptId) {
          const { data: attempt, error } = await supabase
            .from("mock_exam_assessments")  // Updated table name
            .select("score, total_questions")
            .eq("id", attemptId)
            .single();
          if (!error && attempt) {
            totalCorrect += attempt.score || 0;
            totalQuestions += attempt.total_questions || 0;
          }
        }
      }

      const passed = totalCorrect >= (mockExam?.passing_score || 0);

      // Send result email (safe with fetched profiles data)
      const percentage = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
      if (mockExam?.profiles?.email) {
        notifyUserAction(
          mockExam.profiles.email,
          mockExam.profiles.full_name,
          "results_available",
          `Mock Exam: You scored ${totalCorrect}/${totalQuestions} (${percentage}%).`
        );
      }

      toast.success("Mock Exam Submitted!");
      navigate("/dashboard");

    } catch (err) {
      console.error(err);
      toast.error("Failed to submit mock exam");
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // HELPER FUNCTION FOR TIME FORMATTING
  // ============================================

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ============================================
  // UI
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  const currentSubject = subjects[currentSubjectIndex];
  const overallProgress = ((currentSubjectIndex + 1) / subjects.length) * 100;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex justify-between">
              <div>
                <CardTitle>{mockExam.title} - {currentSubject?.name}</CardTitle>
                <CardDescription>
                  Subject {currentSubjectIndex + 1} of {subjects.length}
                </CardDescription>
              </div>

              <div className="flex items-center gap-2 font-bold">
                <Clock className="w-5 h-5" />
                {formatTime(timeRemaining)}
              </div>
            </div>
            <Progress value={overallProgress} className="mt-3" />
          </CardHeader>
        </Card>

        <SubjectAssessment
          subjectData={currentSubject}
          mockExamId={mockExamId}
          timeRemaining={timeRemaining}
          onComplete={() => {
            if (currentSubjectIndex < subjects.length - 1) {
              setCurrentSubjectIndex((i) => i + 1);
            } else {
              handleSubmit(false);
            }
          }}
          onAttemptCreated={(attemptId) => {
            setAttempts((prev) => ({ ...prev, [currentSubject.id]: attemptId }));
          }}
        />

        <div className="flex justify-between mt-6">
          <Button
            onClick={() => setCurrentSubjectIndex((i) => Math.max(0, i - 1))}
            disabled={currentSubjectIndex === 0}
            variant="outline"
          >
            <ChevronLeft /> Previous Subject
          </Button>

          {currentSubjectIndex < subjects.length - 1 ? (
            <Button onClick={() => setCurrentSubjectIndex((i) => i + 1)}>
              Next Subject <ChevronRight />
            </Button>
          ) : (
            <Button onClick={() => handleSubmit(false)} disabled={submitting}>
              Submit Mock Exam
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// Sub-component for each subject assessment (inlined)
const SubjectAssessment = ({ subjectData, mockExamId, timeRemaining, onComplete, onAttemptCreated }) => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [attemptId, setAttemptId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Load questions from subject data
  useEffect(() => {
    if (subjectData && subjectData.questions) {
      setQuestions(subjectData.questions);
      setLoading(false);
    }
  }, [subjectData]);

  // Create attempt when questions load
  useEffect(() => {
    const createAttempt = async () => {
      if (questions.length > 0 && mockExamId) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data: attempt, error } = await supabase
            .from("mock_exam_assessments")  // Updated table name
            .insert({
              student_id: user.id,
              assessment_id: mockExamId,
              started_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (!error && attempt) {
            setAttemptId(attempt.id);
            onAttemptCreated(attempt.id);
          }
        } catch (err) {
          console.error("Failed to create attempt:", err);
          toast.error("Failed to start assessment");
        }
      }
    };
    createAttempt();
  }, [questions, mockExamId]);

  // Auto-submit if overall time expires
  useEffect(() => {
    if (timeRemaining <= 0) {
      handleSubmit(true);
    }
  }, [timeRemaining]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (autoSubmitted = false) => {
    if (submitting || !attemptId) return;
    setSubmitting(true);

    try {
      let correct = 0;
      const totalQuestions = questions.length;

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

      const passed = correct >= 50;  // Example passing score

      const { error: updateErr } = await supabase
        .from("mock_exam_assessments")  // Updated table name
        .update({
          score: correct,
          total_questions: totalQuestions,
          passes: passed,
          submitted_at: new Date().toISOString(),
          auto_submitted: autoSubmitted,
        })
        .eq("id", attemptId);

      if (updateErr) {
        toast.error("Submission blocked by RLS policy");
        return;
      }

      onComplete();

    } catch (err) {
      console.error(err);
      toast.error("Failed to submit subject");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading questions...
      </div>
    );
  }

  const q = questions[currentQuestionIndex];

  return (
    <>
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
            Submit Subject
          </Button>
        )}
      </div>
    </>
  );
};

export default TakeMockExam;
