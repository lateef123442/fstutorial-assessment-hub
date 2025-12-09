import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, RefreshCw, Eye, ChevronDown, ChevronUp, Shuffle } from "lucide-react";
import { notifyUserAction } from "@/lib/emailNotifications";
import { User } from "@supabase/supabase-js";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Subject {
  id: string;
  name: string;
  questionCount: number;
}

interface SelectedSubject {
  subjectId: string;
  subjectName: string;
  questionCount: number;
  selectedCount: number;
}

interface PreviewQuestion {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
}

interface PreviewData {
  [subjectId: string]: PreviewQuestion[];
}

const CreateMockFromExisting = () => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    scheduled_date: "",
    scheduled_time: "",
    duration_per_subject_minutes: 45,
    total_duration_minutes: 180,
    marks_per_question: 1,
    is_active: true,
  });

  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<SelectedSubject[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData>({});
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [expandedSubjects, setExpandedSubjects] = useState<string[]>([]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        toast.error("Please log in");
        return;
      }
      setUser(user);

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!roleData || roleData.role !== "admin") {
        toast.error("Only admins can create mock exams");
        setIsAdmin(false);
      } else {
        setIsAdmin(true);
      }
    };
    getUser();
  }, []);

  const fetchSubjectsWithQuestions = async () => {
    setIsLoading(true);
    try {
      const { data: subjects, error: subjectsError } = await supabase
        .from("subjects")
        .select("id, name");

      if (subjectsError) throw subjectsError;

      const subjectsWithCounts: Subject[] = [];
      
      for (const subject of subjects || []) {
        const { data: assessments } = await supabase
          .from("assessments")
          .select("id")
          .eq("subject_id", subject.id)
          .eq("is_mock_exam", false);

        if (assessments && assessments.length > 0) {
          const assessmentIds = assessments.map(a => a.id);
          const { count } = await supabase
            .from("questions")
            .select("id", { count: "exact", head: true })
            .in("assessment_id", assessmentIds);

          subjectsWithCounts.push({
            id: subject.id,
            name: subject.name,
            questionCount: count || 0,
          });
        } else {
          subjectsWithCounts.push({
            id: subject.id,
            name: subject.name,
            questionCount: 0,
          });
        }
      }

      setAvailableSubjects(subjectsWithCounts);
    } catch (error: any) {
      toast.error("Failed to load subjects: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjectsWithQuestions();
  }, []);

  const handleSubjectSelection = (subjectId: string, checked: boolean) => {
    if (checked) {
      if (selectedSubjects.length >= 4) {
        toast.error("Maximum of 4 subjects allowed per mock exam");
        return;
      }
      const subject = availableSubjects.find(s => s.id === subjectId);
      if (subject) {
        if (subject.questionCount < 4) {
          toast.error(`${subject.name} has only ${subject.questionCount} questions. Minimum 4 required.`);
          return;
        }
        setSelectedSubjects(prev => [...prev, {
          subjectId: subject.id,
          subjectName: subject.name,
          questionCount: subject.questionCount,
          selectedCount: Math.min(30, subject.questionCount),
        }]);
      }
    } else {
      setSelectedSubjects(prev => prev.filter(s => s.subjectId !== subjectId));
      setPreviewData(prev => {
        const newData = { ...prev };
        delete newData[subjectId];
        return newData;
      });
    }
    setShowPreview(false);
  };

  const updateSelectedCount = (subjectId: string, count: number) => {
    setSelectedSubjects(prev => prev.map(s => 
      s.subjectId === subjectId ? { ...s, selectedCount: count } : s
    ));
    setShowPreview(false);
    setPreviewData({});
  };

  const getQuestionOptions = (maxCount: number) => {
    const options = [];
    for (let i = 4; i <= Math.min(maxCount, 100); i++) {
      options.push(i);
    }
    return options;
  };

  const fetchPreviewQuestions = async () => {
    if (selectedSubjects.length !== 4) {
      toast.error("Please select exactly 4 subjects first");
      return;
    }

    setIsPreviewLoading(true);
    try {
      const newPreviewData: PreviewData = {};

      for (const subj of selectedSubjects) {
        const { data: assessments } = await supabase
          .from("assessments")
          .select("id")
          .eq("subject_id", subj.subjectId)
          .eq("is_mock_exam", false);

        if (!assessments || assessments.length === 0) {
          throw new Error(`No assessments found for ${subj.subjectName}`);
        }

        const assessmentIds = assessments.map(a => a.id);
        
        const { data: allQuestions, error: qFetchError } = await supabase
          .from("questions")
          .select("question_text, option_a, option_b, option_c, option_d, correct_answer")
          .in("assessment_id", assessmentIds);

        if (qFetchError) throw qFetchError;
        if (!allQuestions || allQuestions.length < subj.selectedCount) {
          throw new Error(`Not enough questions for ${subj.subjectName}`);
        }

        const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
        newPreviewData[subj.subjectId] = shuffled.slice(0, subj.selectedCount);
      }

      setPreviewData(newPreviewData);
      setShowPreview(true);
      setExpandedSubjects([selectedSubjects[0]?.subjectId]);
      toast.success("Preview generated! Review the questions below.");
    } catch (error: any) {
      toast.error("Failed to generate preview: " + error.message);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const reshuffleSubject = async (subjectId: string) => {
    const subj = selectedSubjects.find(s => s.subjectId === subjectId);
    if (!subj) return;

    try {
      const { data: assessments } = await supabase
        .from("assessments")
        .select("id")
        .eq("subject_id", subjectId)
        .eq("is_mock_exam", false);

      if (!assessments || assessments.length === 0) return;

      const assessmentIds = assessments.map(a => a.id);
      
      const { data: allQuestions } = await supabase
        .from("questions")
        .select("question_text, option_a, option_b, option_c, option_d, correct_answer")
        .in("assessment_id", assessmentIds);

      if (!allQuestions || allQuestions.length < subj.selectedCount) return;

      const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
      setPreviewData(prev => ({
        ...prev,
        [subjectId]: shuffled.slice(0, subj.selectedCount)
      }));
      toast.success(`Reshuffled ${subj.subjectName} questions`);
    } catch (error) {
      toast.error("Failed to reshuffle");
    }
  };

  const toggleSubjectExpanded = (subjectId: string) => {
    setExpandedSubjects(prev => 
      prev.includes(subjectId) 
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !isAdmin) {
      toast.error("Unauthorized: Only admins can create mock exams");
      return;
    }

    if (selectedSubjects.length !== 4) {
      toast.error("Please select exactly 4 subjects for the mock exam");
      return;
    }

    if (!formData.scheduled_date) {
      toast.error("Please select an exam date");
      return;
    }

    if (!formData.title.trim()) {
      toast.error("Please enter a mock exam title");
      return;
    }

    // If no preview, generate one first
    if (Object.keys(previewData).length === 0) {
      toast.error("Please preview questions first before creating");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: mockExam, error: mockError } = await supabase
        .from("mock_exams")
        .insert({
          title: formData.title,
          description: formData.description || null,
          scheduled_date: formData.scheduled_date,
          scheduled_time: formData.scheduled_time || null,
          duration_per_subject_minutes: formData.duration_per_subject_minutes,
          total_duration_minutes: formData.total_duration_minutes,
          marks_per_question: formData.marks_per_question,
          is_active: formData.is_active,
          created_by: user.id,
        })
        .select()
        .single();

      if (mockError) throw mockError;

      for (let i = 0; i < selectedSubjects.length; i++) {
        const subj = selectedSubjects[i];
        
        const { error: linkError } = await supabase
          .from("mock_exam_subjects")
          .insert({
            mock_exam_id: mockExam.id,
            subject_id: subj.subjectId,
            order_position: i + 1,
          });

        if (linkError) throw linkError;

        const { data: assessment, error: assessError } = await supabase
          .from("assessments")
          .insert({
            title: `${formData.title} - ${subj.subjectName}`,
            subject_id: subj.subjectId,
            teacher_id: user.id,
            duration_minutes: formData.duration_per_subject_minutes,
            passing_score: 50,
            marks_per_question: formData.marks_per_question,
            is_active: true,
            is_mock_exam: true,
            scheduled_date: formData.scheduled_date,
            scheduled_time: formData.scheduled_time || null,
          })
          .select()
          .single();

        if (assessError) throw assessError;

        // Use the previewed questions
        const questionsWithId = previewData[subj.subjectId].map(q => ({ ...q, assessment_id: assessment.id }));
        const { error: qInsertError } = await supabase.from("questions").insert(questionsWithId);
        if (qInsertError) throw qInsertError;
      }

      const { data: students } = await supabase
        .from("user_roles")
        .select("user_id, profiles(full_name, email)")
        .eq("role", "student");

      if (students) {
        students.forEach((student: any) => {
          if (student.profiles) {
            notifyUserAction(
              student.profiles.email,
              student.profiles.full_name,
              "assessment_created",
              `A new mock exam "${formData.title}" has been created.`
            );
          }
        });
      }

      toast.success("Mock Exam created successfully!");
      
      setFormData({
        title: "",
        description: "",
        scheduled_date: "",
        scheduled_time: "",
        duration_per_subject_minutes: 45,
        total_duration_minutes: 180,
        marks_per_question: 1,
        is_active: true,
      });
      setSelectedSubjects([]);
      setPreviewData({});
      setShowPreview(false);
      
    } catch (error: any) {
      console.error("Error creating mock exam:", error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAdmin) {
    return <div className="p-4">Access denied: Only admins can create mock exams.</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Mock Exam from Existing Questions</CardTitle>
          <CardDescription>
            Select 4 subjects and choose how many questions to pull from existing assessments. 
            Preview questions before creating.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="title">Mock Exam Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., 2025 JAMB Mock"
                  required
                />
              </div>
              <div>
                <Label htmlFor="scheduled_date">Exam Date *</Label>
                <Input
                  id="scheduled_date"
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="scheduled_time">Exam Time</Label>
                <Input
                  id="scheduled_time"
                  type="time"
                  value={formData.scheduled_time}
                  onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="duration_per_subject">Duration per Subject (minutes)</Label>
                <Input
                  id="duration_per_subject"
                  type="number"
                  value={formData.duration_per_subject_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_per_subject_minutes: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="total_duration">Total Duration (minutes)</Label>
                <Input
                  id="total_duration"
                  type="number"
                  value={formData.total_duration_minutes}
                  onChange={(e) => setFormData({ ...formData, total_duration_minutes: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="marks_per_question">Marks per Question</Label>
                <Input
                  id="marks_per_question"
                  type="number"
                  min={1}
                  value={formData.marks_per_question}
                  onChange={(e) => setFormData({ ...formData, marks_per_question: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked as boolean })}
                />
                <Label htmlFor="is_active">Active (visible to students)</Label>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">
                  Select 4 Subjects ({selectedSubjects.length}/4 selected)
                </Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchSubjectsWithQuestions}
                  disabled={isLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              
              {selectedSubjects.length < 4 && (
                <p className="text-sm text-destructive mb-2">You must select exactly 4 subjects</p>
              )}
              
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="ml-2">Loading subjects...</span>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {availableSubjects.map((subj) => {
                    const isSelected = selectedSubjects.some(s => s.subjectId === subj.id);
                    const hasEnoughQuestions = subj.questionCount >= 4;
                    
                    return (
                      <div 
                        key={subj.id} 
                        className={`p-3 border rounded-lg ${!hasEnoughQuestions ? 'opacity-50' : ''} ${isSelected ? 'border-primary bg-primary/5' : ''}`}
                      >
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={subj.id}
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSubjectSelection(subj.id, checked as boolean)}
                            disabled={(!isSelected && selectedSubjects.length >= 4) || !hasEnoughQuestions}
                          />
                          <div className="flex-1">
                            <Label htmlFor={subj.id} className="cursor-pointer font-medium">
                              {subj.name}
                            </Label>
                            <p className={`text-xs ${hasEnoughQuestions ? 'text-muted-foreground' : 'text-destructive'}`}>
                              {subj.questionCount} questions available
                              {!hasEnoughQuestions && ' (min 4 required)'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedSubjects.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Configure Questions per Subject</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {selectedSubjects.map((subj, index) => (
                      <div key={subj.subjectId} className="flex items-center gap-3 p-3 border rounded-lg">
                        <span className="font-medium w-8">{index + 1}.</span>
                        <div className="flex-1">
                          <p className="font-medium">{subj.subjectName}</p>
                          <p className="text-xs text-muted-foreground">{subj.questionCount} available</p>
                        </div>
                        <Select
                          value={subj.selectedCount.toString()}
                          onValueChange={(value) => updateSelectedCount(subj.subjectId, parseInt(value))}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getQuestionOptions(subj.questionCount).map(num => (
                              <SelectItem key={num} value={num.toString()}>
                                {num}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm">
                      <strong>Total Questions:</strong> {selectedSubjects.reduce((sum, s) => sum + s.selectedCount, 0)}
                    </p>
                    <p className="text-sm">
                      <strong>Total Marks:</strong> {selectedSubjects.reduce((sum, s) => sum + s.selectedCount, 0) * formData.marks_per_question}
                    </p>
                  </div>

                  {selectedSubjects.length === 4 && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full mt-4"
                      onClick={fetchPreviewQuestions}
                      disabled={isPreviewLoading}
                    >
                      {isPreviewLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating Preview...
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-2" />
                          {showPreview ? "Regenerate Preview" : "Preview Questions"}
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {showPreview && Object.keys(previewData).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Question Preview
                  </CardTitle>
                  <CardDescription>
                    Review the randomly selected questions. Click reshuffle to get different questions for a subject.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedSubjects.map((subj) => (
                    <Collapsible
                      key={subj.subjectId}
                      open={expandedSubjects.includes(subj.subjectId)}
                      onOpenChange={() => toggleSubjectExpanded(subj.subjectId)}
                    >
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <CollapsibleTrigger className="flex items-center gap-2 flex-1">
                          {expandedSubjects.includes(subj.subjectId) ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                          <span className="font-medium">{subj.subjectName}</span>
                          <span className="text-sm text-muted-foreground">
                            ({previewData[subj.subjectId]?.length || 0} questions)
                          </span>
                        </CollapsibleTrigger>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            reshuffleSubject(subj.subjectId);
                          }}
                        >
                          <Shuffle className="w-4 h-4 mr-1" />
                          Reshuffle
                        </Button>
                      </div>
                      <CollapsibleContent>
                        <ScrollArea className="h-[300px] mt-2 border rounded-lg p-4">
                          <div className="space-y-4">
                            {previewData[subj.subjectId]?.map((q, idx) => (
                              <div key={idx} className="p-3 border rounded-lg bg-card">
                                <p className="font-medium text-sm mb-2">
                                  {idx + 1}. {q.question_text}
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div className={`p-2 rounded ${q.correct_answer === 'A' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                                    A: {q.option_a}
                                  </div>
                                  <div className={`p-2 rounded ${q.correct_answer === 'B' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                                    B: {q.option_b}
                                  </div>
                                  <div className={`p-2 rounded ${q.correct_answer === 'C' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                                    C: {q.option_c}
                                  </div>
                                  <div className={`p-2 rounded ${q.correct_answer === 'D' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                                    D: {q.option_d}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </CardContent>
              </Card>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={selectedSubjects.length !== 4 || isSubmitting || Object.keys(previewData).length === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Mock Exam...
                </>
              ) : Object.keys(previewData).length === 0 ? (
                "Preview Questions First"
              ) : (
                `Create Mock Exam (${selectedSubjects.length}/4 subjects)`
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateMockFromExisting;
