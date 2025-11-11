import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";

interface MyResultsProps {
  studentId: string;
}

const MyResults = ({ studentId }: MyResultsProps) => {
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, [studentId]);

  const fetchResults = async () => {
    const { data, error } = await supabase
      .from("attempts")
      .select(`
        *,
        assessments(title, subjects(name))
      `)
      .eq("student_id", studentId)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false });

    if (!error && data) {
      setAttempts(data);
    }
    setLoading(false);
  };

  if (loading) {
    return <div>Loading...</div>;
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
            <p className="text-muted-foreground">No completed assessments yet.</p>
          ) : (
            <div className="space-y-4">
              {attempts.map((attempt) => {
                const percentage = ((attempt.score / attempt.total_questions) * 100).toFixed(0);
                
                return (
                  <div key={attempt.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold">{attempt.assessments.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {attempt.assessments.subjects.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {new Date(attempt.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
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
                    </div>
                    <div className="pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.location.href = `/assessment-review/${attempt.id}`}
                        className="w-full"
                      >
                        View Detailed Review
                      </Button>
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
