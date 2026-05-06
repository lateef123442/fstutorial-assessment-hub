import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Trophy, Clock, BookOpen } from "lucide-react";

interface Props {
  studentId: string;
  classId: string | null;
}

interface Row {
  assessment_id: string;
  title: string;
  best_pct: number;
  attempts: number;
  time_spent_min: number;
}

const MyClassProgress = ({ studentId, classId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [totalAssessments, setTotalAssessments] = useState(0);

  useEffect(() => {
    if (!classId) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);

      const { data: assessments } = await supabase
        .from("assessments")
        .select("id, title")
        .eq("class_id", classId)
        .eq("is_active", true)
        .or("is_mock_exam.is.null,is_mock_exam.eq.false");

      const list = assessments || [];
      setTotalAssessments(list.length);

      if (list.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      const ids = list.map((a) => a.id);
      const { data: attempts } = await supabase
        .from("attempts")
        .select("assessment_id, score, total_questions, started_at, submitted_at")
        .eq("student_id", studentId)
        .in("assessment_id", ids)
        .not("submitted_at", "is", null);

      const map = new Map<string, Row>();
      list.forEach((a) =>
        map.set(a.id, {
          assessment_id: a.id,
          title: a.title,
          best_pct: 0,
          attempts: 0,
          time_spent_min: 0,
        }),
      );

      (attempts || []).forEach((at: any) => {
        const r = map.get(at.assessment_id);
        if (!r) return;
        r.attempts += 1;
        const pct =
          at.score && at.total_questions
            ? Math.round((at.score / at.total_questions) * 100)
            : 0;
        if (pct > r.best_pct) r.best_pct = pct;
        if (at.started_at && at.submitted_at) {
          const mins =
            (new Date(at.submitted_at).getTime() - new Date(at.started_at).getTime()) /
            60000;
          r.time_spent_min += Math.max(0, mins);
        }
      });

      setRows(Array.from(map.values()));
      setLoading(false);
    })();
  }, [studentId, classId]);

  if (!classId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Class Progress</CardTitle>
          <CardDescription>Assigned to a class to see your progress.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const completed = rows.filter((r) => r.attempts > 0).length;
  const avgBest =
    rows.length > 0
      ? Math.round(
          rows.reduce((s, r) => s + r.best_pct, 0) / Math.max(1, completed || 1),
        )
      : 0;
  const totalTime = Math.round(rows.reduce((s, r) => s + r.time_spent_min, 0));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="text-xl font-bold">
                {completed}/{totalAssessments}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg. Best Score</p>
              <p className="text-xl font-bold">{avgBest}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Time Spent</p>
              <p className="text-xl font-bold">{totalTime} min</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Per-Assessment Progress</CardTitle>
          <CardDescription>Best score, attempts, and total time per assessment in your class.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No assessments available for your class yet.
            </div>
          ) : (
            <div className="space-y-4">
              {rows.map((r) => (
                <div key={r.assessment_id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold truncate">{r.title}</p>
                    <span className="text-sm font-semibold">{r.best_pct}%</span>
                  </div>
                  <Progress value={r.best_pct} />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{r.attempts} attempt{r.attempts === 1 ? "" : "s"}</span>
                    <span>{Math.round(r.time_spent_min)} min spent</span>
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

export default MyClassProgress;
