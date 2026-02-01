/**
 * Weekly Summary Edge Function
 * Uses Claude Sonnet to generate weekly coaching reports
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeeklySummaryRequest {
  user_id: string;
  week_start?: string; // ISO date, defaults to last Sunday
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id, week_start }: WeeklySummaryRequest = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({
          error: 'ValidationError',
          message: 'user_id is required',
          timestamp: new Date().toISOString(),
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate week boundaries
    const weekStartDate = week_start ? new Date(week_start) : getLastSunday();
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 7);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user_id)
      .single();

    // Fetch completed workouts for the week
    const { data: workouts } = await supabase
      .from('user_workout_sessions')
      .select(`
        *,
        workout:workouts(name)
      `)
      .eq('user_id', user_id)
      .gte('started_at', weekStartDate.toISOString())
      .lt('started_at', weekEndDate.toISOString())
      .not('completed_at', 'is', null)
      .order('started_at', { ascending: true });

    // Fetch activities for the week
    const { data: activities } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', user_id)
      .gte('date', weekStartDate.toISOString().split('T')[0])
      .lt('date', weekEndDate.toISOString().split('T')[0]);

    // Fetch nutrition logs
    const { data: nutrition } = await supabase
      .from('nutrition_logs')
      .select('*')
      .eq('user_id', user_id)
      .gte('date', weekStartDate.toISOString().split('T')[0])
      .lt('date', weekEndDate.toISOString().split('T')[0]);

    // Fetch weight measurements
    const { data: measurements } = await supabase
      .from('body_measurements')
      .select('weight, measured_at')
      .eq('user_id', user_id)
      .gte('measured_at', weekStartDate.toISOString())
      .order('measured_at', { ascending: true });

    // Fetch exercise logs for strength progress
    const { data: exerciseLogs } = await supabase
      .from('exercise_logs')
      .select(`
        *,
        exercise:exercises(name),
        session:user_workout_sessions!inner(user_id, started_at)
      `)
      .eq('session.user_id', user_id)
      .gte('session.started_at', weekStartDate.toISOString())
      .lt('session.started_at', weekEndDate.toISOString());

    if (!workouts || workouts.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'InsufficientData',
          message: 'No workouts logged this week',
          details: {
            workouts_logged: 0,
            minimum_required: 1,
          },
          timestamp: new Date().toISOString(),
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate metrics
    const totalWorkouts = workouts.length;
    const avgEnergy = workouts
      .filter(w => w.subjective_rating)
      .reduce((sum, w) => sum + (w.subjective_rating || 0), 0) / totalWorkouts;

    const totalVolume = exerciseLogs
      ?.reduce((sum, log) =>
        sum + (log.weight_used || 0) * (log.reps_completed || 0), 0
      ) || 0;

    const bjjSessions = activities?.filter(a => a.activity_type === 'bjj').length || 0;
    const softballSessions = activities?.filter(a => a.activity_type === 'softball').length || 0;

    const daysOnTrack = nutrition?.filter(n => n.target_status === 'on_track').length || 0;
    const avgCalories = nutrition?.length
      ? nutrition.reduce((sum, n) => sum + n.calories, 0) / nutrition.length
      : 0;

    const startWeight = measurements?.[0]?.weight || profile?.current_weight;
    const endWeight = measurements?.[measurements.length - 1]?.weight || profile?.current_weight;
    const weightChange = endWeight && startWeight ? endWeight - startWeight : 0;

    // Analyze strength progress
    const strengthProgress = analyzeStrengthProgress(exerciseLogs || []);

    const prompt = `Generate a weekly coaching summary for this user.

USER PROFILE:
- Current weight: ${profile?.current_weight || 'N/A'} lbs
- Goal weight: ${profile?.goal_weight || 'N/A'} lbs
- Daily calorie target: ${profile?.daily_calorie_target || 'N/A'}

WEEK: ${weekStartDate.toLocaleDateString()} - ${weekEndDate.toLocaleDateString()}

WORKOUT METRICS:
- Completed: ${totalWorkouts} workouts
- Average energy rating: ${avgEnergy.toFixed(1)}/5
- Total volume lifted: ${totalVolume.toLocaleString()} lbs

ACTIVITIES:
- BJJ sessions: ${bjjSessions}
- Softball sessions: ${softballSessions}

NUTRITION:
- Days on track: ${daysOnTrack}/${nutrition?.length || 0}
- Average calories: ${avgCalories.toFixed(0)} (target: ${profile?.daily_calorie_target || 'N/A'})

BODY WEIGHT:
- Start: ${startWeight || 'N/A'} lbs
- End: ${endWeight || 'N/A'} lbs
- Change: ${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} lbs

STRENGTH PROGRESS:
${strengthProgress.map(sp => `- ${sp.exercise}: ${sp.change} (${sp.trend})`).join('\n')}

Generate a comprehensive weekly summary in JSON format:
{
  "headline": "One compelling sentence about the week",
  "metrics": {
    "workouts": { "completed": ${totalWorkouts}, "total_volume": ${totalVolume} },
    "activities": { "bjj": ${bjjSessions}, "softball": ${softballSessions} },
    "nutrition": { "days_on_track": ${daysOnTrack}, "avg_calories": ${avgCalories} },
    "weight": { "start": ${startWeight}, "end": ${endWeight}, "change": ${weightChange} }
  },
  "strength_progress": ${JSON.stringify(strengthProgress)},
  "nutrition_analysis": {
    "overall": "excellent" | "good" | "needs_improvement",
    "observations": ["Observation 1", "Observation 2"]
  },
  "recovery_assessment": {
    "status": "well_recovered" | "normal" | "showing_fatigue",
    "indicators": ["Indicator 1"],
    "recommendation": "continue" | "monitor" | "deload_recommended"
  },
  "next_week_focus": "Specific focus for next week",
  "motivational_note": "Encouraging message with specific achievements"
}

Then generate 2-3 specific recommendations for training adjustments (saved separately).

IMPORTANT:
- Lead with what's working (celebrate wins first)
- Be specific with numbers
- Frame observations constructively
- Provide actionable next steps
- Compare to goal progress`;

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
        max_tokens: 3072,
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
      throw new Error('Failed to parse summary from AI response');
    }

    const summary = JSON.parse(jsonMatch[0]);

    // Generate recommendations for progression/deload
    const recommendations = await generateRecommendations(
      supabase,
      user_id,
      exerciseLogs || [],
      avgEnergy
    );

    return new Response(
      JSON.stringify({
        summary,
        recommendations,
        metadata: {
          generated_at: new Date().toISOString(),
          week_start: weekStartDate.toISOString(),
          week_end: weekEndDate.toISOString(),
          next_summary_date: getNextSunday().toISOString(),
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating weekly summary:', error);

    return new Response(
      JSON.stringify({
        error: 'InternalError',
        message: error.message || 'Failed to generate summary',
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getLastSunday(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? 7 : dayOfWeek; // If Sunday, go back 7 days
  const lastSunday = new Date(today);
  lastSunday.setDate(today.getDate() - diff);
  lastSunday.setHours(0, 0, 0, 0);
  return lastSunday;
}

function getNextSunday(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + daysUntilSunday);
  nextSunday.setHours(20, 0, 0, 0); // 8 PM Sunday
  return nextSunday;
}

function analyzeStrengthProgress(logs: any[]) {
  const exerciseGroups = logs.reduce((acc, log) => {
    const name = log.exercise?.name || 'Unknown';
    if (!acc[name]) acc[name] = [];
    acc[name].push(log);
    return acc;
  }, {});

  return Object.entries(exerciseGroups).map(([exercise, logs]: [string, any[]]) => {
    const weights = logs.map(l => l.weight_used || 0);
    const reps = logs.map(l => l.reps_completed || 0);

    const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
    const maxWeight = Math.max(...weights);

    return {
      exercise,
      metric_type: 'weight',
      change: `${maxWeight} lbs max`,
      trend: 'maintaining', // Simplified for now
    };
  }).slice(0, 5); // Top 5 exercises
}

async function generateRecommendations(supabase: any, userId: string, logs: any[], avgEnergy: number) {
  const recommendations = [];

  // Example: Suggest progression if energy is high
  if (avgEnergy >= 4) {
    const topExercises = logs
      .reduce((acc, log) => {
        const name = log.exercise?.name;
        if (!acc[name]) acc[name] = [];
        acc[name].push(log);
        return acc;
      }, {});

    for (const [exercise, exerciseLogs] of Object.entries(topExercises).slice(0, 2)) {
      const logs = exerciseLogs as any[];
      const maxWeight = Math.max(...logs.map(l => l.weight_used || 0));

      const rec = {
        user_id: userId,
        recommendation_type: 'progression',
        exercise_id: logs[0].exercise_id,
        current_value: `${maxWeight} lbs`,
        suggested_value: `${maxWeight + 5} lbs`,
        reasoning: `Consistent performance this week with good energy (${avgEnergy.toFixed(1)}/5). Ready for progression.`,
        status: 'pending',
      };

      await supabase.from('ai_recommendations').insert(rec);
      recommendations.push(rec);
    }
  }

  return recommendations;
}
