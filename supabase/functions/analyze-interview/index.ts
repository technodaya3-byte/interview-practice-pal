import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { jobTitle, jobLevel, questions, durationSeconds } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are an expert interview coach who analyzes mock interview sessions. Given the interview configuration and questions asked, provide detailed performance feedback. Assess the candidate as if they gave a typical response for someone at that level. Be constructive, specific, and actionable.`;

    const questionList = questions
      .map((q: any, i: number) => `${i + 1}. [${q.category}] ${q.question}`)
      .join("\n");

    const userPrompt = `Analyze this mock interview session:

Role: ${jobTitle} (${jobLevel} level)
Duration: ${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s
Questions asked:
${questionList}

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
                description: "Return structured interview feedback",
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
                            enum: [
                              "Communication",
                              "Structure",
                              "Confidence",
                              "Technical Depth",
                              "Problem Solving",
                            ],
                          },
                          score: {
                            type: "number",
                            description: "Score from 0-100",
                          },
                          feedback: {
                            type: "string",
                            description: "Specific feedback for this category",
                          },
                        },
                        required: ["name", "score", "feedback"],
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
                      description: "Advice on reducing filler words (um, uh, like, you know)",
                    },
                  },
                  required: [
                    "overallScore",
                    "summary",
                    "categories",
                    "strengths",
                    "improvements",
                    "fillerWordTip",
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
    const feedback = toolCall
      ? JSON.parse(toolCall.function.arguments)
      : null;

    return new Response(JSON.stringify({ feedback }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-interview error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
