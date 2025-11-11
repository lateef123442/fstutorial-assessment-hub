import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ManageSubjects = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [assignData, setAssignData] = useState({
    teacherId: "",
    subjectId: "",
  });

  useEffect(() => {
    fetchSubjects();
    fetchTeachers();
  }, []);

  const fetchSubjects = async () => {
    const { data, error } = await supabase.from("subjects").select("*");
    if (!error && data) setSubjects(data);
    setLoading(false);
  };

  const fetchTeachers = async () => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("user_id, profiles(full_name, email)")
      .eq("role", "teacher");
    
    if (error) {
      console.error("Error fetching teachers:", error);
    } else if (data) {
      console.log("Teachers fetched:", data);
      setTeachers(data);
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("subjects").insert(formData);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Subject added successfully!");
      setFormData({ name: "", description: "" });
      fetchSubjects();
    }
  };

  const handleAssignTeacher = async () => {
    if (!assignData.teacherId || !assignData.subjectId) {
      toast.error("Please select both teacher and subject");
      return;
    }

    const { error } = await supabase.from("teacher_subjects").insert({
      teacher_id: assignData.teacherId,
      subject_id: assignData.subjectId,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Teacher assigned successfully!");
      setAssignData({ teacherId: "", subjectId: "" });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Subject</CardTitle>
          <CardDescription>Create a new subject for assessments</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddSubject} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Subject Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <Button type="submit">
              <Plus className="w-4 h-4 mr-2" />
              Add Subject
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assign Teacher to Subject</CardTitle>
          <CardDescription>Allocate subjects to teachers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="select-teacher">Select Teacher</Label>
                <Select 
                  value={assignData.teacherId} 
                  onValueChange={(value) => {
                    console.log("Teacher selected:", value);
                    setAssignData({ ...assignData, teacherId: value });
                  }}
                >
                  <SelectTrigger id="select-teacher">
                    <SelectValue placeholder="Choose teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">No teachers available</div>
                    ) : (
                      teachers.map((teacher) => (
                        <SelectItem key={teacher.user_id} value={teacher.user_id}>
                          {teacher.profiles?.full_name || teacher.profiles?.email || "Unknown"}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="select-subject">Select Subject</Label>
                <Select 
                  value={assignData.subjectId} 
                  onValueChange={(value) => {
                    console.log("Subject selected:", value);
                    setAssignData({ ...assignData, subjectId: value });
                  }}
                >
                  <SelectTrigger id="select-subject">
                    <SelectValue placeholder="Choose subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">No subjects available</div>
                    ) : (
                      subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleAssignTeacher}>Assign Teacher</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Subjects</CardTitle>
          <CardDescription>Total: {subjects.length} subjects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {subjects.map((subject) => (
              <div key={subject.id} className="p-4 border rounded-lg">
                <p className="font-semibold">{subject.name}</p>
                <p className="text-sm text-muted-foreground">{subject.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManageSubjects;
