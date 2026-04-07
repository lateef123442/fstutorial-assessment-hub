import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shuffle, CheckCircle, XCircle, ArrowRight, RotateCcw } from "lucide-react";

interface PracticeQuestionsProps {
  studentId: string;
}

const PracticeQuestions = ({ studentId }: PracticeQuestionsProps) => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [questionCount, setQuestionCount] = useState<string>("10");
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [practicing, setPracticing] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    const { data } = await supabase.from("subjects").select("id, name").order("name");
    if (data) setSubjects(data);
  };

  const startPractice = async () => {
    const count = parseInt(questionCount);
    let query = supabase.from("question_bank").select("*");

    if (selectedSubject !== "all") {
      query = query.eq("subject_id", selectedSubject);
    }

    const { data, error } = await query;
    if (error) {
      toast.error("Failed to load questions");
      return;
    }

    if (!data || data.length === 0) {
      toast.error("No questions available for this subject");
      return;
    }

    // Shuffle and take requested count
    const shuffled = data.sort(() => Math.random() - 0.5).slice(0, count);
    setQuestions(shuffled);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setAnswered(0);
    setPracticing(true);
    setFinished(false);
  };

  const handleSelectAnswer = (answer: string) => {
    if (showResult) return;
    setSelectedAnswer(answer);
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer) {
      toast.error("Please select an answer");
      return;
    }
    setShowResult(true);
    setAnswered((a) => a + 1);
    if (selectedAnswer === questions[currentIndex].correct_answer) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  };

  const resetPractice = () => {
    setPracticing(false);
    setFinished(false);
    setQuestions([]);
    setScore(0);
    setAnswered(0);
  };

  const currentQ = questions[currentIndex];
  const options = currentQ
    ? [
        { key: "A", text: currentQ.option_a },
        { key: "B", text: currentQ.option_b },
        { key: "C", text: currentQ.option_c },
        { key: "D", text: currentQ.option_d },
      ]
    : [];

  if (finished) {
    const percentage = Math.round((score / answered) * 100);
    return (
      <Card>
        <CardHeader>
          <CardTitle>Practice Complete!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="text-6xl font-bold text-primary">{percentage}%</div>
          <p className="text-lg">
            You got <span className="font-bold text-green-600">{score}</span> out of{" "}
            <span className="font-bold">{answered}</span> correct
          </p>
          <Button onClick={resetPractice}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Practice Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (practicing && currentQ) {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              Question {currentIndex + 1} of {questions.length}
            </CardTitle>
            <Badge variant="outline">
              Score: {score}/{answered}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-lg font-medium">{currentQ.question_text}</p>
          <div className="space-y-2">
            {options.map((opt) => {
              let className = "w-full text-left p-4 border rounded-lg transition-colors ";
              if (showResult) {
                if (opt.key === currentQ.correct_answer) {
                  className += "border-green-500 bg-green-50 dark:bg-green-950";
                } else if (opt.key === selectedAnswer && opt.key !== currentQ.correct_answer) {
                  className += "border-red-500 bg-red-50 dark:bg-red-950";
                } else {
                  className += "opacity-50";
                }
              } else {
                className += selectedAnswer === opt.key
                  ? "border-primary bg-primary/10"
                  : "hover:border-primary/50";
              }

              return (
                <button
                  key={opt.key}
                  className={className}
                  onClick={() => handleSelectAnswer(opt.key)}
                  disabled={showResult}
                >
                  <span className="flex items-center gap-3">
                    <span className="font-bold text-sm w-6 h-6 rounded-full border flex items-center justify-center">
                      {opt.key}
                    </span>
                    <span>{opt.text}</span>
                    {showResult && opt.key === currentQ.correct_answer && (
                      <CheckCircle className="w-5 h-5 text-green-600 ml-auto" />
                    )}
                    {showResult && opt.key === selectedAnswer && opt.key !== currentQ.correct_answer && (
                      <XCircle className="w-5 h-5 text-red-600 ml-auto" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex gap-3">
            {!showResult ? (
              <Button onClick={handleSubmitAnswer} disabled={!selectedAnswer}>
                Check Answer
              </Button>
            ) : (
              <Button onClick={handleNext}>
                {currentIndex + 1 >= questions.length ? "Finish" : "Next"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
            <Button variant="outline" onClick={resetPractice}>
              Exit Practice
            </Button>
          </div>
        </CardContent>
      </Card>
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
          Test yourself with random questions from the question bank
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
