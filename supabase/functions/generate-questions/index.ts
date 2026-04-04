import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildWeakAreasContext(pastSessions: any[]): { weakAreas: string; adaptiveDifficulty: string } {
  let weakAreas = "";
  let adaptiveDifficulty = "moderate";

  if (!pastSessions || pastSessions.length === 0) return { weakAreas, adaptiveDifficulty };

  const categoryScores: Record<string, number[]> = {};
  const overallScores: number[] = [];

  for (const session of pastSessions) {
    const fb = session.feedback as any;
    if (!fb?.categories) continue;
    overallScores.push(fb.overallScore || 0);
    for (const cat of fb.categories) {
      if (!categoryScores[cat.name]) categoryScores[cat.name] = [];
      categoryScores[cat.name].push(cat.score);
    }
  }

  const weakCategories: string[] = [];
  for (const [name, scores] of Object.entries(categoryScores)) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg < 70) weakCategories.push(`${name} (avg: ${Math.round(avg)})`);
  }

  if (weakCategories.length > 0) {
    weakAreas = `\n\nIMPORTANT: The user has historically weak areas in: ${weakCategories.join(", ")}. Generate more questions targeting these weak areas to help them improve.`;
  }

  if (overallScores.length >= 2) {
    const recentAvg = overallScores.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, overallScores.length);
    if (recentAvg >= 85) adaptiveDifficulty = "challenging";
    else if (recentAvg >= 70) adaptiveDifficulty = "moderate-to-challenging";
    else if (recentAvg < 50) adaptiveDifficulty = "foundational";
  }

  return { weakAreas, adaptiveDifficulty };
}

async function fetchBankContext(supabase: any, jobTitle: string): Promise<string> {
  const { data: bankQuestions } = await supabase
    .from("question_bank")
    .select("question, category")
    .or(`job_title.eq.${jobTitle},job_title.eq.`)
    .limit(20);

  if (!bankQuestions || bankQuestions.length === 0) return "";

  const sampleQuestions = bankQuestions
    .sort(() => Math.random() - 0.5)
    .slice(0, 5)
    .map((q: any) => `- [${q.category}] ${q.question}`)
    .join("\n");

  return `\n\nHere are some example questions from our question bank for inspiration (adapt style and difficulty, don't copy verbatim):\n${sampleQuestions}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      jobTitle,
      jobLevel,
      numberOfQuestions,
      userId,
      difficulty,      // explicit difficulty: "easy" | "medium" | "hard" | "mixed"
      domain,          // e.g. "Frontend", "Backend", "Data Science"
      categories: reqCategories, // optional filter: ["behavioral", "technical", ...]
      saveToBank,      // if true, save generated questions to question_bank (admin feature)
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Adaptive context from user history
    let weakAreas = "";
    let adaptiveDifficulty = difficulty || "moderate";

    if (userId && !difficulty) {
      const { data: pastSessions } = await supabase
        .from("interview_sessions")
        .select("feedback, job_title, job_level")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      const ctx = buildWeakAreasContext(pastSessions || []);
      weakAreas = ctx.weakAreas;
      adaptiveDifficulty = ctx.adaptiveDifficulty;
    }

    const bankContext = await fetchBankContext(supabase, jobTitle || "");

    // Map explicit difficulty to adaptive label
    const difficultyMap: Record<string, string> = {
      easy: "foundational",
      medium: "moderate",
      hard: "challenging",
      mixed: "moderate",
    };
    const diffLabel = difficultyMap[difficulty] || adaptiveDifficulty;

    const domainContext = domain
      ? `\n\nDOMAIN SPECIALIZATION: Focus questions on the "${domain}" domain. Questions should test domain-specific knowledge, tools, frameworks, and best practices relevant to ${domain}.`
      : "";

    const categoryFilter = reqCategories?.length
      ? `\n\nOnly generate questions in these categories: ${reqCategories.join(", ")}.`
      : "";

    const difficultyInstruction = difficulty === "mixed"
      ? "\n\nGenerate a MIX of easy, medium, and hard questions (roughly equal distribution)."
      : "";

    const systemPrompt = `You are an expert technical interviewer who generates realistic, high-quality interview questions. Each question should be the kind asked in real interviews at top companies.

Difficulty level for this session: ${diffLabel.toUpperCase()}.
- "foundational": Focus on basics, clear scenarios, confidence-building questions
- "moderate": Standard interview difficulty with a mix of behavioral and technical
- "moderate-to-challenging": Include some harder scenario-based and system design questions
- "challenging": Advanced questions testing deep expertise, edge cases, and leadership

Return questions as a JSON array of objects with "question" (string), "category" (string, one of: "behavioral", "technical", "situational", "problem-solving"), and "difficulty" (string, one of: "easy", "medium", "hard").`;

    const userPrompt = `Generate ${numberOfQuestions || 5} interview questions for a ${jobLevel || "mid-level"} ${jobTitle || "Software Engineer"} position. Mix behavioral and technical questions appropriate for this level.${domainContext}${categoryFilter}${difficultyInstruction}${weakAreas}${bankContext}`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
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
                name: "return_questions",
                description: "Return the generated interview questions",
                parameters: {
                  type: "object",
                  properties: {
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
                        },
                        required: ["question", "category", "difficulty"],
                        additionalProperties: false,
                      },
                    },
                    adaptiveNote: {
                      type: "string",
                      description: "Brief note explaining difficulty calibration",
                    },
                  },
                  required: ["questions", "adaptiveNote"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "return_questions" },
          },
        }),
      }
    );

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("AI gateway error:", status, text);

      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to generate questions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const parsed = toolCall ? JSON.parse(toolCall.function.arguments) : { questions: [], adaptiveNote: "" };

    // Optionally save to question_bank (admin feature)
    if (saveToBank && userId && parsed.questions?.length > 0) {
      const rows = parsed.questions.map((q: any) => ({
        question: q.question,
        category: q.category,
        job_title: jobTitle || "General",
        job_level: jobLevel || "mid",
        created_by: userId,
      }));
      await supabase.from("question_bank").insert(rows);
    }

    return new Response(
      JSON.stringify({
        questions: parsed.questions,
        adaptiveNote: parsed.adaptiveNote,
        difficulty: diffLabel,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-questions error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
