import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { notifyUserAction } from "@/lib/emailNotifications";
import SubjectAssessment from "./SubjectAssessment";  // Import the extracted component

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
  // LOAD MOCK EXAM + SUBJECTS
  // ============================================

  const loadMockExam = async () => {
    try {
      // Get logged-in student
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error("You must be logged in to take this assessment");
        navigate("/dashboard");
        return;
      }

      // Fetch mock exam from "mock_exam" table with profiles join
      const { data: mock, error: mockError } = await supabase
        .from("mock_exam")
        .select(`
          *,
          profiles:created_by (email, full_name)  // Adjust 'created_by' to your actual FK column linking to profiles
        `)
        .eq("id", mockExamId)
        .single();

      if (mockError || !mock) {
        toast.error("Mock exam not found");
        navigate("/dashboard");
        return;
      }

      // Check if student already attempted this mock exam
      const { data: existingAttempts, error: attemptError } = await supabase
        .from("attempts")
        .select("id")
        .eq("mock_exam_id", mockExamId)
        .eq("student_id", user.id)
        .not("submitted_at", "is", null);

      if (attemptError) {
        toast.error("Failed to verify attempt history");
        navigate("/dashboard");
        return;
      }

      if (existingAttempts.length > 0) {
        toast.error("You have already completed this mock exam");
        navigate("/dashboard");
        return;
      }

      // Set mock exam
      setMockExam(mock);

      // Set subjects from JSON field
      setSubjects(mock.subjects || []);

      // Set duration (total for mock exam)
      setTimeRemaining(mock.total_duration_minutes * 60);

      setLoading(false);

    } catch (err) {
      console.error(err);
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
    if (!mockExam || timeRemaining <= 0) {
      if (timeRemaining <= 0) handleSubmit(true);
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
        const attemptId = attempts[subject.assessmentId];  // Now consistent with onAttemptCreated
        if (attemptId) {
          const { data: attempt, error } = await supabase
            .from("attempts")
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

      // Send result email (now safe with joined profiles data)
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
                <CardTitle>{mockExam.title} - {currentSubject.subject}</CardTitle>
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
          mockExamId={mockExamId}  // Passed as prop
          timeRemaining={timeRemaining}  // Passed for auto-submit logic
          onComplete={() => {
            if (currentSubjectIndex < subjects.length - 1) {
              setCurrentSubjectIndex((i) => i + 1);
            } else {
              handleSubmit(false);
            }
          }}
          onAttemptCreated={(attemptId) => {
            setAttempts((prev) => ({ ...prev, [currentSubject.assessmentId]: attemptId }));  // Consistent key
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

export default TakeMockExam;
