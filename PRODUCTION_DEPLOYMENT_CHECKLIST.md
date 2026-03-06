# ✅ PRODUCTION DEPLOYMENT CHECKLIST

## PRE-DEPLOYMENT (Critical - Do Before Deploy)

### 🔒 Security Fixes
- [ ] Fix hardcoded admin email in `src/app/api/execute-node/route.ts`
- [ ] Add `ADMIN_EMAIL` to production environment variables
- [ ] Verify no other hardcoded credentials in codebase
- [ ] Ensure `.env` and `.env.local` are in `.gitignore`

### 🗄️ Database
- [ ] Add missing performance indexes to `prisma/schema.prisma`
- [ ] Run `npx prisma migrate dev --name add-performance-indexes` (local)
- [ ] Test migrations work without errors
- [ ] Backup production database (if exists)
- [ ] Run `npx prisma migrate deploy` (production)
- [ ] Run `npx prisma generate`

### 💳 Stripe Configuration
- [ ] Verify `STRIPE_SECRET_KEY` is **production** key (not test)
- [ ] Verify `STRIPE_WEBHOOK_SECRET` is production webhook secret
- [ ] Verify `STRIPE_PRO_PRICE_ID` is production price ID
- [ ] Verify `STRIPE_TEAM_PRICE_ID` is production price ID
- [ ] Test Stripe checkout in test mode first
- [ ] Configure production webhook endpoint in Stripe dashboard:
  ```
  URL: https://yourdomain.com/api/stripe/webhook
  Events to subscribe:
    - checkout.session.completed
    - customer.subscription.created
    - customer.subscription.updated
    - customer.subscription.deleted
    - invoice.payment_succeeded
    - invoice.payment_failed
  ```

### 🌍 Environment Variables
- [ ] Set `NODE_ENV=production`
- [ ] Set `NEXTAUTH_URL=https://yourdomain.com`
- [ ] Set `NEXT_PUBLIC_APP_URL=https://yourdomain.com`
- [ ] Verify all API keys are production keys
- [ ] Add `SENTRY_DSN` or monitoring service DSN (recommended)

### 🧪 Testing
- [ ] Build succeeds: `npm run build`
- [ ] No TypeScript errors
- [ ] No ESLint warnings (critical only)
- [ ] Test one workflow execution locally
- [ ] Test Stripe checkout locally (test mode)
- [ ] Test rate limiting works for Free tier
- [ ] Test rate limiting works for Pro tier

---

## DEPLOYMENT

### 🚀 Deploy Application
- [ ] Deploy to Vercel/AWS/Netlify
- [ ] Deployment succeeds without errors
- [ ] Verify build logs for warnings

### 🔍 Post-Deploy Verification
- [ ] Homepage loads: `https://yourdomain.com`
- [ ] Login works (Google OAuth + credentials)
- [ ] Dashboard loads after login
- [ ] Database connection verified (check logs)
- [ ] Redis connection verified (Upstash)

### 🧪 End-to-End Testing
- [ ] Create new workflow
- [ ] Add nodes to canvas
- [ ] Execute workflow (all node types):
  - [ ] TR-003 (Building Description)
  - [ ] GN-003 (Concept Image)
  - [ ] TR-007 (Quantity Extractor)
  - [ ] TR-008 (BOQ Cost Mapper)
  - [ ] EX-002 (Excel Export)
- [ ] View execution history
- [ ] Delete workflow

### 💳 Stripe Integration Testing
- [ ] Navigate to billing page
- [ ] Click "Upgrade to Pro"
- [ ] Complete checkout with test card: `4242 4242 4242 4242`
- [ ] Verify webhook received (check Stripe dashboard)
- [ ] Verify user role updated to PRO in database
- [ ] Verify rate limits updated to Pro tier (1000/day)
- [ ] Test customer portal access
- [ ] Test subscription cancellation

### 📊 Monitoring Setup
- [ ] Configure error tracking (Sentry/Datadog/etc.)
- [ ] Set up alerting for:
  - [ ] Error rate >5%
  - [ ] API response time >1s
  - [ ] Database connection failures
  - [ ] Stripe webhook failures
- [ ] Configure log aggregation (if needed)
- [ ] Set up uptime monitoring (Pingdom/UptimeRobot)

---

## POST-DEPLOYMENT (First 24 Hours)

### 📈 Monitoring
- [ ] Monitor error rates (target: <1%)
- [ ] Monitor API response times:
  - [ ] GET /api/workflows: <200ms
  - [ ] GET /api/executions: <200ms
  - [ ] POST /api/execute-node: <5s (AI nodes)
- [ ] Monitor rate limit hits (track conversions)
- [ ] Monitor Stripe webhook deliveries
- [ ] Check database query performance

### 🐛 Issue Tracking
- [ ] Any 500 errors? → Investigate immediately
- [ ] Any slow queries? → Add indexes
- [ ] Any failed webhooks? → Check Stripe dashboard
- [ ] Any user reports? → Log and triage

### 📊 Metrics to Track
- [ ] Signups (first 24h)
- [ ] Workflow executions (first 24h)
- [ ] Free tier conversions to Pro
- [ ] Error rate
- [ ] Average response time
- [ ] Database query count

---

## OPTIONAL IMPROVEMENTS (Week 1)

### 🔧 Performance
- [ ] Add pagination to `/api/executions`
- [ ] Add pagination to `/api/workflows`
- [ ] Add rate limit headers to responses
- [ ] Implement API response caching (Redis)

### 📊 Observability
- [ ] Implement structured logging (`src/lib/logger.ts`)
- [ ] Add analytics tracking in Stripe webhook
- [ ] Set up custom metrics dashboard
- [ ] Configure Slack/Discord alerts

### 🏗️ Technical Debt
- [ ] Refactor execute-node to node registry pattern
- [ ] Add idempotency check to Stripe webhook
- [ ] Replace `findFirst` with `findUnique` where possible
- [ ] Add soft deletes (if business requires)

---

## ROLLBACK PLAN (If Things Go Wrong)

### 🚨 Emergency Rollback
1. **Vercel:** Redeploy previous version from dashboard
2. **Database:** Restore from backup (if migration issue)
3. **Stripe:** Revert webhook endpoint to old URL
4. **Notify users:** Post status update

### 🔍 Common Issues & Fixes

**Issue: Database connection failed**
→ Check `DATABASE_URL` in environment variables
→ Verify Neon database is running
→ Check connection pooling config

**Issue: Stripe webhook not receiving events**
→ Verify webhook endpoint URL in Stripe dashboard
→ Check `STRIPE_WEBHOOK_SECRET` matches Stripe
→ Test with Stripe CLI: `stripe trigger checkout.session.completed`

**Issue: Rate limiting not working**
→ Check `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
→ Verify Redis connection in logs
→ Test with free tier user

**Issue: OpenAI quota exceeded**
→ Users should add their own API keys in settings
→ Check platform API key quota in OpenAI dashboard

---

## 📞 SUPPORT CONTACTS

- **Hosting:** Vercel/AWS support
- **Database:** Neon support (support@neon.tech)
- **Payments:** Stripe support (support@stripe.com)
- **Redis:** Upstash support (support@upstash.com)

---

## ✅ DEPLOYMENT COMPLETE

After completing all checklist items:
- [ ] Update team on deployment status
- [ ] Share production URL
- [ ] Monitor for first 24 hours
- [ ] Document any issues encountered
- [ ] Celebrate launch! 🎉

---

**Last Updated:** March 6, 2026  
**Status:** Ready for production deployment
