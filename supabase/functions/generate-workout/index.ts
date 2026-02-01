/**
 * Generate Workout Edge Function
 * Uses Claude Sonnet to generate custom workout programs
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Goal = 'strength' | 'weight_loss' | 'muscle_gain' | 'endurance' | 'mobility';
type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

interface GenerateWorkoutRequest {
  goals: Goal[];
  constraints: string[];
  equipment: string[];
  days_per_week: number;
  session_duration?: number;
  experience_level?: ExperienceLevel;
  user_context?: {
    current_weight?: number;
    goal_weight?: number;
    recent_activity_level?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      goals,
      constraints,
      equipment,
      days_per_week,
      session_duration = 45,
      experience_level = 'intermediate',
      user_context,
    }: GenerateWorkoutRequest = await req.json();

    // Validation
    if (!goals || goals.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'ValidationError',
          message: 'At least one goal is required',
          timestamp: new Date().toISOString(),
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!equipment || equipment.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'ValidationError',
          message: 'At least one equipment type is required',
          timestamp: new Date().toISOString(),
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (days_per_week < 1 || days_per_week > 7) {
      return new Response(
        JSON.stringify({
          error: 'ValidationError',
          message: 'days_per_week must be between 1 and 7',
          timestamp: new Date().toISOString(),
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `Generate a comprehensive ${days_per_week}-day workout program.

GOALS: ${goals.join(', ')}
EXPERIENCE LEVEL: ${experience_level}
AVAILABLE EQUIPMENT: ${equipment.join(', ')}
SESSION DURATION: ${session_duration} minutes
CONSTRAINTS: ${constraints.join(', ') || 'None'}

${user_context ? `
USER CONTEXT:
- Current weight: ${user_context.current_weight || 'N/A'} lbs
- Goal weight: ${user_context.goal_weight || 'N/A'} lbs
- Activity level: ${user_context.recent_activity_level || 'moderate'}
` : ''}

Create a structured program with:
1. Clear workout split (e.g., "Day 1: Upper Push", "Day 2: Lower", etc.)
2. Exercises grouped into rounds/circuits or straight sets
3. Specific sets, reps, and rest periods
4. Exercise progressions suitable for ${experience_level} level

Return the program in JSON format:
{
  "id": "generated-program-unique-id",
  "name": "Program Name",
  "description": "Brief description of the program philosophy",
  "source": "AI Generated",
  "days_per_week": ${days_per_week},
  "estimated_duration_per_session": ${session_duration},
  "workouts": [
    {
      "name": "Day 1: Workout Name",
      "day_of_week": 1,
      "description": "Focus and goals for this session",
      "rounds": [
        {
          "round_number": 1,
          "name": "Warmup" or "Main Work" or "Finisher",
          "rest_after_round": 120,
          "exercises": [
            {
              "name": "Exercise Name",
              "order_in_round": 1,
              "target_reps": 12,
              "target_time": null,
              "rest_after_exercise": 60,
              "notes": "Form cues or intensity notes"
            }
          ]
        }
      ]
    }
  ],
  "ai_reasoning": "Why this program was designed this way"
}

IMPORTANT:
- Respect constraints (e.g., no overhead pressing if shoulder injury)
- Balance volume with recovery (especially if other activities mentioned)
- Include compound movements for efficiency
- Provide exercise variety across the week
- Set appropriate rest periods (strength: 2-3min, hypertrophy: 60-90s, conditioning: 30-60s)
- For BJJ/grappling athletes: emphasize posterior chain, grip strength, and core stability`;

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')!;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const anthropicData = await response.json();
    const content = anthropicData.content[0].text;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse program from AI response');
    }

    const program = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify({
        program,
        metadata: {
          generated_at: new Date().toISOString(),
          user_context: user_context || {},
          ai_reasoning: program.ai_reasoning,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating workout:', error);

    return new Response(
      JSON.stringify({
        error: 'InternalError',
        message: error.message || 'Failed to generate workout',
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
