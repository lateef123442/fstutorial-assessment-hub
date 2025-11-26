// ./student/Mock.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface MockProps {
  studentId: string;
}

const Mock: React.FC<MockProps> = ({ studentId }) => {
  const [mockExams, setMockExams] = useState<any[]>([]);

  useEffect(() => {
    const fetchMockExams = async () => {
      const { data, error } = await supabase
        .from("mock_exams")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Failed to load mock exams");
      } else {
        setMockExams(data || []);
      }
    };

    fetchMockExams();
  }, []);

  const takeMockExam = (mockExamId: string) => {
    // Implement logic to start the mock exam, e.g., navigate to a take exam page
    toast.info("Taking mock exam... (implement navigation here)");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Mock Exams</h2>
      {mockExams.length === 0 ? (
        <p>No mock exams available.</p>
      ) : (
        <div className="grid gap-4">
          {mockExams.map((exam) => (
            <Card key={exam.id}>
              <CardHeader>
                <CardTitle>{exam.title}</CardTitle>
                <CardDescription>
                  Duration: {exam.total_duration_minutes} minutes | Passing Score: {exam.passing_score}%
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => takeMockExam(exam.id)}>Take Exam</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Mock;
