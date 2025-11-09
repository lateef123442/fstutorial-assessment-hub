import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
              {attempts.map((attempt) => (
                <div key={attempt.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{attempt.assessments?.title}</h3>
                      <p className="text-sm text-muted-foreground">{attempt.assessments?.subjects?.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Submitted: {new Date(attempt.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {attempt.score}/{attempt.total_questions}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {Math.round((attempt.score / attempt.total_questions) * 100)}%
                      </div>
                      <div className={`flex items-center gap-1 mt-1 ${attempt.passed ? 'text-success' : 'text-destructive'}`}>
                        {attempt.passed ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm font-semibold">Passed</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" />
                            <span className="text-sm font-semibold">Failed</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyResults;
