/**
 * Analyze Workout Edge Function
 * Uses Claude Sonnet for post-workout performance analysis
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyzeWorkoutRequest {
  session_id: string;
}

interface WorkoutAnalysis {
  summary: string;
  highlights: string[];
  observations: string[];
  recommendations: string[];
  performance_score: number;
  personal_records: PersonalRecord[];
}

interface PersonalRecord {
  exercise: string;
  type: 'weight' | 'reps' | 'volume';
  current: string;
  previous: string;
  improvement: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { session_id }: AnalyzeWorkoutRequest = await req.json();

    if (!session_id) {
      return new Response(
        JSON.stringify({
          error: 'ValidationError',
          message: 'session_id is required',
          timestamp: new Date().toISOString(),
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch session data
    const { data: session, error: sessionError } = await supabase
      .from('user_workout_sessions')
      .select(`
        *,
        workout:workouts(name)
      `)
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({
          error: 'SessionNotFound',
          message: 'Workout session not found',
          details: { session_id },
          timestamp: new Date().toISOString(),
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch exercise logs for this session
    const { data: logs, error: logsError } = await supabase
      .from('exercise_logs')
      .select(`
        *,
        exercise:exercises(name)
      `)
      .eq('session_id', session_id)
      .order('logged_at', { ascending: true });

    if (logsError) {
      throw logsError;
    }

    if (!logs || logs.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'InsufficientData',
          message: 'No exercise logs found for this session',
          timestamp: new Date().toISOString(),
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch historical performance for comparison (last 8 weeks)
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const exerciseIds = [...new Set(logs.map(log => log.exercise_id))];

    const { data: historicalLogs } = await supabase
      .from('exercise_logs')
      .select(`
        *,
        session:user_workout_sessions!inner(user_id, started_at)
      `)
      .in('exercise_id', exerciseIds)
      .eq('session.user_id', session.user_id)
      .gte('session.started_at', eightWeeksAgo.toISOString())
      .neq('session_id', session_id)
      .order('logged_at', { ascending: false })
      .limit(100);

    // Build prompt for Claude
    const prompt = `Analyze this workout session and provide detailed feedback following the "Celebrate → Observe → Suggest" framework.

WORKOUT DETAILS:
- Workout: ${session.workout.name}
- Duration: ${session.duration_minutes || 'N/A'} minutes
- Energy Rating: ${session.subjective_rating || 'N/A'}/5
- Date: ${new Date(session.started_at).toLocaleDateString()}

EXERCISE PERFORMANCE:
${logs.map(log => {
  const exerciseName = log.exercise.name;
  const sets = logs.filter(l => l.exercise_id === log.exercise_id);
  const setsDetails = sets.map((s, i) =>
    `Set ${i + 1}: ${s.weight_used || 'BW'} lbs x ${s.reps_completed || 0} reps`
  ).join('\n  ');

  // Find previous best
  const prevLogs = historicalLogs?.filter(h => h.exercise_id === log.exercise_id) || [];
  const prevBestWeight = Math.max(...prevLogs.map(p => p.weight_used || 0), 0);
  const prevBestReps = Math.max(...prevLogs.map(p => p.reps_completed || 0), 0);

  return `${exerciseName}:
  ${setsDetails}
  Previous best: ${prevBestWeight || 'N/A'} lbs x ${prevBestReps || 'N/A'} reps`;
}).join('\n\n')}

Provide your analysis in JSON format:
{
  "summary": "One compelling sentence highlighting the main achievement or insight",
  "highlights": ["Achievement 1", "Achievement 2", "Achievement 3"],
  "observations": ["Observation about form, fatigue, or patterns"],
  "recommendations": ["Specific actionable suggestion for next time"],
  "performance_score": 8,
  "personal_records": [
    {
      "exercise": "Exercise Name",
      "type": "weight",
      "current": "60lbs x 12",
      "previous": "55lbs x 12",
      "improvement": "+5lbs"
    }
  ]
}

IMPORTANT:
- Lead with celebration (what worked well)
- Be specific with numbers ("60lbs x 12" not "good weight")
- Compare to historical data to identify PRs
- Frame observations constructively
- Give actionable recommendations
- Performance score: 1-10 (relative to recent sessions)`;

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
        max_tokens: 2048,
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
      throw new Error('Failed to parse analysis from AI response');
    }

    const analysis: WorkoutAnalysis = JSON.parse(jsonMatch[0]);

    // Store analysis in session
    await supabase
      .from('user_workout_sessions')
      .update({ ai_analysis: analysis })
      .eq('id', session_id);

    return new Response(
      JSON.stringify({
        analysis,
        stored: true,
        metadata: {
          analyzed_at: new Date().toISOString(),
          comparison_period: 'last 8 weeks',
          data_points_analyzed: (historicalLogs?.length || 0) + logs.length,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error analyzing workout:', error);

    return new Response(
      JSON.stringify({
        error: 'InternalError',
        message: error.message || 'Failed to analyze workout',
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
