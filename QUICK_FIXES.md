# 🔧 QUICK FIXES - IMMEDIATE ACTIONS

## Fix #1: Hardcoded Admin Email
**File:** `src/app/api/execute-node/route.ts`
**Line:** ~37

```diff
-    // EMERGENCY ADMIN BYPASS
-    if (session?.user?.email === "erolerutik9@gmail.com") {
-      // Skip rate limiting entirely
-    } else {
+    const adminEmail = process.env.ADMIN_EMAIL;
+    if (adminEmail && session?.user?.email?.toLowerCase() === adminEmail.toLowerCase()) {
+      // Skip rate limiting for admin
+    } else {
```

**Then add to `.env.local` and `.env.example`:**
```bash
# Admin email for rate limit bypass
ADMIN_EMAIL="erolerutik9@gmail.com"
```

---

## Fix #2: Add Database Indexes
**File:** `prisma/schema.prisma`

Add these indexes to improve query performance:

```diff
model Execution {
  id          String          @id @default(cuid())
  // ... existing fields ...
  
  @@index([workflowId])
  @@index([userId])
+ @@index([status])
+ @@index([startedAt])
+ @@index([createdAt])
+ @@index([userId, status])
  @@map("executions")
}

model User {
  id            String    @id @default(cuid())
  // ... existing fields ...
  
+ @@index([role])
+ @@index([stripeCurrentPeriodEnd])
  @@map("users")
}

model Workflow {
  id          String         @id @default(cuid())
  // ... existing fields ...
  
  @@index([ownerId])
  @@index([isTemplate])
+ @@index([isPublished])
+ @@index([createdAt])
+ @@index([updatedAt])
+ @@index([ownerId, isPublished])
  @@map("workflows")
}

model CommunityPublication {
  id           String   @id @default(cuid())
  // ... existing fields ...
  
  @@index([authorId])
  @@index([ratingAvg])
  @@index([cloneCount])
+ @@index([isFeatured])
+ @@index([createdAt])
  @@map("community_publications")
}
```

**Then run migration:**
```bash
cd "/Users/rutikerole/Projects/NeoBIM Workflow Builder/workflow_builder"
npx prisma migrate dev --name add-performance-indexes
```

---

## Fix #3: Add ADMIN_EMAIL to .env.example
**File:** `.env.example`

```diff
# ============================================================
# RATE LIMITING (Upstash Redis)
# ============================================================
# For production: use Upstash Redis REST API
UPSTASH_REDIS_REST_URL="https://your-redis-instance.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"
# For local development: use local Redis (already configured above in REDIS_URL)

+# Admin email for rate limit bypass
+ADMIN_EMAIL="your-admin-email@example.com"
```

---

## Quick Apply Script

Run this to apply all fixes automatically:

```bash
cd "/Users/rutikerole/Projects/NeoBIM Workflow Builder/workflow_builder"

# 1. Add ADMIN_EMAIL to .env.example
echo "" >> .env.example
echo "# Admin email for rate limit bypass" >> .env.example
echo "ADMIN_EMAIL=\"erolerutik9@gmail.com\"" >> .env.example

# 2. Add ADMIN_EMAIL to .env.local
if [ -f .env.local ]; then
  echo "" >> .env.local
  echo "ADMIN_EMAIL=\"erolerutik9@gmail.com\"" >> .env.local
fi

echo "✅ Environment variables updated"
echo ""
echo "⚠️ MANUAL STEPS REQUIRED:"
echo "1. Fix hardcoded email in src/app/api/execute-node/route.ts (line ~37)"
echo "2. Add indexes to prisma/schema.prisma (see QUICK_FIXES.md)"
echo "3. Run: npx prisma migrate dev --name add-performance-indexes"
```

---

## Verification Checklist
After applying fixes:

- [ ] `grep -n "erolerutik9" src/app/api/execute-node/route.ts` → No matches
- [ ] `grep "ADMIN_EMAIL" .env.example` → Found
- [ ] `grep "ADMIN_EMAIL" .env.local` → Found
- [ ] Database indexes added to schema
- [ ] Migration created and applied
- [ ] Test API with admin email → rate limit bypassed
- [ ] Test API with non-admin email → rate limit applied
