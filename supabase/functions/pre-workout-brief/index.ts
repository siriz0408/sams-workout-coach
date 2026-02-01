/**
 * Pre-Workout Brief Edge Function
 * Uses Claude Sonnet to provide pre-session recommendations
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PreWorkoutBriefRequest {
  workout_id: string;
  user_id: string;
}

interface ExerciseRecommendation {
  exercise: string;
  last_performance: string | null;
  suggested_weight: number | null;
  suggested_reps: number | null;
  suggested_time: number | null;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
}

interface RecoveryContext {
  status: 'fresh' | 'normal' | 'fatigued';
  notes: string[];
  recent_activities: ActivitySummary[];
  recommendation: string;
}

interface ActivitySummary {
  type: string;
  intensity: string;
  days_ago: number;
}

interface WorkoutBrief {
  workout_name: string;
  overview: string;
  focus_today: string;
  recommendations: ExerciseRecommendation[];
  recovery_context: RecoveryContext;
  warmup_notes?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { workout_id, user_id }: PreWorkoutBriefRequest = await req.json();

    if (!workout_id || !user_id) {
      return new Response(
        JSON.stringify({
          error: 'ValidationError',
          message: 'workout_id and user_id are required',
          timestamp: new Date().toISOString(),
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch workout details
    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .select(`
        *,
        workout_rounds(
          *,
          workout_exercises(
            *,
            exercise:exercises(*)
          )
        )
      `)
      .eq('id', workout_id)
      .single();

    if (workoutError || !workout) {
      return new Response(
        JSON.stringify({
          error: 'WorkoutNotFound',
          message: 'Workout template not found',
          details: { workout_id },
          timestamp: new Date().toISOString(),
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all exercises from the workout
    const exercises = workout.workout_rounds
      .flatMap(round => round.workout_exercises)
      .map(we => ({
        id: we.exercise.id,
        name: we.exercise.name,
        target_reps: we.target_reps,
        target_time: we.target_time,
      }));

    // Fetch last performance for each exercise
    const { data: lastPerformances } = await supabase
      .from('exercise_logs')
      .select(`
        *,
        session:user_workout_sessions!inner(user_id, started_at, subjective_rating)
      `)
      .in('exercise_id', exercises.map(e => e.id))
      .eq('session.user_id', user_id)
      .order('logged_at', { ascending: false })
      .limit(50);

    // Fetch recent activity logs (BJJ, softball)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: activities } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', user_id)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    // Fetch recent workout sessions for energy trend
    const { data: recentSessions } = await supabase
      .from('user_workout_sessions')
      .select('subjective_rating, started_at')
      .eq('user_id', user_id)
      .not('subjective_rating', 'is', null)
      .order('started_at', { ascending: false })
      .limit(5);

    // Build context for AI
    const exerciseContext = exercises.map(ex => {
      const logs = lastPerformances?.filter(l => l.exercise_id === ex.id) || [];
      const lastLog = logs[0];
      const recentLogs = logs.slice(0, 3);

      return {
        exercise: ex.name,
        target_reps: ex.target_reps,
        target_time: ex.target_time,
        last_performance: lastLog
          ? `${lastLog.weight_used || 'BW'} lbs x ${lastLog.reps_completed} reps`
          : null,
        recent_trend: recentLogs.map(l =>
          `${l.weight_used || 'BW'}x${l.reps_completed}`
        ).join(', '),
      };
    }).filter(Boolean);

    const activityContext = activities?.map(a => ({
      type: a.activity_type,
      intensity: a.intensity,
      days_ago: Math.floor((Date.now() - new Date(a.date).getTime()) / (1000 * 60 * 60 * 24)),
    })) || [];

    const avgEnergyRating = recentSessions?.length
      ? recentSessions.reduce((sum, s) => sum + (s.subjective_rating || 0), 0) / recentSessions.length
      : null;

    const prompt = `Generate a pre-workout brief for this training session.

WORKOUT: ${workout.name}
${workout.description ? `Description: ${workout.description}` : ''}
Estimated duration: ${workout.duration_estimate || 'N/A'} minutes

EXERCISES & TARGETS:
${exerciseContext.map(ex => `
${ex.exercise}
  Target: ${ex.target_reps ? `${ex.target_reps} reps` : `${ex.target_time} sec`}
  Last performance: ${ex.last_performance || 'First time'}
  Recent trend: ${ex.recent_trend || 'No history'}
`).join('\n')}

RECOVERY CONTEXT:
Recent activities: ${activityContext.length > 0 ? activityContext.map(a =>
  `${a.type} (${a.intensity} intensity, ${a.days_ago} days ago)`
).join(', ') : 'None logged'}
Average energy (last 5 workouts): ${avgEnergyRating?.toFixed(1) || 'N/A'}/5

Provide recommendations in JSON format:
{
  "workout_name": "${workout.name}",
  "overview": "Brief overview of today's session",
  "focus_today": "Primary goal for this workout",
  "recommendations": [
    {
      "exercise": "Exercise Name",
      "last_performance": "55lbs x 12" or null,
      "suggested_weight": 60,
      "suggested_reps": 12,
      "suggested_time": null,
      "reasoning": "Why this suggestion based on trend and recovery",
      "confidence": "high"
    }
  ],
  "recovery_context": {
    "status": "fresh" | "normal" | "fatigued",
    "notes": ["Specific recovery observations"],
    "recent_activities": ${JSON.stringify(activityContext)},
    "recommendation": "Adjustment suggestion if needed"
  },
  "warmup_notes": "Specific warmup recommendations based on activities"
}

IMPORTANT:
- Suggest progressive overload when form is consistent (2+ sessions at same weight/reps)
- Account for recent high-intensity activities (BJJ, softball)
- If energy has been low (<4/5), suggest maintaining or reducing load
- Be specific with weights and reps
- Mark confidence: high (strong data), medium (some data), low (first time)`;

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
      throw new Error('Failed to parse brief from AI response');
    }

    const brief: WorkoutBrief = JSON.parse(jsonMatch[0]);

    // Find when this workout was last performed
    const { data: lastSession } = await supabase
      .from('user_workout_sessions')
      .select('started_at')
      .eq('workout_id', workout_id)
      .eq('user_id', user_id)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    const daysSinceLast = lastSession
      ? Math.floor((Date.now() - new Date(lastSession.started_at).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return new Response(
      JSON.stringify({
        brief,
        cached_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        metadata: {
          generated_at: new Date().toISOString(),
          last_performed: lastSession?.started_at || null,
          days_since_last: daysSinceLast,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating pre-workout brief:', error);

    return new Response(
      JSON.stringify({
        error: 'InternalError',
        message: error.message || 'Failed to generate brief',
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
