# REPOZY - QUICK START GUIDE

## What Was Fixed

### The Problem
- New users signing up via Google/Clerk weren't syncing to the database
- Users showed 0 credits despite being new accounts
- Protected pages didn't check if users were synced

### The Solution
1. **Updated sync-user logic** - Now properly updates user ID when syncing
2. **Fixed middleware** - Made `/sync-user` a public route
3. **Enhanced protected layout** - Checks if user exists and is synced before allowing access
4. **Configured Clerk redirects** - Forces users to `/sync-user` after sign-in/sign-up

---

## Prerequisites

Make sure you have:
- Node.js installed (v18 or higher)
- PostgreSQL database running
- `.env` file configured with:
  - `DATABASE_URL`
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - Other required API keys

---

## Commands to Run the Application

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate Prisma Client
```bash
npx prisma generate
```

### 3. Push Database Schema (Development)
```bash
npm run db:push
```
**OR** if you want to create a migration:
```bash
npm run db:generate
```

### 4. Start the Development Server
```bash
npm run dev
```

The app will be available at: **http://localhost:3000**

---

## Testing Commands

### Test User Sync Flow
```bash
npx tsx test-user-flow.ts
```

### Open Prisma Studio (Database Viewer)
```bash
npm run db:studio
```
Opens at: **http://localhost:5555**

### Check for TypeScript Errors
```bash
npm run typecheck
```

### Run Linter
```bash
npm run lint
```

---

## Complete Workflow

### For Fresh Setup:
```bash
# 1. Install dependencies
npm install

# 2. Setup database schema
npm run db:push

# 3. Test the sync flow
npx tsx test-user-flow.ts

# 4. Start the application
npm run dev
```

### For Running After Setup:
```bash
# Just start the dev server
npm run dev
```

### To View Database:
```bash
# Open Prisma Studio in a separate terminal
npm run db:studio
```

---

## How the Flow Works Now

### 1. User Signs Up/In via Clerk
- User authenticates with Google/Email via Clerk
- Clerk creates/authenticates the user

### 2. Automatic Redirect to `/sync-user`
- `forceRedirectUrl="/sync-user"` in sign-in/sign-up pages
- This ensures EVERY login goes through sync

### 3. Sync User Page
- Fetches Clerk user details
- Performs upsert in database:
  - **New users**: Creates with `id: clerkUserId`, 150 credits, `isSynced: true`
  - **Existing users**: Updates `id` to match Clerk, preserves credits
- Redirects to `/dashboard`

### 4. Protected Layout Check
- Every protected page checks:
  - Is user authenticated? (Clerk)
  - Does user exist in DB? (Prisma)
  - Is user synced? (`isSynced === true`)
- If ANY check fails → redirect to `/sync-user`

### 5. User Can Access Protected Pages
- Dashboard shows correct credit balance
- User can create projects, ask questions, etc.

---

## Troubleshooting

### "0 credits" or user not showing in Prisma Studio
**Solution**: User wasn't synced. This is now fixed! Try:
1. Sign out from Clerk
2. Clear browser cache/cookies
3. Sign in again - you'll be redirected to `/sync-user`
4. Check Prisma Studio - user should appear with 150 credits

### Database connection errors
```bash
# Make sure your DATABASE_URL is correct in .env
# Test connection:
npx prisma db pull
```

### TypeScript errors
```bash
# Regenerate Prisma client
npx prisma generate

# Check for errors
npm run typecheck
```

### Migration issues
```bash
# Reset database (WARNING: DELETES ALL DATA)
npm run db:push -- --force-reset
```

---

## Important Notes

- **New users automatically get 150 credits**
- **Credits are preserved on re-login**
- **User IDs are synced with Clerk IDs** (fixes foreign key relationships)
- **All protected routes check sync status**
- **Database sync happens automatically on every login**

---

## Quick Verification

After starting the app:

1. Navigate to http://localhost:3000
2. Click "Sign In" or "Sign Up"
3. Authenticate with Google/Email
4. You'll briefly see `/sync-user` (redirects fast)
5. Check `/dashboard` - you should see your 150 credits
6. Open Prisma Studio - your user should be there

---

## Useful URLs

- **App**: http://localhost:3000
- **Prisma Studio**: http://localhost:5555
- **Sign In**: http://localhost:3000/sign-in
- **Dashboard**: http://localhost:3000/dashboard

---

## Production Deployment

Before deploying:

```bash
# 1. Build the application
npm run build

# 2. Run migrations (not db:push)
npm run db:migrate

# 3. Start production server
npm start
```

---
