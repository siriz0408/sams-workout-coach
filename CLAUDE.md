# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📄 Key Documentation

**[Product Requirements Document (PRD)](/Users/sam.irizarry/Downloads/Sams_Workout_Tracker_PRD.md)** - Original product vision and requirements

**[Implementation Plan](/Users/sam.irizarry/.claude/plans/dazzling-scribbling-lollipop.md)** - Detailed technical implementation plan

## Project Overview

Sam's AI-Powered Workout Coach is a React Native mobile app for discovering, tracking, and optimizing workout programs with AI coaching. The app uses a cloud-first architecture with Supabase backend and AI integration via Edge Functions.

**Key differentiators:**
- Flexible workout program platform (not hardcoded circuits)
- Full AI training coach using OpenAI and Anthropic APIs
- Recovery-aware recommendations considering BJJ/softball schedule
- Data storytelling approach to progress visualization
- Beginner-friendly stack: Expo + Supabase

## Tech Stack

- **Frontend**: React Native (Expo managed workflow)
- **Navigation**: Expo Router (file-based routing)
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **State Management**: React Query (server state) + Zustand (UI state)
- **UI Components**: React Native Paper
- **Charts**: Victory Native
- **AI**: OpenAI GPT-4 (discovery) + Anthropic Claude (coaching)

## Development Commands

### Setup
```bash
# Install dependencies
npm install

# Start development server
npx expo start

# iOS simulator
npx expo start --ios

# Android emulator
npx expo start --android

# Clear cache if needed
npx expo start --clear
```

### Supabase Edge Functions
```bash
# Deploy edge function
supabase functions deploy <function-name>

# Test function locally
supabase functions serve <function-name>

# View function logs
supabase functions logs <function-name>
```

### Database
```bash
# Generate types from Supabase schema
npx supabase gen types typescript --project-id <project-id> > types/supabase.ts

# Run migrations
supabase db push

# Reset database (caution: deletes data)
supabase db reset
```

## Architecture

### Database Schema Hierarchy

The core data model supports ANY workout program structure (not just specific circuits):

```
workout_programs (user's collection of programs)
  └─ workouts (individual workout days like "INFERNO" or "P90X Day 1")
      └─ workout_rounds (Round 1, 2, 3, etc.)
          └─ workout_exercises (actual exercises with targets)
```

**Key tables:**
- `exercises`: Shared library (is_default flag) + user custom exercises
- `user_workout_sessions`: Logged workouts with AI analysis (JSONB)
- `exercise_logs`: Individual exercise performance within sessions
- `activity_logs`: BJJ/softball sessions with intensity for recovery context
- `ai_recommendations`: AI suggestions with pending/accepted/rejected status

**RLS policies:** All user data isolated via Row Level Security using `auth.uid()`

### AI Integration via Edge Functions

All AI calls happen server-side to secure API keys and optimize costs (~$2/user/month).

**6 Edge Functions:**
1. `discover-workout` (OpenAI GPT-4) - Web search for programs
2. `generate-workout` (Claude) - Custom program generation
3. `pre-workout-brief` (Claude) - Pre-session recommendations
4. `analyze-workout` (Claude) - Post-session analysis
5. `weekly-summary` (Claude) - Sunday coaching report
6. `generate-form-cues` (Claude Haiku) - Exercise form tips (cached)

**Cost optimizations:**
- Form cues cached in `exercises.ai_form_cues`
- Weekly summaries run once/week
- Workout discovery results cached 24hrs
- Using Claude Sonnet for analysis, Haiku for simple tasks

### Navigation Structure (Expo Router)

```
app/
├── (auth)/               # Login, onboarding
├── (tabs)/              # Main tab navigation
│   ├── index.tsx        # Home/Dashboard
│   ├── discover.tsx     # AI Workout Discovery
│   ├── progress.tsx     # Charts & Analytics
│   └── profile.tsx      # Settings
├── workout/[id].tsx     # Active Workout Screen
├── program/[id].tsx     # Program Detail
└── exercise/[id].tsx    # Exercise Detail Modal
```

**Deep linking works automatically** - use `router.push('/workout/[id]')` for navigation.

### State Management Pattern

**React Query (Server State):**
```typescript
// Use for all Supabase data fetching
useWorkoutPrograms()
useActiveWorkout(id)
useExerciseHistory(exerciseId)
useAIRecommendations()
```

**Zustand (UI State):**
```typescript
// Use for ephemeral UI state only
useWorkoutSession()  // Active workout logging state
useDiscoveryState()  // AI discovery flow state
```

**Rule:** Server data via React Query, temporary UI state via Zustand. Never duplicate server state in Zustand.

### Performance Considerations

**Critical indexes already defined:**
- `idx_workout_programs_user_active` - Partial index for active program
- `idx_exercise_logs_exercise_completed` - Exercise history queries
- `idx_ai_recommendations_pending` - Pending recommendations only

**Query patterns:**
- Always filter by `user_id` first (leverages RLS + indexes)
- Use `ORDER BY created_at DESC` with indexes
- Batch AI recommendations in weekly summary (not per-workout)

## AI Edge Function Patterns

All Edge Functions follow consistent API design principles:
- Type-safe request/response schemas (TypeScript interfaces)
- Standardized error responses with error codes
- Rate limiting enforced at function level
- Caching strategies to optimize costs
- Detailed metadata in responses

### The 6 Edge Functions

1. **discover-workout** (OpenAI GPT-4) - Web search for workout programs
   - Rate limit: 10 requests/day per user
   - Cache: 24 hours

2. **generate-workout** (Claude) - Custom AI-generated programs
   - Rate limit: 5 requests/day per user

3. **pre-workout-brief** (Claude) - Pre-session recommendations
   - Rate limit: Unlimited (cached 24hrs)

4. **analyze-workout** (Claude) - Post-session performance analysis
   - Rate limit: Unlimited

5. **weekly-summary** (Claude) - Weekly coaching report
   - Rate limit: 1 per week per user

6. **generate-form-cues** (Claude Haiku) - Exercise form tips
   - Rate limit: Unlimited (cached forever in database)

### API Design Standards

**All functions return consistent structure:**
```typescript
// Success Response
{
  "data": { /* function-specific data */ },
  "metadata": {
    "generated_at": "ISO timestamp",
    "cached_until": "ISO timestamp (if cached)",
    /* function-specific metadata */
  }
}

// Error Response
{
  "error": "ErrorCode",           // e.g., "RateLimitExceeded"
  "message": "Human-readable message",
  "details": { /* additional context */ },
  "timestamp": "ISO timestamp"
}
```

**Standard Error Codes:**
- `ValidationError` (400) - Invalid input parameters
- `RateLimitExceeded` (429) - Too many requests
- `SessionNotFound` (404) - Workout session doesn't exist
- `WorkoutNotFound` (404) - Workout template doesn't exist
- `InsufficientData` (400) - Not enough data for analysis
- `UnauthorizedAccess` (403) - User doesn't own resource
- `InternalError` (500) - Server error
- `AIServiceError` (502) - OpenAI/Anthropic API error

### Calling from Mobile App
```typescript
const { data, error } = await supabase.functions.invoke('pre-workout-brief', {
  body: { workout_id: workoutId }
});

if (error) {
  // Handle error based on error.error code
  if (error.error === 'RateLimitExceeded') {
    showRateLimitMessage(error.details.retry_after);
  }
} else {
  // Use data.brief, data.recommendations
}
```

### Edge Function Structure
```typescript
// functions/pre-workout-brief/index.ts
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

Deno.serve(async (req) => {
  try {
    const { workout_id } = await req.json();

    // Validate input
    if (!workout_id) {
      return new Response(JSON.stringify({
        error: 'ValidationError',
        message: 'workout_id is required',
        timestamp: new Date().toISOString()
      }), { status: 400 });
    }

    // Fetch data from Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Call Claude API with structured prompt
    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY')!
    });

    const result = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    // Return structured response
    return new Response(JSON.stringify({
      brief: parsedBrief,
      recommendations: parsedRecommendations,
      metadata: {
        generated_at: new Date().toISOString(),
        cached_until: new Date(Date.now() + 24*60*60*1000).toISOString()
      }
    }), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'InternalError',
      message: error.message,
      timestamp: new Date().toISOString()
    }), { status: 500 });
  }
});
```

**Environment variables set in Supabase dashboard:**
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- Service role key automatically available

## Common Development Patterns

### Creating a New Workout Program
Programs must follow the hierarchy: program → workouts → rounds → exercises. Always create in order and use transactions for consistency.

### Logging Workout Performance
User can log exercises in any order (flexible flow). Store `round_number` in `exercise_logs` to reconstruct which round each set belongs to.

### AI Recommendation Flow
1. AI generates suggestion → saved to `ai_recommendations` with `status='pending'`
2. User approves/rejects → update status
3. If accepted, next workout uses new targets
4. Historical data preserved (don't modify past logs)

### Exercise Library Management
- Pre-loaded exercises have `is_default=true`
- User custom exercises have `created_by=user_id`
- AI form cues generated on first access, then cached
- Video URLs are optional, user-editable

## Testing Strategy

### Manual Test Scenarios
Focus on these critical paths during development:

1. **New user journey**: Sign in → onboarding → AI discovery → first workout → completion
2. **Workout logging**: Start workout → log exercises (any order) → complete → see AI analysis
3. **AI coaching cycle**: Pre-workout brief → log session → post-workout analysis → weekly summary → approve recommendations

### Edge Function Testing
```bash
# Test locally before deploying
supabase functions serve <function-name>
curl -i --location --request POST 'http://localhost:54321/functions/v1/<function-name>' \
  --header 'Authorization: Bearer <anon-key>' \
  --header 'Content-Type: application/json' \
  --data '{"test": "data"}'
```

## MVP Scope

**In scope:**
- AI workout discovery (chat + form modes)
- Flexible workout logging (any program structure)
- Pre/post workout coaching
- Weekly AI summaries with recommendations
- Weight + strength progress tracking
- Simple calorie tracking
- BJJ/softball activity logging

**Out of scope for MVP:**
- Offline support (gym has WiFi)
- Social features
- Apple Health integration
- Meal/macro tracking (just calories)
- Exercise substitutions
- Multiple active programs simultaneously

## Environment Variables

```env
# .env (local development)
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=xxx

# Supabase Edge Functions (set in dashboard)
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
```

**Never commit API keys.** Use Supabase secrets for edge functions, `EXPO_PUBLIC_*` prefix for client-safe values only.

## Data Flow Examples

### Workout Session Lifecycle
1. User taps "Start Workout" → create `user_workout_sessions` record with `started_at`
2. User logs exercise → insert `exercise_logs` linked to session
3. User completes → update session with `completed_at`, call `analyze-workout` function
4. AI analysis stored in session's `ai_analysis` JSONB field

### AI Recommendation Lifecycle
1. Weekly summary generates recommendations → insert to `ai_recommendations` with `status='pending'`
2. User views on home screen (query `WHERE status='pending'`)
3. User approves → update `status='accepted'`, set `resolved_at`
4. Next workout pre-brief uses accepted recommendations for suggested weights

### Program Discovery Flow
1. User chats with AI in discover screen → call `discover-workout` function
2. Function returns 2-3 program options with structured data
3. User selects one → create `workout_programs`, `workouts`, `workout_rounds`, `workout_exercises` in transaction
4. Set `is_active=true` → appears on home screen

## Database Enums

Use PostgreSQL enums for type safety:
```sql
intensity_level: 'light' | 'moderate' | 'hard'
activity_type: 'bjj' | 'softball' | 'other'
target_status: 'under' | 'on_track' | 'over'
recommendation_type: 'progression' | 'deload' | 'exercise_swap'
recommendation_status: 'pending' | 'accepted' | 'rejected'
```

TypeScript types auto-generated from Supabase schema.

## Data Storytelling Principles

The app uses data storytelling techniques to make progress compelling and motivating.

### UI Design Philosophy

**Always lead with insights, not raw data:**
- ❌ Bad: "Weight: 225 lbs, Change: -5 lbs"
- ✅ Good: "You're 5 lbs down and getting stronger" with annotated chart

**Three-section narrative structure:**
1. **What Happened** - The headline and key metrics
2. **Why It Matters** - Context and insights
3. **What's Next** - Recommendations and next steps

### Progress Visualization Standards

**Required chart annotations:**
- "Started here" marker at beginning
- "You are here" indicator at current position
- "Goal" marker with target line (dashed)
- Event annotations for milestones (PRs, plateaus)

**Color storytelling palette:**
```typescript
STORY_COLORS = {
  achievement: '#4CAF50',    // Green - celebrate wins
  on_track: '#2196F3',       // Blue - maintaining pace
  needs_attention: '#FF9800', // Orange - watch this
  concern: '#F44336',        // Red - action needed
  neutral: '#9E9E9E'         // Gray - reference/baseline
}
```

### AI Narrative Guidelines

**When generating AI analysis/summaries:**
1. **Specific over generic**: "60lbs x 12" not "good weight"
2. **Context over absolutes**: "20% to goal" not just "5 lbs"
3. **Trend over point**: "Improving weekly" not "225 lbs"
4. **Action over observation**: "Try 65lbs next" not "Weight going up"
5. **Positive framing**: "Getting stronger" not "Not weak anymore"

**Story structure for AI responses:**
- **Setup**: Context from recent data
- **Conflict/Insight**: What the data reveals
- **Resolution**: Actionable recommendations

**Example AI prompt pattern:**
```typescript
const systemPrompt = `You are a supportive strength coach.
- Lead with what's working (celebrate wins first)
- Provide context for numbers (not just raw data)
- Frame observations constructively
- End with actionable next steps
- Use specific numbers and comparisons
- Avoid generic praise - be specific about achievements`;
```

### Component Implementation Rules

**ProgressCard Component:**
- Must show headline before metrics
- Include "What's Working" section
- Use annotated charts, not bare visualizations

**WorkoutAnalysisCard:**
- Lead with celebration/achievement
- Use progressive reveal for detailed breakdowns
- Always end with "For Next Time" suggestions

**WeeklySummaryView:**
- Headline format: "[Outcome]! [Key Achievement]"
- Group related metrics together
- Show trends, not just current values
- Include comparison to previous week

**RecommendationCard:**
- Show reasoning before recommendation
- Include confidence level (high/medium/low)
- Provide context for suggested changes

## Important Implementation Notes

- **Workout rounds are optional**: Linear programs may have only 1 round with many exercises
- **Target flexibility**: Exercises can have `target_reps` OR `target_time` (or both for circuits)
- **Subjective feedback required**: User rates energy level (1-5) after every workout for AI analysis
- **Recovery context**: AI always checks recent BJJ/softball sessions before recommending weights
- **Progressive overload tracking**: AI looks at last 4-8 weeks of data per exercise, not just previous session
- **Narrative first**: Every data visualization must tell a story with headline, context, and insights
