import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, FileText, Download, Trash2, BookOpen } from "lucide-react";

const ALLOWED = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/webm", "video/quicktime",
];
const MAX_BYTES = 100 * 1024 * 1024; // 100 MB

interface Props {
  userId: string;
  /** "student" => only my class (read-only). "teacher" => assigned classes (upload). "admin" => all classes. */
  mode: "student" | "teacher" | "admin";
}

interface ClassOpt { id: string; name: string; }

interface Material {
  id: string;
  class_id: string;
  uploaded_by: string;
  title: string;
  description: string | null;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

const formatSize = (b: number | null) => {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

const ClassMaterials = ({ userId, mode }: Props) => {
  const [classes, setClasses] = useState<ClassOpt[]>([]);
  const [activeClass, setActiveClass] = useState<string>("");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    const load = async () => {
      if (mode === "student") {
        const { data: profile } = await supabase
          .from("profiles").select("class_id, classes(id, name)").eq("id", userId).maybeSingle();
        const cls: any = (profile as any)?.classes;
        if (cls) {
          setClasses([cls]);
          setActiveClass(cls.id);
        }
      } else if (mode === "teacher") {
        const { data } = await supabase
          .from("teacher_classes").select("classes(id, name)").eq("teacher_id", userId);
        const list = (data || []).map((r: any) => r.classes).filter(Boolean);
        setClasses(list);
        if (list[0]) setActiveClass(list[0].id);
      } else {
        const { data } = await supabase.from("classes").select("id, name").order("name");
        setClasses(data || []);
        if (data?.[0]) setActiveClass(data[0].id);
      }
    };
    load();
  }, [userId, mode]);

  useEffect(() => { if (activeClass) fetchMaterials(); }, [activeClass]);

  const fetchMaterials = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("class_materials")
      .select("*")
      .eq("class_id", activeClass)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setMaterials((data as any) || []);
    setLoading(false);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim() || !activeClass) return;
    if (!ALLOWED.includes(file.type)) {
      toast.error("File type not allowed. Use PDF, Office docs, images, or videos.");
      return;
    }
    if (file.size > MAX_BYTES) { toast.error("Max file size is 100 MB"); return; }

    setUploading(true);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${activeClass}/${Date.now()}_${safe}`;
      const { error: upErr } = await supabase.storage
        .from("class-materials").upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("class_materials").insert({
        class_id: activeClass,
        uploaded_by: userId,
        title: title.trim(),
        description: description.trim() || null,
        file_path: path,
        file_type: file.type,
        file_size: file.size,
      });
      if (insErr) {
        await supabase.storage.from("class-materials").remove([path]);
        throw insErr;
      }
      toast.success("Material uploaded");
      setTitle(""); setDescription(""); setFile(null);
      const input = document.getElementById("material-file") as HTMLInputElement | null;
      if (input) input.value = "";
      fetchMaterials();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (m: Material) => {
    const { data, error } = await supabase.storage
      .from("class-materials").createSignedUrl(m.file_path, 60);
    if (error || !data) { toast.error("Could not get download link"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async (m: Material) => {
    if (!confirm(`Delete "${m.title}"?`)) return;
    await supabase.storage.from("class-materials").remove([m.file_path]);
    const { error } = await supabase.from("class_materials").delete().eq("id", m.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    fetchMaterials();
  };

  const canUpload = mode !== "student";

  return (
    <div className="space-y-6">
      {classes.length > 1 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Class</CardTitle></CardHeader>
          <CardContent>
            <select
              value={activeClass}
              onChange={(e) => setActiveClass(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </CardContent>
        </Card>
      )}

      {classes.length === 0 && (
        <Card><CardContent className="py-8 text-center text-muted-foreground">
          {mode === "student" ? "You are not assigned to a class." : "No classes available."}
        </CardContent></Card>
      )}

      {canUpload && activeClass && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5" />Upload Material</CardTitle>
            <CardDescription>PDFs, Word, PowerPoint, Excel, images, and videos (max 100 MB)</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-3">
              <div>
                <Label htmlFor="material-title">Title</Label>
                <Input id="material-title" value={title} onChange={e => setTitle(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="material-desc">Description (optional)</Label>
                <Textarea id="material-desc" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
              </div>
              <div>
                <Label htmlFor="material-file">File</Label>
                <Input id="material-file" type="file" accept={ALLOWED.join(",")}
                  onChange={e => setFile(e.target.files?.[0] || null)} required />
              </div>
              <Button type="submit" disabled={uploading || !file}>
                <Upload className="w-4 h-4 mr-2" />{uploading ? "Uploading..." : "Upload"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {activeClass && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5" />Class Materials</CardTitle>
            <CardDescription>{materials.length} file(s)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <p>Loading...</p> : materials.length === 0 ? (
              <p className="text-muted-foreground">No materials uploaded yet.</p>
            ) : (
              <div className="space-y-2">
                {materials.map(m => (
                  <div key={m.id} className="p-3 border rounded-lg flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <FileText className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{m.title}</p>
                        {m.description && <p className="text-sm text-muted-foreground">{m.description}</p>}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatSize(m.file_size)} • {new Date(m.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => handleDownload(m)}>
                        <Download className="w-4 h-4" />
                      </Button>
                      {(mode === "admin" || m.uploaded_by === userId) && (
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(m)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClassMaterials;
