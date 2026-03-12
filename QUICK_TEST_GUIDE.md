# 🧪 Guest Mode Quick Test Guide

## 🚀 Quick Start (2 minutes)

### Option 1: Interactive HTML Console
```
1. Visit: https://life-design-brown.vercel.app/test-guest-mode.html
2. Click: "Check All Keys"
3. Click: "Seed Test Data"
4. Click: "Check All Keys" again
5. Done! ✅
```

### Option 2: Browser Console Script
```javascript
// 1. Open DevTools (F12)
// 2. Paste this and press Enter:

fetch('https://raw.githubusercontent.com/[YOUR-REPO]/GUEST_MODE_TEST_SCRIPT.js')
  .then(r => r.text())
  .then(eval);

// 3. Run tests:
runAllTests();
```

---

## 📋 Manual Test Checklist

### Test 1: Fresh Start (5 min)
```
[ ] Clear localStorage (clearAll() in console)
[ ] Visit /login
[ ] See "Start Your Journey" button
[ ] Click button → goes to /onboarding
[ ] Complete onboarding flow
[ ] Automatically redirects to /dashboard
[ ] Open DevTools → Application → localStorage
[ ] Verify these keys exist:
    [ ] life-design-guest-profile
    [ ] life-design-guest-goals
    [ ] life-design-guest-checkins
    [ ] life-design-guest-integrations
    [ ] life-design-theme
    [ ] life-design-voice-preference
```

### Test 2: Data Persistence (3 min)
```
[ ] With data in localStorage
[ ] Refresh page (F5)
[ ] Data still there?
[ ] Close tab
[ ] Reopen site
[ ] Data still there?
[ ] Close browser
[ ] Reopen browser
[ ] Visit site
[ ] Data still there?
```

### Test 3: Navigation Guards (3 min)
```
[ ] With NO profile:
    [ ] Visit /dashboard directly
    [ ] Should redirect to /onboarding
    
[ ] With profile, NOT onboarded:
    [ ] Visit /dashboard
    [ ] Should redirect to /onboarding
    
[ ] With profile, onboarded:
    [ ] Visit /onboarding
    [ ] Should redirect to /dashboard
    [ ] Visit /dashboard
    [ ] Should stay on /dashboard
```

### Test 4: Browser Compatibility (5 min)
```
[ ] Chrome/Edge
[ ] Firefox
[ ] Safari
[ ] Mobile Safari (iOS)
[ ] Chrome Mobile (Android)
```

---

## 🐛 Bug Checklist

### ✅ FIXED
- [x] localStorage keys use hyphens (not underscores)
- [x] Error handling for localStorage failures
- [x] Profile merge logic handles null case
- [x] Hydration doesn't cause layout shift

### ⚠️ NOT FIXED (Design Decisions Needed)
- [ ] Voice preference stored in 2 places
- [ ] Root page doesn't auto-redirect to login
- [ ] No server-side middleware protection
- [ ] No global error boundary

---

## 🔍 Quick Checks

### Check localStorage Keys (Console)
```javascript
// Should see life-design-* keys (NOT life_design_*)
Object.keys(localStorage).filter(k => k.startsWith('life-design') || k.startsWith('life_design'))
```

### Check Profile (Console)
```javascript
JSON.parse(localStorage.getItem('life-design-guest-profile'))
```

### Check Goals (Console)
```javascript
JSON.parse(localStorage.getItem('life-design-guest-goals'))
```

### Clear Everything (Console)
```javascript
localStorage.clear();
location.reload();
```

### Seed Test Data (Console)
```javascript
// Copy seedData() function from GUEST_MODE_TEST_SCRIPT.js
// Or visit: /test-guest-mode.html and click "Seed Test Data"
```

---

## ❌ Known Issues & Workarounds

### Issue: Old Key Format (life_design_*)
**Check:**
```javascript
localStorage.getItem('life_design_guest_profile') // Should be null
```

**Fix:** Already fixed in code. If you see old keys, clear them:
```javascript
Object.keys(localStorage)
  .filter(k => k.startsWith('life_design_'))
  .forEach(k => localStorage.removeItem(k));
```

### Issue: Profile is null after onboarding
**Check:**
```javascript
JSON.parse(localStorage.getItem('life-design-guest-profile'))?.onboarded
```

**Fix:** Manually set:
```javascript
const profile = JSON.parse(localStorage.getItem('life-design-guest-profile'));
profile.onboarded = true;
localStorage.setItem('life-design-guest-profile', JSON.stringify(profile));
location.reload();
```

### Issue: Stuck in redirect loop
**Symptoms:** Page keeps redirecting between /onboarding and /dashboard

**Fix:**
```javascript
// Check profile state
const profile = JSON.parse(localStorage.getItem('life-design-guest-profile'));
console.log('Profile:', profile);
console.log('Onboarded:', profile?.onboarded);
console.log('Current path:', window.location.pathname);

// If stuck, clear and restart
localStorage.clear();
location.href = '/login';
```

---

## 🎯 Success Criteria

✅ **PASSING:**
- [ ] All localStorage keys use hyphens
- [ ] No old `life_design_*` keys exist
- [ ] Data persists across page refreshes
- [ ] Data persists across browser restarts
- [ ] Can complete onboarding start to finish
- [ ] Redirects work correctly (onboarding ↔ dashboard)
- [ ] No console errors
- [ ] No hydration warnings
- [ ] Works in private/incognito mode

❌ **FAILING:**
- Old keys (`life_design_*`) found in localStorage
- Data lost after refresh
- Can access /dashboard without onboarding
- Console errors appear
- Layout shifts during page load
- App crashes in private browsing mode

---

## 🆘 Emergency Reset

If everything breaks:

```javascript
// Nuclear option - clear everything and restart
localStorage.clear();
sessionStorage.clear();
document.cookie.split(";").forEach(c => {
  document.cookie = c.replace(/^ +/, "")
    .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
});
location.href = '/login';
```

---

## 📞 Getting Help

### Check These First:
1. Browser Console (F12) for errors
2. DevTools → Application → localStorage
3. Network tab for failed requests
4. `GUEST_MODE_BUG_REPORT.md` for known issues

### Debug Commands:
```javascript
// Full diagnostic
runAllTests();

// Individual tests
testStorage();
testProfile();
testGoals();
testPersistence();
testNavigation();

// Get help
help();
```

---

## 📊 Test Results Template

Copy this to report results:

```
=== GUEST MODE TEST RESULTS ===
Date: [DATE]
Time: [TIME]
Browser: [BROWSER + VERSION]
URL: https://life-design-brown.vercel.app

[ ] localStorage keys correct (hyphens, not underscores)
[ ] Data persists across refresh
[ ] Data persists across browser restart
[ ] Onboarding completes successfully
[ ] Dashboard accessible after onboarding
[ ] Navigation guards work
[ ] No console errors
[ ] No layout shift
[ ] Works in private browsing

Issues Found:
1. 
2. 
3. 

Notes:


Tester: [NAME]
```

---

**Last Updated:** March 13, 2026
**Version:** 1.0
**Status:** ✅ Ready for Testing
