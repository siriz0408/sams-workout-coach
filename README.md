# Sam's AI-Powered Workout Coach

An intelligent fitness platform that helps users discover, track, and optimize workout programs with AI coaching.

## 🎯 Key Features

- **AI Workout Discovery**: Find and generate personalized workout programs using OpenAI and Claude
- **Flexible Workout Logging**: Track any workout program structure (not hardcoded circuits)
- **AI Training Coach**: Get pre-workout briefs, post-workout analysis, and weekly coaching summaries
- **Recovery-Aware Recommendations**: AI considers BJJ/softball schedule for optimal training
- **Progress Visualization**: Weight trends and strength progression tracking
- **Simple Nutrition**: Daily calorie tracking

## 🛠 Tech Stack

### Frontend
- **React Native (Expo)**: Managed workflow for cross-platform mobile development
- **Expo Router**: File-based routing system
- **React Query**: Server state management
- **Zustand**: Local UI state management
- **React Native Paper**: UI components
- **Victory Native**: Charts and data visualization

### Backend
- **Supabase**: PostgreSQL database, authentication, and Edge Functions
- **Row Level Security (RLS)**: Automatic data isolation per user

### AI Integration
- **OpenAI GPT-4**: Workout program discovery (web search capability)
- **Anthropic Claude Sonnet**: Coaching, analysis, and recommendations
- **Anthropic Claude Haiku**: Exercise form cues (cost-optimized)

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **Expo CLI**: `npm install -g expo-cli`
- **Supabase Account**: [supabase.com](https://supabase.com)
- **OpenAI API Key**: [platform.openai.com](https://platform.openai.com)
- **Anthropic API Key**: [console.anthropic.com](https://console.anthropic.com)
- **iOS Simulator** (Mac) or **Android Emulator**

## 🚀 Getting Started

### 1. Clone and Install

```bash
cd "Sams Workout Assistant"
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key
3. Update `.env` file:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Database Migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-id

# Run migrations
supabase db push

# Generate TypeScript types
supabase gen types typescript --project-id your-project-id > types/supabase.ts
```

### 4. Configure Edge Function Secrets

Set up AI API keys in the Supabase dashboard:

1. Go to Project Settings → Edge Functions
2. Add secrets:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `ANTHROPIC_API_KEY`: Your Anthropic API key

### 5. Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy discover-workout
supabase functions deploy generate-workout
supabase functions deploy analyze-workout
supabase functions deploy pre-workout-brief
supabase functions deploy weekly-summary
supabase functions deploy generate-form-cues
```

### 6. Configure OAuth (Optional for MVP)

**Google OAuth:**
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Google provider
3. Add OAuth client ID from Google Cloud Console

**Apple Sign-In (iOS only):**
1. Enable Apple provider in Supabase
2. Configure in Apple Developer Portal

### 7. Run the App

```bash
# Start development server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android

# Clear cache if needed
npx expo start --clear
```

## 📁 Project Structure

```
app/
├── (auth)/              # Authentication screens
│   ├── login.tsx        # Google/Apple OAuth
│   └── onboarding.tsx   # First-time profile setup
├── (tabs)/              # Main tab navigation
│   ├── index.tsx        # Home/Dashboard
│   ├── discover.tsx     # AI Workout Discovery
│   ├── progress.tsx     # Charts & Analytics
│   └── profile.tsx      # Settings
├── workout/[id].tsx     # Active Workout Screen
├── program/[id].tsx     # Program Detail
└── exercise/[id].tsx    # Exercise Detail Modal

lib/
├── supabase.ts          # Supabase client configuration
├── auth-context.tsx     # Authentication provider
├── auth-helpers.ts      # OAuth helper functions
└── query-client.ts      # React Query configuration

stores/
├── workout-session.ts   # Active workout state (Zustand)
└── discovery-state.ts   # AI discovery flow state (Zustand)

hooks/
├── use-workout-programs.ts  # Workout program queries
└── use-user-profile.ts      # User profile & measurements

supabase/
├── migrations/          # Database schema migrations
└── functions/           # Edge Functions for AI integration
```

## 🗄 Database Schema

The core data model supports ANY workout program structure:

```
workout_programs → workouts → workout_rounds → workout_exercises
                                                     ↓
                                                exercises (library)
```

**Key tables:**
- `user_profiles`: User data and goals
- `exercises`: Shared library + custom exercises
- `workout_programs`: User's collection of programs
- `workouts`: Individual workout days
- `workout_rounds`: Rounds/circuits within workouts
- `workout_exercises`: Exercises with targets
- `user_workout_sessions`: Logged workouts with AI analysis
- `exercise_logs`: Individual exercise performance
- `activity_logs`: BJJ/softball sessions for recovery context
- `ai_recommendations`: Pending coaching suggestions

## 🤖 AI Edge Functions

All AI calls are handled server-side via Supabase Edge Functions to secure API keys.

| Function | Model | Purpose | Rate Limit |
|----------|-------|---------|------------|
| `discover-workout` | GPT-4 | Web search for programs | 10/day |
| `generate-workout` | Claude Sonnet | Custom program generation | 5/day |
| `pre-workout-brief` | Claude Sonnet | Pre-session recommendations | Unlimited (cached 24hrs) |
| `analyze-workout` | Claude Sonnet | Post-session analysis | Unlimited |
| `weekly-summary` | Claude Sonnet | Weekly coaching report | 1/week |
| `generate-form-cues` | Claude Haiku | Exercise form tips | Unlimited (cached forever) |

**Estimated costs**: ~$2/user/month during active use

## 🧪 Testing

### Manual Testing Checklist

- [ ] Sign in with Google OAuth
- [ ] Complete onboarding flow
- [ ] Create or discover a workout program
- [ ] Log a workout session
- [ ] View AI post-workout analysis
- [ ] Log weight and BJJ activity
- [ ] View progress charts
- [ ] Approve AI recommendations

### Running the App

1. **iOS Simulator** (Mac only):
   ```bash
   npx expo start --ios
   ```

2. **Android Emulator**:
   ```bash
   npx expo start --android
   ```

3. **Physical Device**:
   - Install Expo Go app
   - Scan QR code from terminal

## 🔒 Security

- **API Keys**: Never committed to git (in `.env` which is gitignored)
- **Row Level Security**: All user data isolated via Supabase RLS policies
- **Secure Storage**: Auth tokens stored in iOS Keychain/Android Keystore
- **OAuth**: Google/Apple sign-in for authentication

## 📊 Data Storytelling Principles

The app uses data storytelling techniques:

- **Lead with insights, not raw data**: "You're 5 lbs down and getting stronger" vs "Weight: 225 lbs"
- **Annotated charts**: "Started here", "You are here", "Goal" markers
- **Story color palette**: Green (achievement), Blue (on track), Orange (needs attention), Red (concern)
- **Three-section narrative**: What Happened → Insights → What's Next

## 🚧 MVP Scope

**In Scope:**
- AI workout discovery and generation
- Flexible workout logging
- Pre/post workout AI coaching
- Weekly AI summaries with recommendations
- Weight and strength progress tracking
- Simple calorie tracking
- BJJ/softball activity logging

**Out of Scope for MVP:**
- Offline support
- Social features
- Apple Health integration
- Detailed meal/macro tracking
- Exercise substitutions
- Multiple active programs simultaneously

## 📝 Development Commands

```bash
# Start development server
npx expo start

# Clear cache
npx expo start --clear

# Generate types from Supabase
supabase gen types typescript --project-id <id> > types/supabase.ts

# Deploy edge function
supabase functions deploy <function-name>

# Test function locally
supabase functions serve <function-name>

# View function logs
supabase functions logs <function-name>

# Database migrations
supabase db push
supabase db reset  # Caution: deletes data
```

## 🐛 Troubleshooting

### "Missing Supabase environment variables"
- Ensure `.env` file exists with correct values
- Restart the Expo development server

### OAuth not working
- Check redirect URIs in OAuth provider settings
- Ensure `scheme` in `app.json` matches
- Test on physical device (OAuth may not work in simulators)

### Database connection issues
- Verify Supabase URL and anon key are correct
- Check if migrations have been run
- Ensure RLS policies are enabled

### Edge Function errors
- Check function logs: `supabase functions logs <function-name>`
- Verify API keys are set in Supabase dashboard
- Test locally: `supabase functions serve <function-name>`

## 📚 Resources

- [Expo Documentation](https://docs.expo.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Zustand Documentation](https://github.com/pmndrs/zustand)

## 📄 License

MIT License - See LICENSE file for details

## 👤 Author

Sam Irizarry

---

Built with ❤️ using React Native, Supabase, and AI
