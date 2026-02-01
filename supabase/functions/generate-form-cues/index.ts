/**
 * Generate Form Cues Edge Function
 * Uses Claude Haiku to generate exercise form cues (cost-optimized)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FormCuesRequest {
  exercise_name: string;
  experience_level?: 'beginner' | 'intermediate' | 'advanced';
  equipment?: string;
}

interface FormCues {
  setup: string;
  execution: string;
  breathing: string;
  common_errors: string[];
  coaching_points: string[];
  safety_notes?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { exercise_name, experience_level = 'intermediate', equipment }: FormCuesRequest = await req.json();

    // Validate input
    if (!exercise_name) {
      return new Response(
        JSON.stringify({
          error: 'ValidationError',
          message: 'exercise_name is required',
          timestamp: new Date().toISOString(),
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if form cues already exist in database (cache)
    const { data: exercise, error: exerciseError } = await supabase
      .from('exercises')
      .select('id, ai_form_cues')
      .ilike('name', exercise_name)
      .single();

    if (exercise?.ai_form_cues) {
      // Return cached form cues
      return new Response(
        JSON.stringify({
          form_cues: JSON.parse(exercise.ai_form_cues),
          cached: true,
          metadata: {
            generated_at: new Date().toISOString(),
            exercise_id: exercise.id,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate form cues using Claude Haiku
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')!;

    const prompt = `Generate detailed form cues for the exercise: ${exercise_name}${equipment ? ` using ${equipment}` : ''}.

Experience level: ${experience_level}

Provide the response in JSON format with the following structure:
{
  "setup": "Starting position and setup instructions",
  "execution": "How to perform the movement",
  "breathing": "Breathing pattern",
  "common_errors": ["Error 1", "Error 2", "Error 3"],
  "coaching_points": ["Point 1", "Point 2", "Point 3"],
  "safety_notes": "Injury prevention and safety considerations"
}

Be specific, concise, and practical. Focus on cues that help someone perform the exercise correctly.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
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

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse form cues from AI response');
    }

    const formCues: FormCues = JSON.parse(jsonMatch[0]);

    // Cache in database if exercise exists
    if (exercise) {
      await supabase
        .from('exercises')
        .update({ ai_form_cues: JSON.stringify(formCues) })
        .eq('id', exercise.id);
    }

    return new Response(
      JSON.stringify({
        form_cues: formCues,
        cached: false,
        metadata: {
          generated_at: new Date().toISOString(),
          exercise_id: exercise?.id,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating form cues:', error);

    return new Response(
      JSON.stringify({
        error: 'InternalError',
        message: error.message || 'Failed to generate form cues',
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
