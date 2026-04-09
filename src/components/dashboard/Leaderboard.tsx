import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal, Award } from "lucide-react";

interface LeaderboardEntry {
  student_id: string;
  full_name: string;
  total_score: number;
  total_questions: number;
  attempts_count: number;
  percentage: number;
}

const Leaderboard = () => {
  const [view, setView] = useState<string>("assessments");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [view]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      if (view === "assessments") {
        // Regular assessment attempts
        const { data, error } = await supabase
          .from("attempts")
          .select("student_id, score, total_questions, profiles:student_id(full_name)")
          .not("score", "is", null)
          .not("submitted_at", "is", null);

        if (error) throw error;

        const map = new Map<string, { name: string; score: number; total: number; count: number }>();
        (data || []).forEach((a: any) => {
          const id = a.student_id;
          const name = a.profiles?.full_name || "Unknown";
          const existing = map.get(id) || { name, score: 0, total: 0, count: 0 };
          existing.score += a.score || 0;
          existing.total += a.total_questions || 0;
          existing.count += 1;
          map.set(id, existing);
        });

        const list: LeaderboardEntry[] = Array.from(map.entries()).map(([id, v]) => ({
          student_id: id,
          full_name: v.name,
          total_score: v.score,
          total_questions: v.total,
          attempts_count: v.count,
          percentage: v.total > 0 ? Math.round((v.score / v.total) * 100) : 0,
        }));

        list.sort((a, b) => b.percentage - a.percentage || b.total_score - a.total_score);
        setEntries(list);
      } else {
        // Mock exam attempts
        const { data, error } = await supabase
          .from("mock_exam_attempts")
          .select("student_id, total_score, total_questions, profiles:student_id(full_name)")
          .eq("is_completed", true);

        if (error) throw error;

        const map = new Map<string, { name: string; score: number; total: number; count: number }>();
        (data || []).forEach((a: any) => {
          const id = a.student_id;
          const name = a.profiles?.full_name || "Unknown";
          const existing = map.get(id) || { name, score: 0, total: 0, count: 0 };
          existing.score += a.total_score || 0;
          existing.total += a.total_questions || 0;
          existing.count += 1;
          map.set(id, existing);
        });

        const list: LeaderboardEntry[] = Array.from(map.entries()).map(([id, v]) => ({
          student_id: id,
          full_name: v.name,
          total_score: v.score,
          total_questions: v.total,
          attempts_count: v.count,
          percentage: v.total > 0 ? Math.round((v.score / v.total) * 100) : 0,
        }));

        list.sort((a, b) => b.percentage - a.percentage || b.total_score - a.total_score);
        setEntries(list);
      }
    } catch (error) {
      console.error("Failed to load leaderboard:", error);
    }
    setLoading(false);
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">{index + 1}</span>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Leaderboard
            </CardTitle>
            <CardDescription>Top performing students</CardDescription>
          </div>
          <Select value={view} onValueChange={setView}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="assessments">Assessments</SelectItem>
              <SelectItem value="mocks">Mock Exams</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No data yet.</p>
        ) : (
          <div className="space-y-2">
            {entries.slice(0, 20).map((entry, idx) => (
              <div
                key={entry.student_id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  idx < 3 ? "bg-primary/5 border-primary/20" : ""
                }`}
              >
                <div className="flex-shrink-0">{getRankIcon(idx)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{entry.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.attempts_count} attempt{entry.attempts_count !== 1 ? "s" : ""} · {entry.total_score}/{entry.total_questions} correct
                  </p>
                </div>
                <Badge variant={entry.percentage >= 70 ? "default" : entry.percentage >= 50 ? "secondary" : "destructive"}>
                  {entry.percentage}%
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Leaderboard;
