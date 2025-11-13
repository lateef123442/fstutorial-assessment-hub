import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Clock, CheckCircle, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

interface MyAssessmentsProps {
  teacherId: string;
}

const MyAssessments = ({ teacherId }: MyAssessmentsProps) => {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ title: "", duration_minutes: 0, passing_score: 0 });

  useEffect(() => {
    fetchAssessments();
  }, [teacherId]);

  const fetchAssessments = async () => {
    const { data, error } = await supabase
      .from("assessments")
      .select(`
        *,
        subjects(name),
        questions(count)
      `)
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setAssessments(data);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this assessment? This will also delete all questions and attempts.")) {
      const { error } = await supabase.from("assessments").delete().eq("id", id);
      
      if (error) {
        toast.error("Failed to delete assessment");
      } else {
        toast.success("Assessment deleted successfully");
        fetchAssessments();
      }
    }
  };

  const handleEdit = (assessment: any) => {
    setEditingId(assessment.id);
    setEditData({
      title: assessment.title,
      duration_minutes: assessment.duration_minutes,
      passing_score: assessment.passing_score
    });
  };

  const handleSaveEdit = async (id: string) => {
    const { error } = await supabase
      .from("assessments")
      .update(editData)
      .eq("id", id);

    if (error) {
      toast.error("Failed to update assessment");
    } else {
      toast.success("Assessment updated successfully");
      setEditingId(null);
      fetchAssessments();
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Assessments</CardTitle>
          <CardDescription>All assessments you've created</CardDescription>
        </CardHeader>
        <CardContent>
          {assessments.length === 0 ? (
            <p className="text-muted-foreground">No assessments yet. Create your first assessment!</p>
          ) : (
            <div className="space-y-4">
              {assessments.map((assessment) => (
                <div key={assessment.id} className="border rounded-lg p-4">
                  {editingId === assessment.id ? (
                    <div className="space-y-4">
                      <Input
                        value={editData.title}
                        onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                        placeholder="Assessment Title"
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          type="number"
                          value={editData.duration_minutes}
                          onChange={(e) => setEditData({ ...editData, duration_minutes: parseInt(e.target.value) })}
                          placeholder="Duration (mins)"
                        />
                        <Input
                          type="number"
                          value={editData.passing_score}
                          onChange={(e) => setEditData({ ...editData, passing_score: parseInt(e.target.value) })}
                          placeholder="Passing Score (%)"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveEdit(assessment.id)}>Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{assessment.title}</h3>
                        <p className="text-sm text-muted-foreground">{assessment.subjects?.name}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {assessment.duration_minutes} mins
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            {assessment.questions?.length || 0} questions
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            Pass: {assessment.passing_score}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`px-3 py-1 rounded-full text-sm ${assessment.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                          {assessment.is_active ? 'Active' : 'Inactive'}
                        </div>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(assessment)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(assessment.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyAssessments;
