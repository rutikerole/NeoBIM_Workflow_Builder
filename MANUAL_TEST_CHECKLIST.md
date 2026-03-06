# ✅ MANUAL TEST CHECKLIST (15-30 MIN)

**Use this checklist to complete the remaining validation before launch.**

---

## 🔐 AUTHENTICATION & PROTECTED ROUTES (5 min)

### Test 1: Unauthenticated Access
- [ ] Open browser (Chrome)
- [ ] Navigate to `http://localhost:3001/dashboard` (or production URL)
- [ ] **EXPECT:** Redirect to `/login` OR overlay blocking UI
- [ ] **FAIL IF:** Dashboard fully accessible without login

### Test 2: Registration Flow
- [ ] Click "Register" or navigate to `/register`
- [ ] Fill form: `test@example.com`, password, confirm
- [ ] Click "Register"
- [ ] **EXPECT:** Redirect to `/dashboard`
- [ ] **VERIFY:** Session cookie set
- [ ] **VERIFY:** User shown in DB

### Test 3: Login Flow
- [ ] Logout (if logged in)
- [ ] Navigate to `/login`
- [ ] Enter credentials
- [ ] **EXPECT:** Redirect to `/dashboard`
- [ ] **VERIFY:** Session persists on refresh

---

## 🎨 WORKFLOW BUILDER (5 min)

### Test 4: Create Blank Workflow
- [ ] Click "New Workflow" or "New Blank Workflow"
- [ ] **VERIFY:** Canvas editor opens
- [ ] Drag "Text Prompt" node to canvas
- [ ] Drag "Building Generator" node to canvas
- [ ] Connect nodes
- [ ] Click "Save" (name: "Test Workflow 1")
- [ ] **VERIFY:** Saved message appears
- [ ] Navigate to "My Workflows"
- [ ] **VERIFY:** "Test Workflow 1" listed

### Test 5: Clone Template
- [ ] Navigate to "Templates"
- [ ] Click "Text Prompt → Concept Building"
- [ ] **VERIFY:** Canvas loads with pre-built workflow
- [ ] Click "Save as Copy"
- [ ] **VERIFY:** Saved to "My Workflows"

---

## ⚡ WORKFLOW EXECUTION (5-10 min)

### Test 6: Run Workflow (if OpenAI credits available)
- [ ] Open saved workflow
- [ ] Fill input (e.g., "Modern office building, 5 stories")
- [ ] Click "Run Workflow"
- [ ] **VERIFY:** Progress indicator shows
- [ ] **VERIFY:** Each node completes
- [ ] **VERIFY:** Results display (3D, images, JSON)
- [ ] **VERIFY:** Artifacts downloadable

**IF NO OPENAI CREDITS:**
- [ ] **VERIFY:** Mock execution shows (fake data)
- [ ] **VERIFY:** Message: "Mock mode — connect OPENAI_API_KEY for real results"

---

## 🚧 RATE LIMITING (3 min)

### Test 7: Free Tier Limit
- [ ] Run workflow 3 times (free tier limit)
- [ ] On 4th attempt, click "Run"
- [ ] **VERIFY:** Error message: "Rate limit exceeded"
- [ ] **VERIFY:** "Upgrade to Pro" button appears
- [ ] **VERIFY:** Execution blocked

---

## 💳 STRIPE INTEGRATION (5-10 min)

### Test 8: Upgrade Flow
- [ ] Click "Upgrade to Pro" (from rate limit or billing page)
- [ ] **VERIFY:** Redirect to Stripe Checkout
- [ ] **VERIFY:** Pricing shows: "$79/month"
- [ ] **VERIFY:** Plan name: "Pro"
- [ ] Enter test card: `4242 4242 4242 4242`, any future date, any CVC
- [ ] Complete checkout
- [ ] **VERIFY:** Redirect back to app
- [ ] **VERIFY:** Success message
- [ ] **VERIFY:** User tier updated to "pro" in database
- [ ] Run workflow again
- [ ] **VERIFY:** No rate limit (unlimited runs)

### Test 9: Billing Portal
- [ ] Navigate to `/dashboard/billing`
- [ ] **VERIFY:** Current plan displays (Pro, $79/month)
- [ ] Click "Manage Billing"
- [ ] **VERIFY:** Redirect to Stripe Customer Portal
- [ ] **VERIFY:** Can see subscription details
- [ ] **VERIFY:** Can cancel subscription (DON'T actually cancel)

---

## 🎨 UI/UX VALIDATION (3 min)

### Test 10: Console Errors
- [ ] Open browser DevTools (F12)
- [ ] Navigate through pages: Landing → Register → Dashboard → Canvas → Billing
- [ ] **VERIFY:** No red errors in console (warnings OK)
- [ ] **FAIL IF:** JavaScript errors, failed network requests

### Test 11: Responsive Design (Mobile)
- [ ] Open DevTools → Device Toolbar (Ctrl+Shift+M)
- [ ] Select iPhone 12 Pro
- [ ] Test: Landing page, Dashboard, Canvas
- [ ] **VERIFY:** UI adapts (no horizontal scroll, text readable)
- [ ] **VERIFY:** Buttons clickable, forms usable

---

## 🚀 PERFORMANCE (5 min)

### Test 12: Lighthouse Audit
- [ ] Open Chrome DevTools → Lighthouse tab
- [ ] Select: Performance, Accessibility, Best Practices, SEO
- [ ] Run audit on Landing page (`/`)
- [ ] **VERIFY:** Performance score >85
- [ ] **VERIFY:** Accessibility score >90
- [ ] Run audit on Dashboard (`/dashboard`)
- [ ] **VERIFY:** Performance score >80

---

## 🌐 CROSS-BROWSER (OPTIONAL, 10 min)

### Test 13: Safari
- [ ] Open Safari
- [ ] Test: Landing → Register → Dashboard → Workflow
- [ ] **VERIFY:** No visual bugs
- [ ] **VERIFY:** All features work

### Test 14: Firefox
- [ ] Open Firefox
- [ ] Test: Landing → Register → Dashboard
- [ ] **VERIFY:** No major issues

---

## 📋 FINAL VERIFICATION

### Emergency Fixes (Visual Confirmation)
- [ ] Landing page: **NO** Foster, Arup, SOM, BIG, Zaha, HOK logos
- [ ] Landing page: **NO** "2,400+ professionals" claim
- [ ] Landing page: **YES** "EARLY ACCESS" badge visible
- [ ] Dashboard stats: Time estimate says "2-3 min" (NOT "30s")
- [ ] Templates: IFC description says "Basic export" (NOT "standards-compliant")

---

## ✅ CHECKLIST COMPLETE

**Items Tested:** _____ / 14  
**Items Passed:** _____ / _____  
**Critical Failures:** _____ (0 = PASS)

---

## 🎯 DECISION

**IF ALL TESTS PASS:**  
✅ **APPROVED FOR DEPLOYMENT**

**IF 1-2 MINOR ISSUES:**  
⚠️ **DEPLOY WITH MONITORING** (fix in first patch)

**IF 3+ ISSUES OR 1 CRITICAL:**  
🔴 **HOLD DEPLOYMENT** (fix before launch)

---

**Tester Name:** _________________  
**Date/Time:** _________________  
**Signature:** ✅ APPROVED / ⏸️ HOLD / 🔴 REJECT

---

🔥 **COMPLETE THIS CHECKLIST BEFORE PRODUCTION DEPLOY** 🔥
