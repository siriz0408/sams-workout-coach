/**
 * Discover Workout Edge Function
 * Uses OpenAI GPT-4 to search and discover workout programs
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiscoverWorkoutRequest {
  prompt: string;
  equipment?: string[];
  days_per_week?: number;
  constraints?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      prompt,
      equipment = [],
      days_per_week,
      constraints = [],
    }: DiscoverWorkoutRequest = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({
          error: 'ValidationError',
          message: 'prompt is required',
          timestamp: new Date().toISOString(),
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build enhanced search prompt
    const searchPrompt = `You are a fitness expert helping someone find workout programs.

USER REQUEST: ${prompt}

${equipment.length > 0 ? `Available equipment: ${equipment.join(', ')}` : ''}
${days_per_week ? `Preferred frequency: ${days_per_week} days/week` : ''}
${constraints.length > 0 ? `Constraints: ${constraints.join(', ')}` : ''}

Search for and recommend 2-3 workout programs that match this request. For each program:
1. Find real programs from reputable sources (Reddit fitness communities, T-Nation, StrongFirst, etc.)
2. Provide the program name, source, and brief description
3. Outline the key workouts and structure
4. Explain why it matches the user's needs

Return your response in JSON format:
{
  "programs": [
    {
      "id": "unique-program-id",
      "name": "Program Name",
      "description": "What makes this program effective for the user's goals",
      "source": "Source name (e.g., Reddit r/bjj, T-Nation)",
      "source_url": "URL if available",
      "days_per_week": 4,
      "estimated_duration_per_session": 45,
      "workouts": [
        {
          "name": "Day 1: Workout Name",
          "day_of_week": 1,
          "description": "Brief description",
          "exercises": [
            {
              "name": "Exercise Name",
              "sets": 3,
              "reps": 10,
              "rest_seconds": 90,
              "notes": "Form cues or intensity notes"
            }
          ]
        }
      ]
    }
  ],
  "metadata": {
    "query": "original search query",
    "sources_searched": ["Reddit r/fitness", "T-Nation", "etc"]
  }
}

Be specific about sources and provide realistic, proven programs. Prioritize quality over quantity.`;

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a knowledgeable fitness coach with expertise in strength training, conditioning, and sports-specific training. You help people find effective workout programs from reputable sources.',
          },
          {
            role: 'user',
            content: searchPrompt,
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }

    const openaiData = await response.json();
    const content = openaiData.choices[0].message.content;

    const result = JSON.parse(content);

    // Calculate cache expiry (24 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    return new Response(
      JSON.stringify({
        programs: result.programs || [],
        metadata: {
          query: prompt,
          sources_searched: result.metadata?.sources_searched || [],
          generated_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error discovering workouts:', error);

    return new Response(
      JSON.stringify({
        error: 'InternalError',
        message: error.message || 'Failed to discover workouts',
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
