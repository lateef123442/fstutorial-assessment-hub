import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, School } from "lucide-react";

interface TeacherRow {
  user_id: string;
  full_name: string;
  email: string;
  class_ids: string[];
}

const ManageClassAllocation = () => {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [{ data: roles }, { data: classData }] = await Promise.all([
        supabase.from("user_roles").select("user_id").eq("role", "teacher"),
        supabase.from("classes").select("id, name").order("name"),
      ]);
      setClasses(classData || []);

      const ids = (roles || []).map((r) => r.user_id);
      if (ids.length === 0) {
        setTeachers([]);
        return;
      }
      const [{ data: profiles }, { data: tcs }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email").in("id", ids),
        supabase.from("teacher_classes").select("teacher_id, class_id").in("teacher_id", ids),
      ]);

      const rows: TeacherRow[] = (profiles || []).map((p: any) => ({
        user_id: p.id,
        full_name: p.full_name,
        email: p.email,
        class_ids: (tcs || []).filter((t: any) => t.teacher_id === p.id).map((t: any) => t.class_id),
      }));
      setTeachers(rows);
    } catch (e: any) {
      toast.error(e.message || "Failed to load class allocation");
    } finally {
      setLoading(false);
    }
  };

  const toggle = async (teacherId: string, classId: string, assigned: boolean) => {
    if (assigned) {
      const { error } = await supabase
        .from("teacher_classes")
        .delete()
        .eq("teacher_id", teacherId)
        .eq("class_id", classId);
      if (error) return toast.error(error.message);
      toast.success("Class removed");
    } else {
      const { error } = await supabase
        .from("teacher_classes")
        .insert({ teacher_id: teacherId, class_id: classId });
      if (error) return toast.error(error.message);
      toast.success("Class allocated");
    }
    fetchAll();
  };

  const filtered = teachers.filter((t) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return t.full_name?.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <School className="w-5 h-5 text-primary" />
            <div>
              <CardTitle>Class Allocation</CardTitle>
              <CardDescription>
                Allocate, remove, and edit which classes each teacher can manage.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teachers by name or email…"
              className="pl-9"
            />
          </div>

          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground">No teachers found.</p>
          ) : classes.length === 0 ? (
            <p className="text-muted-foreground">
              No classes exist yet. Create classes first under "Classes".
            </p>
          ) : (
            <div className="space-y-4">
              {filtered.map((t) => (
                <div key={t.user_id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-semibold">{t.full_name}</p>
                      <p className="text-xs text-muted-foreground">{t.email}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {t.class_ids.length} / {classes.length} allocated
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Allocated Classes
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {t.class_ids.length === 0 && (
                          <span className="text-xs italic text-muted-foreground">
                            None allocated yet
                          </span>
                        )}
                        {t.class_ids.map((cid) => {
                          const c = classes.find((x) => x.id === cid);
                          return (
                            <span
                              key={cid}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded-md text-xs"
                            >
                              {c?.name || "Class"}
                              <button
                                type="button"
                                aria-label="Remove class"
                                onClick={() => toggle(t.user_id, cid, true)}
                                className="ml-1 rounded-full hover:bg-primary-foreground/20 px-1"
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Allocate a Class
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {classes
                          .filter((c) => !t.class_ids.includes(c.id))
                          .map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => toggle(t.user_id, c.id, false)}
                              className="px-2 py-1 rounded-md text-xs border border-dashed border-input bg-background hover:bg-muted transition-colors"
                            >
                              + {c.name}
                            </button>
                          ))}
                        {classes.every((c) => t.class_ids.includes(c.id)) && (
                          <span className="text-xs italic text-muted-foreground">
                            All classes allocated
                          </span>
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

export default ManageClassAllocation;
