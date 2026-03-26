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
    const { jobTitle, jobLevel, questions, durationSeconds, userId } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch peer benchmarks for this role/level
    let peerContext = "";
    const { data: peerSessions } = await supabase
      .from("interview_sessions")
      .select("feedback")
      .eq("job_level", jobLevel)
      .not("feedback", "is", null)
      .limit(100);

    const peerCategoryAverages: Record<string, { total: number; count: number }> = {};
    const peerOverallScores: number[] = [];

    if (peerSessions && peerSessions.length > 0) {
      for (const session of peerSessions) {
        const fb = session.feedback as any;
        if (!fb?.overallScore) continue;
        peerOverallScores.push(fb.overallScore);
        if (fb.categories) {
          for (const cat of fb.categories) {
            if (!peerCategoryAverages[cat.name]) {
              peerCategoryAverages[cat.name] = { total: 0, count: 0 };
            }
            peerCategoryAverages[cat.name].total += cat.score;
            peerCategoryAverages[cat.name].count += 1;
          }
        }
      }

      const peerAvgOverall = peerOverallScores.length > 0
        ? Math.round(peerOverallScores.reduce((a, b) => a + b, 0) / peerOverallScores.length)
        : null;

      const categoryBenchmarks = Object.entries(peerCategoryAverages)
        .map(([name, data]) => `${name}: ${Math.round(data.total / data.count)}`)
        .join(", ");

      peerContext = `\n\nPEER BENCHMARKS (${peerOverallScores.length} sessions at ${jobLevel} level):
- Average overall score: ${peerAvgOverall}
- Category averages: ${categoryBenchmarks}

Use these benchmarks to provide context in your feedback. Tell the user how they compare to peers at the same level. Include a "peerComparison" section in your response.`;
    }

    // Fetch user's past performance for personalized improvement tips
    let personalHistory = "";
    if (userId) {
      const { data: pastSessions } = await supabase
        .from("interview_sessions")
        .select("feedback, created_at")
        .eq("user_id", userId)
        .not("feedback", "is", null)
        .order("created_at", { ascending: false })
        .limit(5);

      if (pastSessions && pastSessions.length > 0) {
        const historyLines = pastSessions.map((s) => {
          const fb = s.feedback as any;
          const cats = fb.categories?.map((c: any) => `${c.name}:${c.score}`).join(", ") || "N/A";
          return `Score: ${fb.overallScore}, Categories: [${cats}]`;
        });
        personalHistory = `\n\nUSER'S PAST PERFORMANCE (most recent first):
${historyLines.join("\n")}

Based on their history, identify SPECIFIC patterns (improving areas, declining areas, persistent weaknesses) and provide personalized improvement tips that reference their trajectory.`;
      }
    }

    const systemPrompt = `You are an expert interview coach who analyzes mock interview sessions. Given the interview configuration, questions asked, and peer benchmark data, provide detailed performance feedback. Assess the candidate as if they gave a typical response for someone at that level. Be constructive, specific, and actionable.

When peer benchmarks are available, compare the user's performance against peers at the same level. When personal history is available, identify trends and provide personalized tips based on their progression.`;

    const questionList = questions
      .map((q: any, i: number) => `${i + 1}. [${q.category}${q.difficulty ? `, ${q.difficulty}` : ""}] ${q.question}`)
      .join("\n");

    const userPrompt = `Analyze this mock interview session:

Role: ${jobTitle} (${jobLevel} level)
Duration: ${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s
Questions asked:
${questionList}${peerContext}${personalHistory}

Provide a comprehensive analysis using the return_feedback function.`;

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
                name: "return_feedback",
                description: "Return structured interview feedback with peer comparison",
                parameters: {
                  type: "object",
                  properties: {
                    overallScore: {
                      type: "number",
                      description: "Overall score from 0-100",
                    },
                    summary: {
                      type: "string",
                      description: "2-3 sentence overall assessment",
                    },
                    categories: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: {
                            type: "string",
                            enum: ["Communication", "Structure", "Confidence", "Technical Depth", "Problem Solving"],
                          },
                          score: { type: "number", description: "Score from 0-100" },
                          feedback: { type: "string", description: "Specific feedback for this category" },
                          peerAverage: { type: "number", description: "Average score of peers at this level for this category (0 if no data)" },
                        },
                        required: ["name", "score", "feedback", "peerAverage"],
                        additionalProperties: false,
                      },
                    },
                    strengths: {
                      type: "array",
                      items: { type: "string" },
                      description: "2-3 key strengths observed",
                    },
                    improvements: {
                      type: "array",
                      items: { type: "string" },
                      description: "2-3 areas for improvement with actionable tips",
                    },
                    fillerWordTip: {
                      type: "string",
                      description: "Advice on reducing filler words",
                    },
                    peerComparison: {
                      type: "object",
                      properties: {
                        peerAverageScore: { type: "number", description: "Average overall score of peers (0 if no data)" },
                        percentile: { type: "number", description: "Estimated percentile ranking among peers (0-100, 0 if no data)" },
                        comparisonSummary: { type: "string", description: "1-2 sentence comparison with peers" },
                      },
                      required: ["peerAverageScore", "percentile", "comparisonSummary"],
                      additionalProperties: false,
                    },
                    personalizedTips: {
                      type: "array",
                      items: { type: "string" },
                      description: "2-3 personalized improvement tips based on user's historical performance trends",
                    },
                  },
                  required: [
                    "overallScore", "summary", "categories", "strengths",
                    "improvements", "fillerWordTip", "peerComparison", "personalizedTips",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "return_feedback" },
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
        JSON.stringify({ error: "Failed to analyze interview" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const feedback = toolCall ? JSON.parse(toolCall.function.arguments) : null;

    return new Response(JSON.stringify({ feedback }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-interview error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
