import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeText, jobDescription, jobTitle, jobLevel, numberOfQuestions, userId } = await req.json();

    if (!resumeText && !jobDescription) {
      return new Response(
        JSON.stringify({ error: "Provide either a resume or job description" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch user's past performance for adaptive difficulty
    let performanceContext = "";
    if (userId) {
      const { data: pastSessions } = await supabase
        .from("interview_sessions")
        .select("feedback, job_title")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (pastSessions && pastSessions.length > 0) {
        const scores = pastSessions
          .filter((s) => (s.feedback as any)?.overallScore)
          .map((s) => (s.feedback as any).overallScore);
        if (scores.length > 0) {
          const avg = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
          performanceContext = `\n\nUser's recent average score: ${avg}/100. Adjust difficulty accordingly — higher scores mean harder questions.`;
        }
      }
    }

    const resumeSection = resumeText
      ? `\n\nCANDIDATE RESUME:\n${resumeText.slice(0, 4000)}`
      : "";
    const jdSection = jobDescription
      ? `\n\nJOB DESCRIPTION:\n${jobDescription.slice(0, 4000)}`
      : "";

    const systemPrompt = `You are a senior technical interviewer who creates personalized interview session plans. 
Analyze the provided resume and/or job description to generate highly targeted questions that:
1. Test skills mentioned in the resume against the job requirements
2. Probe gaps between the candidate's experience and the role
3. Include a mix of easy, medium, and hard questions
4. Cover behavioral, technical, situational, and problem-solving categories
5. Are specific to the candidate's actual tech stack, projects, and experience level

Create a structured interview plan with a recommended order and rationale.`;

    const userPrompt = `Create a full interview session plan with ${numberOfQuestions || 7} questions for a ${jobLevel || "mid-level"} ${jobTitle || "Software Engineer"} position.${resumeSection}${jdSection}${performanceContext}

Generate targeted questions and an overall interview strategy.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_interview_plan",
              description: "Return the structured interview session plan",
              parameters: {
                type: "object",
                properties: {
                  planSummary: {
                    type: "string",
                    description: "2-3 sentence overview of the interview strategy",
                  },
                  identifiedSkills: {
                    type: "array",
                    items: { type: "string" },
                    description: "Key skills identified from resume/JD to test",
                  },
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        category: {
                          type: "string",
                          enum: ["behavioral", "technical", "situational", "problem-solving"],
                        },
                        difficulty: {
                          type: "string",
                          enum: ["easy", "medium", "hard"],
                        },
                        targetSkill: {
                          type: "string",
                          description: "The specific skill or competency this question tests",
                        },
                        rationale: {
                          type: "string",
                          description: "Why this question is relevant for this candidate",
                        },
                      },
                      required: ["question", "category", "difficulty", "targetSkill", "rationale"],
                      additionalProperties: false,
                    },
                  },
                  recommendedDuration: {
                    type: "number",
                    description: "Recommended total interview duration in minutes",
                  },
                },
                required: ["planSummary", "identifiedSkills", "questions", "recommendedDuration"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_interview_plan" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "Failed to generate plan" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const parsed = toolCall
      ? JSON.parse(toolCall.function.arguments)
      : { planSummary: "", identifiedSkills: [], questions: [], recommendedDuration: 30 };

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-plan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
