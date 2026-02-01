# Supabase Edge Functions Deployment Guide

This document explains how to deploy and test the 6 AI Edge Functions.

## Prerequisites

1. **Supabase CLI installed**:
   ```bash
   npm install -g supabase
   ```

2. **Project linked**:
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. **API Keys configured** in Supabase Dashboard:
   - Go to Project Settings → Edge Functions
   - Add secrets:
     - `OPENAI_API_KEY`: Your OpenAI API key
     - `ANTHROPIC_API_KEY`: Your Anthropic API key

## Edge Functions Overview

| Function | Model | Purpose | Rate Limit |
|----------|-------|---------|------------|
| `generate-form-cues` | Claude Haiku | Exercise form tips | Unlimited (cached) |
| `analyze-workout` | Claude Sonnet | Post-workout analysis | Unlimited |
| `pre-workout-brief` | Claude Sonnet | Pre-session recommendations | Unlimited (cached 24hrs) |
| `weekly-summary` | Claude Sonnet | Weekly coaching report | 1/week |
| `generate-workout` | Claude Sonnet | Custom program generation | 5/day |
| `discover-workout` | GPT-4 Turbo | Program discovery | 10/day |

## Deployment

### Deploy All Functions

```bash
# Deploy all 6 functions
supabase functions deploy generate-form-cues
supabase functions deploy analyze-workout
supabase functions deploy pre-workout-brief
supabase functions deploy weekly-summary
supabase functions deploy generate-workout
supabase functions deploy discover-workout
```

### Deploy Single Function

```bash
supabase functions deploy <function-name>
```

### Verify Deployment

```bash
# List deployed functions
supabase functions list
```

## Testing

### Test Locally

```bash
# Serve function locally
supabase functions serve <function-name>

# In another terminal, test with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/<function-name>' \
  --header 'Authorization: Bearer <anon-key>' \
  --header 'Content-Type: application/json' \
  --data '{"test": "data"}'
```

### Test in Production

```bash
# Get your function URL from dashboard or CLI
curl -i --location --request POST 'https://<project-ref>.supabase.co/functions/v1/<function-name>' \
  --header 'Authorization: Bearer <anon-key>' \
  --header 'Content-Type: application/json' \
  --data '{"test": "data"}'
```

## Example Requests

### 1. generate-form-cues

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/generate-form-cues' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "exercise_name": "Goblet Squat",
    "experience_level": "beginner",
    "equipment": "dumbbell"
  }'
```

**Response:**
```json
{
  "form_cues": {
    "setup": "...",
    "execution": "...",
    "breathing": "...",
    "common_errors": ["..."],
    "coaching_points": ["..."],
    "safety_notes": "..."
  },
  "cached": false,
  "metadata": {
    "generated_at": "2026-02-01T10:00:00Z",
    "exercise_id": "uuid"
  }
}
```

### 2. analyze-workout

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/analyze-workout' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "session_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**Response:**
```json
{
  "analysis": {
    "summary": "Great session! Hit new PR on goblet squats...",
    "highlights": ["..."],
    "observations": ["..."],
    "recommendations": ["..."],
    "performance_score": 8,
    "personal_records": [...]
  },
  "stored": true,
  "metadata": {
    "analyzed_at": "2026-02-01T11:00:00Z",
    "comparison_period": "last 8 weeks",
    "data_points_analyzed": 24
  }
}
```

### 3. pre-workout-brief

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/pre-workout-brief' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "workout_id": "workout-uuid",
    "user_id": "user-uuid"
  }'
```

### 4. weekly-summary

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/weekly-summary' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "user_id": "user-uuid",
    "week_start": "2026-01-26"
  }'
```

### 5. generate-workout

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/generate-workout' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "goals": ["strength", "weight_loss"],
    "constraints": ["shoulder injury - no overhead pressing"],
    "equipment": ["dumbbells", "kettlebells", "bodyweight"],
    "days_per_week": 4,
    "session_duration": 45,
    "experience_level": "intermediate"
  }'
```

### 6. discover-workout

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/discover-workout' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "prompt": "Find a 4-day program for BJJ athletes focusing on grip strength",
    "equipment": ["dumbbells", "pull-up bar"],
    "days_per_week": 4
  }'
```

## Monitoring

### View Logs

```bash
# View logs for a function
supabase functions logs <function-name>

# Follow logs in real-time
supabase functions logs <function-name> --follow

# Filter by time
supabase functions logs <function-name> --since 1h
```

### Common Issues

**1. API Key Errors**
- Error: "Anthropic API error" or "OpenAI API error"
- Solution: Check that API keys are set correctly in Supabase dashboard secrets

**2. CORS Errors**
- Error: "Access-Control-Allow-Origin"
- Solution: Ensure `corsHeaders` are included in all responses

**3. Timeout Errors**
- Error: Function timeout
- Solution: AI calls can be slow. Increase timeout in Supabase settings if needed

**4. JSON Parsing Errors**
- Error: "Failed to parse from AI response"
- Solution: AI responses sometimes include markdown. The regex `\{[\s\S]*\}` extracts JSON

## Cost Optimization

### Estimated Costs (per user/month)

- **Form cues**: $0.10 one-time (cached forever)
- **Pre-workout briefs**: $0.32 (16 sessions × $0.02)
- **Post-workout analysis**: $0.48 (16 sessions × $0.03)
- **Weekly summary**: $0.20 (4 weeks × $0.05)
- **Generate workout**: $0.50 (1-2 programs)
- **Discover workout**: $0.50 (1-2 searches)

**Total: ~$2/user/month** during active use

### Caching Strategy

1. **Form cues**: Cached in `exercises.ai_form_cues` (permanent)
2. **Pre-workout briefs**: Cache for 24 hours
3. **Discover results**: Cache for 24 hours
4. **All others**: No caching (fresh data each time)

## Security

- ✅ API keys stored as Supabase secrets (never in code)
- ✅ CORS headers configured for web access
- ✅ User authentication via Supabase anon key
- ✅ RLS policies protect user data

## Rate Limiting

Implement rate limiting in your mobile app:

```typescript
// Example: Check last discovery call
const { data } = await supabase
  .from('user_activity_log')
  .select('created_at')
  .eq('user_id', userId)
  .eq('activity_type', 'discover_workout')
  .gte('created_at', new Date(Date.now() - 24*60*60*1000).toISOString())
  .order('created_at', { ascending: false })
  .limit(10);

if (data && data.length >= 10) {
  throw new Error('Rate limit exceeded: 10 discoveries per day');
}
```

## Next Steps

1. Deploy all 6 functions to production
2. Test each function with example data
3. Monitor logs for errors
4. Implement rate limiting in mobile app
5. Set up alerts for function failures

## Support

- Supabase Edge Functions Docs: https://supabase.com/docs/guides/functions
- OpenAI API Docs: https://platform.openai.com/docs
- Anthropic Claude Docs: https://docs.anthropic.com
