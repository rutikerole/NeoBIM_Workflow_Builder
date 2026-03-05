# Stripe Integration - Setup & Testing Guide

## ✅ What's Been Implemented (90% Complete)

### 1. **Database Schema** ✅
- Added Stripe fields to User model:
  - `stripeCustomerId` - Unique Stripe customer ID
  - `stripeSubscriptionId` - Active subscription ID
  - `stripePriceId` - Current price/plan ID
  - `stripeCurrentPeriodEnd` - Subscription expiry date

### 2. **Stripe Configuration** ✅
- `src/lib/stripe.ts` - Stripe client & plan configuration
  - FREE: $0 (3 runs/day)
  - PRO: $79/month (unlimited runs)
  - TEAM: $149/month (unlimited + team features)

### 3. **API Routes** ✅

#### `/api/stripe/checkout-session` (POST)
- Creates Stripe checkout session
- Handles customer creation
- Redirects to success/cancel URLs

#### `/api/stripe/customer-portal` (POST)
- Opens Stripe billing portal
- Allows users to manage subscriptions

#### `/api/stripe/webhook` (POST)
- Handles Stripe webhook events:
  - `checkout.session.completed` - Update user on successful payment
  - `customer.subscription.created` - New subscription
  - `customer.subscription.updated` - Plan change or renewal
  - `customer.subscription.deleted` - Cancellation
  - `invoice.payment_succeeded` - Payment success
  - `invoice.payment_failed` - Payment failure

### 4. **Usage Limits** ✅
- Updated `src/lib/rate-limit.ts`:
  - FREE users: 3 runs/day
  - PRO/TEAM: Unlimited (1000/day soft limit)
  - Checks subscription expiry before allowing access
  - Auto-downgrades expired subscriptions to FREE tier

### 5. **Subscription Helpers** ✅
- `src/lib/subscription.ts`:
  - `getSubscriptionStatus()` - Get user's subscription details
  - `hasFeatureAccess()` - Check if user can access premium features

---

## 🚀 Setup Instructions (For Govind - Tomorrow Morning)

### Step 1: Environment Variables

Add these to `.env.local`:

```bash
# Stripe (Get from Stripe Dashboard - Test Mode)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRO_PRICE_ID="price_..."
STRIPE_TEAM_PRICE_ID="price_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

### Step 2: Stripe Dashboard Setup

1. **Create Products & Prices:**
   - Go to Stripe Dashboard > Products
   - Create "Pro Plan" - $79/month recurring
   - Create "Team Plan" - $149/month recurring
   - Copy price IDs to `.env.local`

2. **Create Webhook:**
   - Go to Stripe Dashboard > Webhooks
   - Add endpoint: `https://your-domain.com/api/stripe/webhook`
   - Select events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy webhook secret to `.env.local`

### Step 3: Database Migration

```bash
npx prisma migrate dev --name add_stripe_fields
npx prisma generate
```

### Step 4: Test Locally with Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Test payment
stripe trigger checkout.session.completed
```

---

## 🧪 Testing Checklist

### Manual Testing (Use Stripe Test Cards)

1. **Checkout Flow:**
   - [ ] Click "Upgrade to Pro"
   - [ ] Redirects to Stripe checkout
   - [ ] Use test card: `4242 4242 4242 4242`
   - [ ] Complete payment
   - [ ] Redirects back to dashboard with `?payment=success`
   - [ ] User role updated to PRO in database

2. **Usage Limits:**
   - [ ] FREE user can run 3 workflows/day
   - [ ] PRO user can run unlimited workflows
   - [ ] Expired PRO subscription falls back to FREE limits

3. **Customer Portal:**
   - [ ] Click "Manage Billing"
   - [ ] Opens Stripe portal
   - [ ] Can cancel subscription
   - [ ] Cancellation triggers webhook
   - [ ] User role downgraded to FREE

4. **Webhook Events:**
   - [ ] Payment success → User upgraded
   - [ ] Payment failed → Email sent (optional)
   - [ ] Subscription canceled → User downgraded
   - [ ] Check logs: `[STRIPE_WEBHOOK] Event received: ...`

### Test Cards (Stripe Test Mode)

| Card Number         | Scenario              |
|---------------------|-----------------------|
| 4242 4242 4242 4242 | Success               |
| 4000 0000 0000 0002 | Decline               |
| 4000 0000 0000 9995 | Insufficient funds    |

---

## 📁 File Structure

```
src/
├── lib/
│   ├── stripe.ts           # Stripe client & config
│   ├── subscription.ts     # Subscription helpers
│   └── rate-limit.ts       # Updated with subscription checks
├── app/api/stripe/
│   ├── checkout-session/route.ts  # Create checkout
│   ├── customer-portal/route.ts   # Billing portal
│   └── webhook/route.ts           # Webhook handler
prisma/
└── schema.prisma           # Updated User model
```

---

## 🐛 Known Issues & TODOs (10% Remaining)

### Govind's Tasks (2 hours tomorrow):

1. **Frontend Integration:**
   - [ ] Create pricing page component
   - [ ] Add "Upgrade" button to dashboard
   - [ ] Show subscription status in user menu
   - [ ] Display usage limits on dashboard

2. **Email Notifications (Optional):**
   - [ ] Payment success email
   - [ ] Payment failed email
   - [ ] Subscription expiry warning (7 days before)

3. **Testing:**
   - [ ] Run full test suite
   - [ ] Verify webhook signature in production
   - [ ] Test edge cases (expired cards, canceled payments)

4. **Deployment:**
   - [ ] Add Stripe env vars to Vercel
   - [ ] Create production webhook endpoint
   - [ ] Test on staging environment

---

## 🔒 Security Checklist

- [x] Webhook signature verification enabled
- [x] Stripe secret keys in environment variables (not hardcoded)
- [x] User authentication required for all Stripe API routes
- [x] Rate limiting applied to prevent abuse
- [ ] HTTPS required for webhook endpoint (production only)
- [ ] Error logs don't expose sensitive data

---

## 📞 Support

**Stripe Docs:**
- Checkout: https://stripe.com/docs/payments/checkout
- Webhooks: https://stripe.com/docs/webhooks
- Testing: https://stripe.com/docs/testing

**Questions?** Check Stripe Dashboard > Logs for webhook events.

---

## 🎯 Success Criteria

By end of tomorrow (2 hours):
1. ✅ User can upgrade to Pro/Team via Stripe checkout
2. ✅ Webhook updates user subscription automatically
3. ✅ Usage limits enforced based on subscription
4. ✅ Customer portal allows billing management
5. ✅ All tests pass with Stripe test mode

**Let's ship this! 🚀**
