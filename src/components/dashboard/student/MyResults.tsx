import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Eye, AlertTriangle, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MyResultsProps {
  studentId: string;
}

interface Attempt {
  id: string;
  score: number | null;
  total_questions: number | null;
  passed: boolean | null;
  submitted_at: string | null;
  violations: number | null;
  auto_submitted: boolean | null;
  assessments: {
    title: string;
    subjects: {
      name: string;
    };
  };
}

const MyResults = ({ studentId }: MyResultsProps) => {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchResults();
  }, [studentId]);

  const fetchResults = async () => {
    try {
      const { data, error } = await supabase
        .from("attempts")
        .select(`
          id,
          score,
          total_questions,
          passed,
          submitted_at,
          violations,
          auto_submitted,
          assessments!inner(
            title,
            subjects!inner(name)
          )
        `)
        .eq("student_id", studentId)
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false });

      if (error) {
        console.error("Error fetching results:", error);
      } else {
        setAttempts(data || []);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewReview = (attemptId: string) => {
    navigate(`/assessment-review/${attemptId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Results</CardTitle>
          <CardDescription>View your assessment history and scores</CardDescription>
        </CardHeader>
        <CardContent>
          {attempts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No completed assessments yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Complete an assessment to see your results here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {attempts.map((attempt) => {
                const percentage = attempt.score && attempt.total_questions 
                  ? Math.round((attempt.score / attempt.total_questions) * 100) 
                  : 0;
                
                return (
                  <div key={attempt.id} className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-lg">{attempt.assessments.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {attempt.assessments.subjects.name}
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {new Date(attempt.submitted_at!).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      {attempt.auto_submitted && (
                        <Badge variant="outline" className="text-amber-600 border-amber-600">
                          Auto-submitted
                        </Badge>
                      )}
                      {(attempt.violations || 0) > 0 && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {attempt.violations} violation(s)
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="space-y-1">
                        <p className="text-sm">
                          Score: <span className="font-semibold">{attempt.score}/{attempt.total_questions}</span>
                        </p>
                        <p className="text-sm">
                          Percentage: <span className="font-semibold">{percentage}%</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {attempt.passed ? (
                            <>
                              <CheckCircle className="w-5 h-5 text-green-500" />
                              <span className="text-green-500 font-semibold">Passed</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-5 h-5 text-red-500" />
                              <span className="text-red-500 font-semibold">Failed</span>
                            </>
                          )}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleViewReview(attempt.id)}
                          className="flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View Corrections
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyResults;
