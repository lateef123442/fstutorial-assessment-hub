import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  /** Fetch all subjects */
  const fetchSubjects = async () => {
    const { data, error } = await supabase.from("subjects").select("*");
    if (error) {
      console.error("Error fetching subjects:", error);
      toast.error("Failed to load subjects");
    } else {
      setSubjects(data || []);
    }
    setLoading(false);
  };

  /** ✅ Fixed fetchTeachers to match ManageTeachers logic */
  const fetchTeachers = async () => {
    try {
      // 1️⃣ Get teacher user IDs
      const { data: teacherRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "teacher");

      if (rolesError) throw rolesError;

      if (!teacherRoles || teacherRoles.length === 0) {
        setTeachers([]);
        return;
      }

      // 2️⃣ Get profiles for those teachers
      const teacherIds = teacherRoles.map((t) => t.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", teacherIds);

      if (profilesError) throw profilesError;

      const combinedData =
        profiles?.map((profile) => ({
          user_id: profile.id,
          profiles: {
            full_name: profile.full_name,
            email: profile.email,
          },
        })) || [];

      setTeachers(combinedData);
      console.log("✅ Teachers loaded:", combinedData);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      toast.error("Failed to load teachers");
    }
  };

  /** Add new subject */
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

  /** Assign teacher to subject */
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
      {/* Add Subject */}
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
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
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

      {/* Assign Teacher */}
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
                  onValueChange={(value) =>
                    setAssignData({ ...assignData, teacherId: value })
                  }
                >
                  <SelectTrigger id="select-teacher">
                    <SelectValue placeholder="Choose teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No teachers available
                      </div>
                    ) : (
                      teachers.map((teacher) => (
                        <SelectItem
                          key={teacher.user_id}
                          value={teacher.user_id}
                        >
                          {teacher.profiles?.full_name ||
                            teacher.profiles?.email ||
                            "Unknown"}
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
                  onValueChange={(value) =>
                    setAssignData({ ...assignData, subjectId: value })
                  }
                >
                  <SelectTrigger id="select-subject">
                    <SelectValue placeholder="Choose subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No subjects available
                      </div>
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

      {/* All Subjects */}
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
                <p className="text-sm text-muted-foreground">
                  {subject.description}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManageSubjects;
