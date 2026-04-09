import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shuffle, CheckCircle, XCircle, RotateCcw } from "lucide-react";

interface PracticeQuestionsProps {
  studentId: string;
}

interface PracticeQuestion {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  source: string;
  subject_name?: string;
}

const PracticeQuestions = ({ studentId }: PracticeQuestionsProps) => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [questionCount, setQuestionCount] = useState<string>("10");
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [practicing, setPracticing] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    const { data } = await supabase.from("subjects").select("id, name").order("name");
    if (data) setSubjects(data);
  };

  const startPractice = async () => {
    const count = parseInt(questionCount);
    const allQuestions: PracticeQuestion[] = [];

    // Fetch from question_bank
    let qbQuery = supabase.from("question_bank").select("id, question_text, option_a, option_b, option_c, option_d, correct_answer, subject_id, subjects(name)");
    if (selectedSubject !== "all") {
      qbQuery = qbQuery.eq("subject_id", selectedSubject);
    }
    const { data: qbData } = await qbQuery;
    if (qbData) {
      qbData.forEach((q: any) => {
        allQuestions.push({
          id: `qb-${q.id}`,
          question_text: q.question_text,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_answer: q.correct_answer,
          source: "Question Bank",
          subject_name: q.subjects?.name,
        });
      });
    }

    // Fetch from assessment questions
    let aqQuery = supabase.from("questions").select("id, question_text, option_a, option_b, option_c, option_d, correct_answer, assessment_id, assessments(subject_id, subjects(name))");
    if (selectedSubject !== "all") {
      aqQuery = aqQuery.eq("assessments.subject_id", selectedSubject);
    }
    const { data: aqData } = await aqQuery;
    if (aqData) {
      aqData.forEach((q: any) => {
        const subjectName = q.assessments?.subjects?.name;
        if (selectedSubject !== "all" && !subjectName) return; // filtered out by inner join
        allQuestions.push({
          id: `aq-${q.id}`,
          question_text: q.question_text,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_answer: q.correct_answer,
          source: "Assessment",
          subject_name: subjectName,
        });
      });
    }

    if (allQuestions.length === 0) {
      toast.error("No questions available for this subject");
      return;
    }

    // Deduplicate by question_text
    const seen = new Set<string>();
    const unique = allQuestions.filter((q) => {
      const key = q.question_text.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Shuffle and take requested count
    const shuffled = unique.sort(() => Math.random() - 0.5).slice(0, count);
    setQuestions(shuffled);
    setSelectedAnswers({});
    setSubmitted(false);
    setPracticing(true);
  };

  const handleSelectAnswer = (questionId: string, answer: string) => {
    if (submitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmitAll = () => {
    const unanswered = questions.filter((q) => !selectedAnswers[q.id]);
    if (unanswered.length > 0) {
      toast.error(`Please answer all questions. ${unanswered.length} unanswered.`);
      return;
    }
    setSubmitted(true);
  };

  const score = submitted
    ? questions.filter((q) => selectedAnswers[q.id] === q.correct_answer).length
    : 0;

  const resetPractice = () => {
    setPracticing(false);
    setQuestions([]);
    setSelectedAnswers({});
    setSubmitted(false);
  };

  const options = (q: PracticeQuestion) => [
    { key: "A", text: q.option_a },
    { key: "B", text: q.option_b },
    { key: "C", text: q.option_c },
    { key: "D", text: q.option_d },
  ];

  if (practicing) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <CardTitle>{questions.length} Practice Questions</CardTitle>
              <div className="flex items-center gap-2">
                {submitted && (
                  <Badge variant={score / questions.length >= 0.5 ? "default" : "destructive"} className="text-base px-3 py-1">
                    Score: {score}/{questions.length} ({Math.round((score / questions.length) * 100)}%)
                  </Badge>
                )}
                <Button variant="outline" size="sm" onClick={resetPractice}>
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reset
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {questions.map((q, idx) => {
          const selected = selectedAnswers[q.id];
          return (
            <Card key={q.id}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">
                    <span className="text-muted-foreground mr-2">{idx + 1}.</span>
                    {q.question_text}
                  </p>
                  <div className="flex gap-1 flex-shrink-0">
                    {q.subject_name && (
                      <Badge variant="outline" className="text-xs whitespace-nowrap">{q.subject_name}</Badge>
                    )}
                    <Badge variant="secondary" className="text-xs whitespace-nowrap">{q.source}</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {options(q).map((opt) => {
                    let className = "w-full text-left p-3 border rounded-lg transition-colors text-sm ";
                    if (submitted) {
                      if (opt.key === q.correct_answer) {
                        className += "border-green-500 bg-green-50 dark:bg-green-950";
                      } else if (opt.key === selected && opt.key !== q.correct_answer) {
                        className += "border-red-500 bg-red-50 dark:bg-red-950";
                      } else {
                        className += "opacity-50";
                      }
                    } else {
                      className += selected === opt.key
                        ? "border-primary bg-primary/10"
                        : "hover:border-primary/50";
                    }

                    return (
                      <button
                        key={opt.key}
                        className={className}
                        onClick={() => handleSelectAnswer(q.id, opt.key)}
                        disabled={submitted}
                      >
                        <span className="flex items-center gap-2">
                          <span className="font-bold text-xs w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0">
                            {opt.key}
                          </span>
                          <span>{opt.text}</span>
                          {submitted && opt.key === q.correct_answer && (
                            <CheckCircle className="w-4 h-4 text-green-600 ml-auto flex-shrink-0" />
                          )}
                          {submitted && opt.key === selected && opt.key !== q.correct_answer && (
                            <XCircle className="w-4 h-4 text-red-600 ml-auto flex-shrink-0" />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}

        <div className="flex gap-3 sticky bottom-4">
          {!submitted ? (
            <Button onClick={handleSubmitAll} className="flex-1" size="lg">
              Submit All Answers ({Object.keys(selectedAnswers).length}/{questions.length} answered)
            </Button>
          ) : (
            <Button onClick={resetPractice} className="flex-1" size="lg">
              <RotateCcw className="w-4 h-4 mr-2" />
              Practice Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shuffle className="w-5 h-5" />
          Practice Questions
        </CardTitle>
        <CardDescription>
          Test yourself with random questions from the question bank and past assessments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Subject</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Number of Questions</Label>
            <Select value={questionCount} onValueChange={setQuestionCount}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["5", "10", "15", "20", "30", "50"].map((n) => (
                  <SelectItem key={n} value={n}>{n} questions</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={startPractice}>
          <Shuffle className="w-4 h-4 mr-2" />
          Start Practice
        </Button>
      </CardContent>
    </Card>
  );
};

export default PracticeQuestions;
