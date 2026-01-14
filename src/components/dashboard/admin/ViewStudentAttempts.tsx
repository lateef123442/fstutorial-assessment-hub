import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, AlertTriangle, Search, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Attempt {
  id: string;
  score: number | null;
  total_questions: number | null;
  passed: boolean | null;
  violations: number | null;
  auto_submitted: boolean | null;
  started_at: string;
  submitted_at: string | null;
  assessments: {
    title: string;
    subjects: {
      name: string;
    };
  };
  profiles: {
    full_name: string;
    email: string;
  };
}

const ViewStudentAttempts = () => {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [filteredAttempts, setFilteredAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    loadAttempts();
  }, []);

  useEffect(() => {
    filterAttempts();
  }, [searchTerm, attempts]);

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
      setFilteredAttempts(data || []);
    } catch (error) {
      console.error("Error loading attempts:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterAttempts = () => {
    if (!searchTerm.trim()) {
      setFilteredAttempts(attempts);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = attempts.filter(
      (a) =>
        a.profiles?.full_name?.toLowerCase().includes(term) ||
        a.profiles?.email?.toLowerCase().includes(term) ||
        a.assessments?.title?.toLowerCase().includes(term) ||
        a.assessments?.subjects?.name?.toLowerCase().includes(term)
    );
    setFilteredAttempts(filtered);
  };

  const handleViewReview = (attemptId: string) => {
    navigate(`/assessment-review/${attemptId}`);
  };

  const exportToCSV = () => {
    const headers = ["Student", "Email", "Assessment", "Subject", "Score", "Percentage", "Status", "Violations", "Auto-submitted", "Date"];
    
    const csvData = filteredAttempts.map(attempt => {
      const percentage = attempt.score && attempt.total_questions 
        ? Math.round((attempt.score / attempt.total_questions) * 100) 
        : 0;
      return [
        attempt.profiles?.full_name || "N/A",
        attempt.profiles?.email || "N/A",
        attempt.assessments?.title || "N/A",
        attempt.assessments?.subjects?.name || "N/A",
        attempt.score !== null ? `${attempt.score}/${attempt.total_questions}` : "Not submitted",
        `${percentage}%`,
        attempt.passed ? "Passed" : attempt.submitted_at ? "Failed" : "In Progress",
        attempt.violations || 0,
        attempt.auto_submitted ? "Yes" : "No",
        new Date(attempt.started_at).toLocaleString()
      ].join(",");
    });

    const csvContent = [headers.join(","), ...csvData].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assessment-attempts-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  // Count violations summary
  const violationsSummary = attempts.reduce((acc, a) => {
    if ((a.violations || 0) > 0) acc.withViolations++;
    if (a.auto_submitted) acc.autoSubmitted++;
    return acc;
  }, { withViolations: 0, autoSubmitted: 0 });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Student Assessment Attempts</CardTitle>
            <CardDescription>View all student attempts and their performance</CardDescription>
          </div>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-muted p-3 rounded-lg text-center">
            <p className="text-2xl font-bold">{attempts.length}</p>
            <p className="text-sm text-muted-foreground">Total Attempts</p>
          </div>
          <div className="bg-destructive/10 p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-destructive">{violationsSummary.withViolations}</p>
            <p className="text-sm text-muted-foreground">With Violations</p>
          </div>
          <div className="bg-amber-100 dark:bg-amber-900/20 p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{violationsSummary.autoSubmitted}</p>
            <p className="text-sm text-muted-foreground">Auto-submitted</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by student, email, or assessment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
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
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttempts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No attempts found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAttempts.map((attempt) => {
                  const percentage = attempt.score && attempt.total_questions 
                    ? Math.round((attempt.score / attempt.total_questions) * 100) 
                    : 0;
                  
                  return (
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
                        {attempt.score !== null ? (
                          <div>
                            <span className="font-medium">{attempt.score}/{attempt.total_questions}</span>
                            <span className="text-sm text-muted-foreground ml-2">({percentage}%)</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Not submitted</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {attempt.submitted_at ? (
                          <div className="flex flex-col gap-1">
                            <Badge variant={attempt.passed ? "default" : "destructive"}>
                              {attempt.passed ? "Passed" : "Failed"}
                            </Badge>
                            {attempt.auto_submitted && (
                              <Badge variant="outline" className="text-amber-600 border-amber-600">
                                Auto-submitted
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <Badge variant="secondary">In Progress</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {(attempt.violations || 0) > 0 ? (
                          <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3" />
                            {attempt.violations} violation(s)
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(attempt.started_at).toLocaleDateString()}
                          <br />
                          <span className="text-muted-foreground">
                            {new Date(attempt.started_at).toLocaleTimeString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {attempt.submitted_at && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleViewReview(attempt.id)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="mt-4 text-sm text-muted-foreground">
          Showing {filteredAttempts.length} of {attempts.length} attempts
        </div>
      </CardContent>
    </Card>
  );
};

export default ViewStudentAttempts;
