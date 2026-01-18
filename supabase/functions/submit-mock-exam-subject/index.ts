import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnswerSubmission {
  question_id: string;
  selected_answer: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { 
      attempt_id, 
      subject_id, 
      assessment_id, 
      answers,
      is_final_subject = false 
    } = await req.json();

    if (!attempt_id || !subject_id || !assessment_id || !answers || !Array.isArray(answers)) {
      return new Response(
        JSON.stringify({ error: "attempt_id, subject_id, assessment_id, and answers array are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the attempt belongs to the user
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from("mock_exam_attempts")
      .select("id, student_id, is_completed")
      .eq("id", attempt_id)
      .single();

    if (attemptError || !attempt) {
      return new Response(
        JSON.stringify({ error: "Attempt not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (attempt.student_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "You can only submit your own attempts" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (attempt.is_completed) {
      return new Response(
        JSON.stringify({ error: "This exam has already been completed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter out answers with empty selected_answer (unanswered questions)
    const allAnswers = answers as AnswerSubmission[];
    const validAnswers = allAnswers.filter(a => a.selected_answer && a.selected_answer.trim() !== "");
    
    // Get questions with correct answers (server-side only)
    const questionIds = allAnswers.map(a => a.question_id);
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from("questions")
      .select("id, correct_answer")
      .in("id", questionIds);

    if (questionsError) {
      console.error("Error fetching questions:", questionsError);
      return new Response(
        JSON.stringify({ error: "Failed to verify answers" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a map for quick lookup
    const correctAnswerMap = new Map(
      questions?.map(q => [q.id, q.correct_answer]) || []
    );

    // Get mock exam to retrieve marks_per_question
    const { data: mockExamAttempt } = await supabaseAdmin
      .from("mock_exam_attempts")
      .select("mock_exam_id")
      .eq("id", attempt_id)
      .single();

    let marksPerQuestion = 1;
    if (mockExamAttempt) {
      const { data: mockExam } = await supabaseAdmin
        .from("mock_exams")
        .select("marks_per_question")
        .eq("id", mockExamAttempt.mock_exam_id)
        .single();
      marksPerQuestion = mockExam?.marks_per_question || 1;
    }

    // Calculate score using marks_per_question - only count valid (answered) questions
    let correctCount = 0;
    validAnswers.forEach(answer => {
      if (answer.selected_answer === correctAnswerMap.get(answer.question_id)) {
        correctCount++;
      }
    });

    // Total questions is all questions (not just answered ones)
    const totalQuestions = allAnswers.length;
    const score = correctCount * marksPerQuestion;
    const maxScore = totalQuestions * marksPerQuestion;
    
    console.log(`Mock exam subject: total=${totalQuestions}, answered=${validAnswers.length}, correct=${correctCount}`);

    // Save subject result with marks-based score
    const { error: resultError } = await supabaseAdmin
      .from("mock_exam_subject_results")
      .upsert({
        attempt_id,
        subject_id,
        assessment_id,
        score,
        total_questions: maxScore, // Store max possible score instead of question count
        completed_at: new Date().toISOString(),
      });

    if (resultError) {
      console.error("Error saving subject result:", resultError);
      return new Response(
        JSON.stringify({ error: "Failed to save subject result" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If this is the final subject, complete the exam
    let examCompleted = false;
    let totalScore = 0;
    let totalExamQuestions = 0;

    if (is_final_subject) {
      // Get all subject results for this attempt
      const { data: allResults } = await supabaseAdmin
        .from("mock_exam_subject_results")
        .select("score, total_questions")
        .eq("attempt_id", attempt_id);

      if (allResults) {
        for (const result of allResults) {
          totalScore += result.score || 0;
          totalExamQuestions += result.total_questions || 0;
        }
      }

      // Update attempt as completed
      const { error: updateError } = await supabaseAdmin
        .from("mock_exam_attempts")
        .update({
          is_completed: true,
          submitted_at: new Date().toISOString(),
          total_score: totalScore,
          total_questions: totalExamQuestions,
        })
        .eq("id", attempt_id);

      if (updateError) {
        console.error("Error completing exam:", updateError);
      } else {
        examCompleted = true;
      }
    }

    console.log(`Mock exam subject submitted: attempt=${attempt_id}, subject=${subject_id}, score=${score}/${maxScore}, user=${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        score,
        max_score: maxScore,
        correct_count: correctCount,
        total_questions: totalQuestions,
        exam_completed: examCompleted,
        ...(examCompleted && { total_score: totalScore, total_exam_questions: totalExamQuestions }),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Error in submit-mock-exam-subject:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
