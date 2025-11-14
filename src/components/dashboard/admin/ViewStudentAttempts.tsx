import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const ViewStudentAttempts = () => {
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttempts();
  }, []);

  const loadAttempts = async () => {
    try {
      const { data, error } = await supabase
        .from("attempts")
        .select(`
          *,
          assessments (
            title,
            subjects (name)
          ),
          profiles!attempts_student_id_fkey (
            full_name,
            email
          )
        `)
        .order("started_at", { ascending: false });

      if (error) throw error;
      setAttempts(data || []);
    } catch (error) {
      console.error("Error loading attempts:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Assessment Attempts</CardTitle>
        <CardDescription>View all student attempts and their performance</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Assessment</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Violations</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attempts.map((attempt) => (
              <TableRow key={attempt.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{attempt.profiles?.full_name}</p>
                    <p className="text-sm text-muted-foreground">{attempt.profiles?.email}</p>
                  </div>
                </TableCell>
                <TableCell>{attempt.assessments?.title}</TableCell>
                <TableCell>{attempt.assessments?.subjects?.name}</TableCell>
                <TableCell>
                  {attempt.score !== null ? `${attempt.score}/${attempt.total_questions}` : "Not submitted"}
                </TableCell>
                <TableCell>
                  {attempt.submitted_at ? (
                    <>
                      <Badge variant={attempt.passed ? "default" : "destructive"}>
                        {attempt.passed ? "Passed" : "Failed"}
                      </Badge>
                      {attempt.auto_submitted && (
                        <Badge variant="outline" className="ml-2">Auto-submitted</Badge>
                      )}
                    </>
                  ) : (
                    <Badge variant="secondary">In Progress</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {attempt.violations > 0 && (
                    <Badge variant="destructive">{attempt.violations} violations</Badge>
                  )}
                </TableCell>
                <TableCell>{new Date(attempt.started_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ViewStudentAttempts;
