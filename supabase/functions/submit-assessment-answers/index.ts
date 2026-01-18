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

    const { attempt_id, answers, auto_submitted = false } = await req.json();

    if (!attempt_id || !answers || !Array.isArray(answers)) {
      return new Response(
        JSON.stringify({ error: "attempt_id and answers array are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the attempt belongs to the user
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from("attempts")
      .select("id, student_id, assessment_id, submitted_at")
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

    if (attempt.submitted_at) {
      return new Response(
        JSON.stringify({ error: "This attempt has already been submitted" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter out answers with empty selected_answer (unanswered questions)
    const validAnswers = (answers as AnswerSubmission[]).filter(a => a.selected_answer && a.selected_answer.trim() !== "");
    const allAnswers = answers as AnswerSubmission[];
    
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

    // Get assessment details including marks_per_question
    const { data: assessment } = await supabaseAdmin
      .from("assessments")
      .select("passing_score, marks_per_question")
      .eq("id", attempt.assessment_id)
      .single();

    const marksPerQuestion = assessment?.marks_per_question || 1;

    // Calculate score - only count answered questions
    let correctCount = 0;
    
    // Prepare answer records only for answered questions (valid answers)
    const answerRecords = validAnswers.map(answer => {
      const isCorrect = answer.selected_answer === correctAnswerMap.get(answer.question_id);
      if (isCorrect) correctCount++;
      return {
        attempt_id,
        question_id: answer.question_id,
        selected_answer: answer.selected_answer,
        is_correct: isCorrect,
      };
    });

    // Calculate total marks based on marks_per_question (total questions, not just answered)
    const totalQuestions = allAnswers.length;
    const score = correctCount * marksPerQuestion;
    const maxScore = totalQuestions * marksPerQuestion;
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
    const passed = percentage >= (assessment?.passing_score || 50);
    
    console.log(`Submission stats: total=${totalQuestions}, answered=${validAnswers.length}, correct=${correctCount}`);

    // Save answers - only if there are valid answers to save
    if (answerRecords.length > 0) {
      const { error: answersError } = await supabaseAdmin
        .from("answers")
        .insert(answerRecords);

      if (answersError) {
        console.error("Error saving answers:", answersError);
        return new Response(
          JSON.stringify({ error: "Failed to save answers" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Update attempt with results
    const { error: updateError } = await supabaseAdmin
      .from("attempts")
      .update({
        score,
        total_questions: totalQuestions,
        passed,
        submitted_at: new Date().toISOString(),
        auto_submitted,
      })
      .eq("id", attempt_id);

    if (updateError) {
      console.error("Error updating attempt:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update attempt" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Assessment submitted: attempt=${attempt_id}, score=${score}/${maxScore}, passed=${passed}, user=${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        score,
        max_score: maxScore,
        total_questions: totalQuestions,
        correct_count: correctCount,
        passed,
        percentage: Math.round(percentage),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Error in submit-assessment-answers:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
