# Guest Mode Bug Report & Testing Guide

## Executive Summary
Testing and code analysis of the Life Design app's Guest Mode functionality reveals several critical issues with localStorage keys, navigation flow, and data persistence.

---

## 🐛 CRITICAL ISSUES FOUND

### Issue #1: localStorage Key Mismatch ❌
**Severity: CRITICAL**

**Problem:**
The `guest-context.tsx` uses **underscores** in localStorage keys, but the requirements specified **hyphens**.

**Code (lines 75-79):**
```typescript
const savedProfile = localStorage.getItem('life_design_guest_profile');
const savedGoals = localStorage.getItem('life_design_guest_goals');
const savedCheckins = localStorage.getItem('life_design_guest_checkins');
const savedIntegrations = localStorage.getItem('life_design_guest_integrations');
const savedVoice = localStorage.getItem('life_design_voice_preference');
```

**Expected:**
```typescript
const savedProfile = localStorage.getItem('life-design-guest-profile');
const savedGoals = localStorage.getItem('life-design-guest-goals');
const savedCheckins = localStorage.getItem('life-design-guest-checkins');
const savedIntegrations = localStorage.getItem('life-design-guest-integrations');
const savedVoice = localStorage.getItem('life-design-voice-preference');
```

**Impact:**
- Data will not persist correctly
- Multiple storage keys created by mistake
- Confusion when debugging localStorage
- Data migration issues if keys are changed

**Fix Required:** Update all 8 occurrences in `guest-context.tsx` (lines 75-79, 95-100, 138-141)

---

### Issue #2: Middleware Not Protecting Routes ⚠️
**Severity: HIGH**

**Problem:**
The `middleware.ts` file only sets headers but doesn't check authentication or redirect users:

```typescript
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  response.headers.set('x-pathname', request.nextUrl.pathname);
  return response;
}
```

**Expected Behavior:**
- Should check if guest has profile in localStorage
- Should redirect unauthenticated users from `/dashboard` to `/onboarding`
- Should redirect completed users from `/onboarding` to `/dashboard`
- Should allow guest access to protected routes

**Current Behavior:**
- Navigation guards are handled client-side via `useEffect` hooks
- Creates flash of content before redirects
- Poor UX and potential security issues

**Impact:**
- Users see protected content briefly before redirect
- No server-side protection
- Client-side only checks are unreliable

---

### Issue #3: Root Page Doesn't Redirect to Login ⚠️
**Severity: MEDIUM**

**Problem:**
The root page (`/`) shows a landing page with "Start Journey" and "Create Account" buttons:

```typescript
// apps/web/src/app/page.tsx
<Link href="/login" className="btn-premium">Start Journey</Link>
<Link href="/signup">Create Account</Link>
```

**Expected Flow:**
1. User visits `/` → should auto-redirect to `/login`
2. OR root should BE the login page

**Current Flow:**
1. User visits `/` → sees landing page
2. Must manually click "Start Journey"
3. Extra step in user journey

**Impact:**
- Unnecessary landing page
- Extra click for users
- Inconsistent with guest mode focus

---

### Issue #4: GuestProvider Hydration Issue 🔄
**Severity: MEDIUM**

**Problem:**
The GuestProvider returns `null` during hydration:

```typescript
if (!isHydrated) {
  return null; // or a loading spinner
}
```

**Issues:**
1. Causes layout shift when content appears
2. No loading indicator shown
3. Children unmount/remount unnecessarily
4. Could cause issues with other providers

**Better Approach:**
```typescript
if (!isHydrated) {
  return (
    <GuestContext.Provider value={initialContextValue}>
      {children}
    </GuestContext.Provider>
  );
}
```

---

### Issue #5: Profile Merge Bug in setProfile ⚠️
**Severity: MEDIUM**

**Problem:**
The `setProfile` function always forces `id: 'guest-user'`:

```typescript
const setProfile = (newProfile: GuestProfile) => {
  setProfileState({ ...profile, ...newProfile, id: 'guest-user' });
};
```

**Issues:**
1. If `profile` is `null`, spreading `...profile` has no effect
2. Should create new profile if none exists
3. ID should only be set once on first creation

**Better Approach:**
```typescript
const setProfile = (newProfile: GuestProfile) => {
  if (profile) {
    setProfileState({ ...profile, ...newProfile });
  } else {
    setProfileState({ id: 'guest-user', ...newProfile });
  }
};
```

---

### Issue #6: Voice Preference Stored Twice 📢
**Severity: LOW**

**Problem:**
Voice preference is stored in TWO places:
1. `life_design_voice_preference` (separate key)
2. Inside `profile.voicePreference` (nested in profile)

```typescript
const setVoicePreference = (voiceId: string) => {
  setVoicePreferenceState(voiceId);
  // Also update profile
  setProfileState((prev) => prev ? { ...prev, voicePreference: voiceId } : null);
};
```

**Issues:**
- Data duplication
- Potential inconsistency
- Which is source of truth?

**Recommendation:**
- Store only in profile object
- Remove separate voice preference key

---

### Issue #7: No Error Boundaries 🛡️
**Severity: MEDIUM**

**Problem:**
- No error boundaries around GuestProvider
- If localStorage fails (private browsing, quota exceeded), entire app crashes
- No fallback UI

**Missing:**
```typescript
class GuestErrorBoundary extends React.Component {
  // Handle localStorage errors gracefully
}
```

---

### Issue #8: localStorage Not Available in SSR 🚫
**Severity: LOW (already handled)

**Current Protection:**
```typescript
useEffect(() => {
  // Only runs client-side
}, []);
```

**Status:** ✅ Already handled correctly with `useEffect`

---

## 📋 TESTING CHECKLIST

### Test 1: Guest Mode Flow
- [ ] Clear all localStorage/cookies
- [ ] Visit root page `/`
- [ ] Click "Start Journey" → should go to `/login`
- [ ] Verify "Start Your Journey" button shows (not "Continue to Dashboard")
- [ ] Click "Start Your Journey" → should go to `/onboarding`
- [ ] Complete onboarding flow
- [ ] Verify redirect to `/dashboard`
- [ ] Check localStorage keys exist with correct naming

### Test 2: Data Persistence
- [ ] Open DevTools → Application → localStorage
- [ ] Verify keys exist:
  - `life-design-guest-profile` (or `life_design_guest_profile` - check which)
  - `life-design-guest-goals`
  - `life-design-guest-checkins`
  - `life-design-guest-integrations`
  - `life-design-theme`
  - `life-design-voice-preference`
- [ ] Click on each key and verify JSON structure is valid
- [ ] Refresh page → verify data still exists
- [ ] Close browser, reopen → verify data persists

### Test 3: Navigation Guards
- [ ] With no profile: Try to access `/dashboard` directly
  - Expected: Redirect to `/onboarding`
  - Actual: ?
- [ ] With completed onboarding: Try to access `/onboarding`
  - Expected: Redirect to `/dashboard`
  - Actual: ?
- [ ] Test all protected routes:
  - `/dashboard`
  - `/goals`
  - `/goals/new`
  - `/checkin`
  - `/insights`
  - `/profile`
  - `/settings`
  - `/mentors`

### Test 4: Guest Context Functions
- [ ] Test `setProfile()`:
  - Set initial profile
  - Update existing profile
  - Verify localStorage updates
- [ ] Test `addGoal()`:
  - Add a goal
  - Verify it appears in localStorage
  - Verify ID is generated (`goal-${timestamp}`)
- [ ] Test `addCheckin()`:
  - Add a check-in
  - Verify localStorage updates
- [ ] Test `addIntegration()`:
  - Add integration (mock OAuth token)
  - Verify it replaces existing integration for same provider
- [ ] Test `clearGuestData()`:
  - Clear all data
  - Verify all localStorage keys removed

### Test 5: Theme Persistence
- [ ] Select theme during onboarding
- [ ] Verify theme persists after refresh
- [ ] Verify theme key: `life-design-theme`

### Test 6: Voice Preference
- [ ] Select voice during onboarding
- [ ] Verify voice persists after refresh
- [ ] Check if stored in:
  - Separate key: `life-design-voice-preference`
  - Or in profile: `profile.voicePreference`
  - Or both? (bug if both)

### Test 7: Edge Cases
- [ ] Test with private browsing mode
- [ ] Test with localStorage disabled
- [ ] Test with localStorage quota exceeded
- [ ] Test with corrupted JSON in localStorage
- [ ] Test rapid navigation before hydration completes
- [ ] Test multiple browser tabs simultaneously

### Test 8: Browser Compatibility
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (macOS/iOS)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

---

## 🔧 FIXES REQUIRED

### Priority 1 - CRITICAL
1. **Fix localStorage key naming** (`guest-context.tsx`)
   - Change `life_design_*` → `life-design-*`
   - Update all 8 occurrences
   
2. **Implement proper middleware** (`middleware.ts`)
   - Check guest profile exists
   - Redirect logic for protected routes
   - Handle onboarding completion status

### Priority 2 - HIGH
3. **Fix setProfile merge logic** (`guest-context.tsx`)
   - Handle null profile case
   - Don't override ID on updates

4. **Add error boundary** (`layout.tsx` or new component)
   - Catch localStorage errors
   - Show fallback UI
   - Log errors for debugging

### Priority 3 - MEDIUM
5. **Fix GuestProvider hydration** (`guest-context.tsx`)
   - Don't return null
   - Provide context during hydration
   - Show loading state if needed

6. **Remove duplicate voice storage** (`guest-context.tsx`)
   - Choose single source of truth
   - Update only profile.voicePreference
   - Remove separate voice key

7. **Auto-redirect root to login** (`app/page.tsx`)
   - Redirect `/` → `/login`
   - Or make `/` the login page

---

## 🧪 MANUAL TESTING SCRIPT

### Setup
```javascript
// Open DevTools Console and run:

// 1. Clear all data
localStorage.clear();
sessionStorage.clear();
document.cookie.split(";").forEach(c => {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
});
location.reload();
```

### Verify Guest Mode Initiation
```javascript
// After clicking "Start Your Journey", check:
console.log('Profile:', localStorage.getItem('life-design-guest-profile'));
console.log('Goals:', localStorage.getItem('life-design-guest-goals'));
console.log('Theme:', localStorage.getItem('life-design-theme'));

// If null, try underscore versions:
console.log('Profile:', localStorage.getItem('life_design_guest_profile'));
console.log('Goals:', localStorage.getItem('life_design_guest_goals'));
```

### Test Data Persistence
```javascript
// Add test data
const testProfile = {
  id: 'guest-user',
  name: 'Test User',
  profession: 'Developer',
  onboarded: true
};
localStorage.setItem('life-design-guest-profile', JSON.stringify(testProfile));

// Refresh and verify
location.reload();
// After reload, run:
console.log(JSON.parse(localStorage.getItem('life-design-guest-profile')));
```

### Test Navigation Guards
```javascript
// Force navigation to protected route
window.location.href = '/dashboard';
// Should redirect to /onboarding if not onboarded

// Or use:
// window.location.href = '/onboarding';
// Should redirect to /dashboard if already onboarded
```

---

## 📊 TEST RESULTS TEMPLATE

Fill this out after testing:

```
=== GUEST MODE TEST RESULTS ===
Date: [DATE]
Tester: [NAME]
Browser: [BROWSER + VERSION]
URL: https://life-design-brown.vercel.app

Issue #1 - localStorage Keys:
Status: [ ] PASS [ ] FAIL
Keys found: 
- life-design-guest-profile: [ ] Yes [ ] No
- life_design_guest_profile: [ ] Yes [ ] No
Notes: ______________________________

Issue #2 - Middleware:
Status: [ ] PASS [ ] FAIL
Direct access to /dashboard without profile:
- Result: [ ] Redirected [ ] Allowed [ ] Error
Notes: ______________________________

Issue #3 - Root Page:
Status: [ ] PASS [ ] FAIL
Root page behavior: [ ] Auto-redirect [ ] Landing page
Notes: ______________________________

Issue #4 - Hydration:
Status: [ ] PASS [ ] FAIL
Flash of content: [ ] Yes [ ] No
Layout shift: [ ] Yes [ ] No
Notes: ______________________________

Issue #5 - setProfile:
Status: [ ] PASS [ ] FAIL
Profile created correctly: [ ] Yes [ ] No
Updates work: [ ] Yes [ ] No
Notes: ______________________________

Issue #6 - Voice Preference:
Status: [ ] PASS [ ] FAIL
Stored in: [ ] Separate key [ ] Profile [ ] Both
Persists after refresh: [ ] Yes [ ] No
Notes: ______________________________

Issue #7 - Error Handling:
Status: [ ] PASS [ ] FAIL
Private browsing mode: [ ] Works [ ] Crashes
Corrupted data handling: [ ] Graceful [ ] Crashes
Notes: ______________________________

Data Persistence:
- [ ] Data saved correctly
- [ ] Data loaded on refresh
- [ ] Data persists after browser close/reopen
- [ ] Multiple sessions preserve data

Guest Context:
- [ ] useGuest provides all data
- [ ] setProfile works
- [ ] addGoal works
- [ ] addCheckin works
- [ ] addIntegration works
- [ ] clearGuestData works

Navigation:
- [ ] Cannot access dashboard without onboarding
- [ ] Cannot access onboarding after completion
- [ ] All protected routes work for guest

Overall Status: [ ] PASS [ ] FAIL
Critical Blockers: ___________
Recommendations: ___________
```

---

## 🚀 DEPLOYMENT CHECKLIST

Before deploying fixes:
- [ ] Fix localStorage key naming
- [ ] Implement middleware protection
- [ ] Add error boundary
- [ ] Test all scenarios locally
- [ ] Test on deployed Vercel app
- [ ] Verify in multiple browsers
- [ ] Check mobile compatibility
- [ ] Document any breaking changes

---

## 📝 NOTES

### Why localStorage Keys Matter
Changing localStorage keys is a **breaking change** for existing users. If you switch from `life_design_*` to `life-design-*`, existing users will lose their data. 

**Migration Strategy:**
```typescript
// Check both old and new keys
const profile = 
  localStorage.getItem('life-design-guest-profile') || 
  localStorage.getItem('life_design_guest_profile');

// Migrate old to new
if (localStorage.getItem('life_design_guest_profile')) {
  const old = localStorage.getItem('life_design_guest_profile');
  localStorage.setItem('life-design-guest-profile', old);
  localStorage.removeItem('life_design_guest_profile');
}
```

### Middleware vs Client-Side Guards
- **Middleware**: Runs on server, prevents route access entirely
- **useEffect**: Runs on client, causes flash of content
- **Best practice**: Use both for belt-and-suspenders approach

### Testing in Production
To test on deployed Vercel app:
1. Open https://life-design-brown.vercel.app
2. Open DevTools (F12)
3. Go to Application → localStorage
4. Follow test scripts above
5. Use Network tab to check API calls
6. Use Console to check for errors

---

## ❓ QUESTIONS FOR DEVELOPER

1. **localStorage keys**: Should we use hyphens or underscores? (Pick one and be consistent)
2. **Voice storage**: Should voice be in profile or separate key?
3. **Middleware**: Should we implement server-side protection or keep client-side only?
4. **Root page**: Keep landing page or auto-redirect to login?
5. **Error handling**: How should we handle localStorage failures? (Graceful degradation? In-memory only? Show error?)
6. **Data migration**: If keys change, should we migrate existing user data?

---

**End of Report**
