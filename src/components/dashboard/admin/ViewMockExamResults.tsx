import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Search, Filter } from "lucide-react";
import { toast } from "sonner";

interface MockExamResult {
  id: string;
  student_id: string;
  mock_exam_id: string;
  total_score: number;
  total_questions: number;
  is_completed: boolean;
  started_at: string;
  submitted_at: string | null;
  profiles: {
    full_name: string;
    email: string;
  };
  mock_exams: {
    title: string;
    scheduled_date: string;
  };
  subject_results: {
    subject_id: string;
    score: number;
    total_questions: number;
    subjects: {
      name: string;
    };
  }[];
}

const ViewMockExamResults = () => {
  const [results, setResults] = useState<MockExamResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<MockExamResult[]>([]);
  const [mockExams, setMockExams] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExam, setSelectedExam] = useState<string>("all");

  useEffect(() => {
    fetchResults();
    fetchMockExams();
  }, []);

  useEffect(() => {
    filterResults();
  }, [searchTerm, selectedExam, results]);

  const fetchMockExams = async () => {
    const { data } = await supabase
      .from("mock_exams")
      .select("id, title")
      .order("created_at", { ascending: false });
    
    if (data) setMockExams(data);
  };

  const fetchResults = async () => {
    try {
      const { data: attempts, error } = await supabase
        .from("mock_exam_attempts")
        .select(`
          id,
          student_id,
          mock_exam_id,
          total_score,
          total_questions,
          is_completed,
          started_at,
          submitted_at,
          profiles!mock_exam_attempts_student_id_fkey (
            full_name,
            email
          ),
          mock_exams (
            title,
            scheduled_date
          )
        `)
        .order("started_at", { ascending: false });

      if (error) throw error;

      // Fetch subject results for each attempt
      const resultsWithSubjects = await Promise.all(
        (attempts || []).map(async (attempt: any) => {
          const { data: subjectResults } = await supabase
            .from("mock_exam_subject_results")
            .select(`
              subject_id,
              score,
              total_questions,
              subjects (
                name
              )
            `)
            .eq("attempt_id", attempt.id);

          return {
            ...attempt,
            profiles: attempt.profiles || { full_name: "Unknown", email: "" },
            mock_exams: attempt.mock_exams || { title: "Unknown", scheduled_date: "" },
            subject_results: subjectResults || [],
          };
        })
      );

      setResults(resultsWithSubjects as MockExamResult[]);
    } catch (err) {
      console.error("Error fetching results:", err);
      toast.error("Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  const filterResults = () => {
    let filtered = [...results];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.profiles?.full_name?.toLowerCase().includes(search) ||
          r.profiles?.email?.toLowerCase().includes(search)
      );
    }

    if (selectedExam !== "all") {
      filtered = filtered.filter((r) => r.mock_exam_id === selectedExam);
    }

    setFilteredResults(filtered);
  };

  const exportToCSV = () => {
    const headers = ["Student Name", "Email", "Mock Exam", "Score", "Total Questions", "Percentage", "Status", "Date"];
    
    const rows = filteredResults.map((r) => {
      const percentage = r.total_questions > 0 ? Math.round((r.total_score / r.total_questions) * 100) : 0;
      return [
        r.profiles?.full_name || "Unknown",
        r.profiles?.email || "",
        r.mock_exams?.title || "Unknown",
        r.total_score || 0,
        r.total_questions || 0,
        `${percentage}%`,
        r.is_completed ? "Completed" : "In Progress",
        r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : "N/A",
      ];
    });

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mock_exam_results_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Results exported successfully");
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return <div className="p-4">Loading results...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Mock Exam Results</CardTitle>
              <CardDescription>View all student mock exam attempts and scores</CardDescription>
            </div>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by student name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedExam} onValueChange={setSelectedExam}>
              <SelectTrigger className="w-full md:w-[250px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by exam" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exams</SelectItem>
                {mockExams.map((exam) => (
                  <SelectItem key={exam.id} value={exam.id}>
                    {exam.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Results Table */}
          {filteredResults.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No results found</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Mock Exam</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Subject Breakdown</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.map((result) => {
                    const percentage = result.total_questions > 0 
                      ? Math.round((result.total_score / result.total_questions) * 100) 
                      : 0;
                    
                    return (
                      <TableRow key={result.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{result.profiles?.full_name || "Unknown"}</p>
                            <p className="text-sm text-muted-foreground">{result.profiles?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{result.mock_exams?.title || "Unknown"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${percentage >= 50 ? "text-green-600" : "text-red-600"}`}>
                              {result.total_score}/{result.total_questions}
                            </span>
                            <Badge variant={percentage >= 50 ? "default" : "destructive"}>
                              {percentage}%
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-1">
                            {result.subject_results?.map((sr: any) => (
                              <div key={sr.subject_id} className="flex justify-between gap-4">
                                <span>{sr.subjects?.name || "Unknown"}</span>
                                <span className="text-muted-foreground">
                                  {sr.score}/{sr.total_questions}
                                </span>
                              </div>
                            ))}
                            {(!result.subject_results || result.subject_results.length === 0) && (
                              <span className="text-muted-foreground">No data</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={result.is_completed ? "default" : "secondary"}>
                            {result.is_completed ? "Completed" : "In Progress"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(result.submitted_at || result.started_at)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          
          <p className="text-sm text-muted-foreground mt-4">
            Showing {filteredResults.length} of {results.length} results
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ViewMockExamResults;
