# Production Deployment Test Guide

## 🎯 Production URL
**https://sams-workout-coach.vercel.app**

## ✅ Phase 3 Deployment Status

### Infrastructure Setup - COMPLETE
- ✅ GitHub Repository: `siriz0408/sams-workout-coach`
- ✅ Supabase Production: `bbkljwkystmlirxyksdh.supabase.co`
- ✅ Vercel Deployment: Auto-deploy on git push
- ✅ Database Migrations: All 4 deployed successfully
- ✅ Edge Functions: All 6 deployed and active
- ✅ AI API Keys: OpenAI and Anthropic configured

### Authentication - COMPLETE
- ✅ Simple email/password authentication (no OAuth complexity)
- ✅ Sign up and sign in flow implemented
- ✅ Session persistence with localStorage (web)
- ✅ Auto-redirect to onboarding for new users
- ✅ Auto-redirect to main app for returning users

---

## 🧪 End-to-End Test Plan

### Test 1: New User Journey (10 minutes)

**Devices to test on:**
- [ ] iPhone Chrome (PRIMARY use case)
- [ ] iPhone Safari
- [ ] MacBook Chrome
- [ ] MacBook Safari

**Steps:**

1. **Open the app**
   - Navigate to: https://sams-workout-coach.vercel.app
   - Verify the login screen loads (no errors in console)

2. **Create account**
   - Click "Don't have an account? Sign Up"
   - Enter email: `your-email@example.com`
   - Enter password: `test123` (min 6 characters)
   - Click "Sign Up"
   - **Expected**: Redirected to onboarding screen

3. **Complete onboarding**
   - Enter personal details:
     - Current weight: e.g., 225 lbs
     - Goal weight: e.g., 210 lbs
     - Height: e.g., 72 inches (6'0")
     - Age: e.g., 30
     - Daily calorie target: e.g., 2000
   - Submit form
   - **Expected**: Redirected to main app with tabs visible
   - **Expected**: Default workout circuits created (INFERNO, FORGE, TITAN, SURGE)

4. **Verify home screen**
   - Check that one circuit is active (e.g., INFERNO)
   - Check workout streak counter shows 0 days
   - Check weight chart appears (may be empty initially)
   - **Expected**: No console errors, clean UI

### Test 2: Workout Logging (15 minutes)

1. **View active workout**
   - Tap on the active workout card (e.g., INFERNO)
   - **Expected**: See workout details with 3 rounds (Foundation, Intensity, Burnout)

2. **Start workout session**
   - Tap "Start Workout" button
   - **Expected**: Pre-workout AI brief appears (uses Claude API)
   - **Expected**: Brief shows AI recommendations based on recovery context
   - Review the AI brief for quality

3. **Log exercises**
   - For each exercise in Round 1:
     - Enter weight (e.g., 60 lbs)
     - Enter reps completed (e.g., 12)
     - Tap "Log"
   - **Expected**: Exercises marked as complete with checkmarks

4. **Complete workout**
   - After logging all exercises, tap "Complete Workout"
   - Rate session difficulty: 1-5
   - **Expected**: Post-workout AI analysis appears (uses Claude API)
   - **Expected**: Analysis shows performance scores and insights
   - Review the AI analysis for quality

5. **Verify workout logged**
   - Navigate to Progress tab
   - **Expected**: See the completed workout in recent activity
   - **Expected**: Workout streak increments to 1 day

### Test 3: Nutrition Tracking (10 minutes)

1. **Navigate to Nutrition tab**
   - Tap "Nutrition" in bottom navigation
   - **Expected**: See daily calorie target and progress bars

2. **Log a meal**
   - Tap "Log Meal" button
   - Enter meal details:
     - Meal name: "Breakfast"
     - Calories: 500
     - Protein: 30g
     - Carbs: 50g
     - Fats: 15g
   - Submit
   - **Expected**: Daily progress bars update
   - **Expected**: Meal appears in recent meals list

3. **Check weekly adherence**
   - Verify weekly adherence score displays
   - **Expected**: Shows % of days on track

### Test 4: AI Coaching Loop (15 minutes)

1. **Log BJJ activity**
   - Navigate to Activity screen (via quick log or home screen)
   - Log BJJ session:
     - Date: Today
     - Intensity: Hard
     - Duration: 90 minutes
   - **Expected**: Activity saved and appears in list

2. **Check recovery context**
   - Start a new workout the next day
   - View pre-workout brief
   - **Expected**: AI mentions recent BJJ session in recovery context
   - **Expected**: Recommendations adjust for fatigue

3. **Review AI recommendations**
   - After completing 2-3 workouts, check home screen
   - **Expected**: AI recommendations appear (progression, deload, exercise swap)
   - Approve or reject a recommendation
   - **Expected**: Status updates to "accepted" or "rejected"

4. **Weekly summary** (requires waiting or manual trigger)
   - On Sunday or after 7 days, check for weekly summary
   - **Expected**: Comprehensive AI report with insights and next steps

### Test 5: Progress Tracking (10 minutes)

1. **Log weight**
   - Navigate to Progress tab
   - Tap "Log Weight"
   - Enter current weight: e.g., 224 lbs
   - **Expected**: Weight chart updates with new data point

2. **View strength progress**
   - Select "Strength" tab in Progress
   - Choose an exercise (e.g., "Goblet Squats")
   - **Expected**: Chart shows weight/reps progression
   - **Expected**: PR annotations if new personal record

3. **Exercise detail modal**
   - Tap on an exercise name anywhere in the app
   - **Expected**: Modal opens showing:
     - Exercise name
     - Muscle groups
     - AI form cues (uses Claude Haiku API - cached)
     - Performance history chart (last 10 sessions)

---

## 🔍 Performance Checklist

### Page Load Performance
- [ ] Initial app load <3 seconds on mobile
- [ ] Navigation between tabs is instant
- [ ] Charts render smoothly without lag
- [ ] No flash of unstyled content

### React Query Caching
- [ ] Revisiting tabs doesn't re-fetch data immediately
- [ ] Workout list shows cached data while revalidating
- [ ] Exercise history loads quickly on repeat views

### Error Handling
- [ ] Offline errors show user-friendly messages
- [ ] API failures don't crash the app
- [ ] Form validation shows helpful feedback

### Accessibility
- [ ] Text is readable without zooming
- [ ] Buttons are large enough to tap (44x44 min)
- [ ] Color contrast is sufficient
- [ ] Forms have clear labels

---

## 🐛 Known Issues to Watch For

1. **OAuth redirect error** - RESOLVED (switched to email/password)
2. **Expo-secure-store not found** - RESOLVED (using localStorage for web)
3. **UUID generation error** - RESOLVED (using gen_random_uuid())
4. **Circuits not created at onboarding** - RESOLVED (fixed in migration)

---

## 📊 AI Cost Monitoring

**Expected costs per user per month:** ~$2

**API usage breakdown:**
- Pre-workout brief: ~30 requests/month × $0.003 = $0.09
- Post-workout analysis: ~30 requests/month × $0.015 = $0.45
- Weekly summary: 4 requests/month × $0.02 = $0.08
- Form cues: One-time per exercise (cached) = $0.10
- Discovery: ~2 requests/month × $0.50 = $1.00

**Monitor in:**
- OpenAI Dashboard: https://platform.openai.com/usage
- Anthropic Dashboard: https://console.anthropic.com/settings/usage

Set up billing alerts at $50/month threshold.

---

## ✅ Production Readiness Checklist

### Security
- [x] RLS policies enabled on all tables
- [x] API keys stored as Supabase secrets (not in code)
- [x] Environment variables configured in Vercel
- [x] .env file in .gitignore
- [x] No console.log with sensitive data

### Features (MVP Scope)
- [x] Authentication (email/password)
- [x] Onboarding flow
- [x] Pre-programmed circuits (INFERNO, FORGE, TITAN, SURGE)
- [x] Workout logging with AI coaching
- [x] Nutrition tracking (calories + macros)
- [x] BJJ/activity logging
- [x] Weight tracking
- [x] Strength progress charts
- [x] AI recommendations with approve/reject
- [x] Weekly AI summaries

### Documentation
- [x] README.md with setup instructions
- [x] CLAUDE.md with development guidance
- [x] Database schema documented
- [ ] Privacy Policy (Phase 4)
- [ ] Terms of Service (Phase 4)

### Deployment
- [x] GitHub repo created
- [x] Vercel auto-deploy on git push
- [x] Supabase production configured
- [x] Edge Functions deployed
- [x] Database migrations deployed
- [x] Environment variables set

---

## 🚀 Next Steps After Testing

### If Tests Pass ✅
1. Mark Task #4 as complete
2. Proceed to Phase 4: Production Launch & Documentation
   - Write Privacy Policy (`app/privacy.tsx`)
   - Write Terms of Service (`app/terms.tsx`)
   - Set up monitoring (optional: Sentry, Vercel Analytics)
   - Final production verification

### If Tests Fail ❌
1. Document specific errors encountered
2. Check browser console for error messages
3. Review Supabase logs for Edge Function errors
4. Fix issues and redeploy
5. Retest

---

## 📝 Test Results Template

```
Date: __________
Tester: __________
Device: __________
Browser: __________

Test 1 - New User Journey: ☐ Pass ☐ Fail
Notes: ___________________________________

Test 2 - Workout Logging: ☐ Pass ☐ Fail
Notes: ___________________________________

Test 3 - Nutrition Tracking: ☐ Pass ☐ Fail
Notes: ___________________________________

Test 4 - AI Coaching Loop: ☐ Pass ☐ Fail
Notes: ___________________________________

Test 5 - Progress Tracking: ☐ Pass ☐ Fail
Notes: ___________________________________

Performance: ☐ Good ☐ Acceptable ☐ Needs Work

Overall Status: ☐ READY FOR PRODUCTION ☐ NEEDS FIXES
```

---

## 📞 Support Resources

**Supabase Dashboard:**
https://supabase.com/dashboard/project/bbkljwkystmlirxyksdh

**Vercel Dashboard:**
https://vercel.com/siriz0408/sams-workout-coach

**GitHub Repository:**
https://github.com/siriz0408/sams-workout-coach

**Edge Function Logs:**
```bash
supabase functions logs pre-workout-brief --project-ref bbkljwkystmlirxyksdh
supabase functions logs analyze-workout --project-ref bbkljwkystmlirxyksdh
supabase functions logs weekly-summary --project-ref bbkljwkystmlirxyksdh
```

**Vercel Deployment Logs:**
Check in Vercel dashboard under Deployments > [latest deployment] > Function Logs
