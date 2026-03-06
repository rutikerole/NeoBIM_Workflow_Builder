import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { stripe, isSubscriptionActive } from '@/lib/stripe';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        role: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripePriceId: true,
        stripeCurrentPeriodEnd: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let subscriptionStatus = null;
    if (user.stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          user.stripeSubscriptionId
        );
        subscriptionStatus = {
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
          currentPeriodEnd: (subscription as unknown as { current_period_end?: number }).current_period_end
            ? new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000)
            : null,
        };
      } catch (error) {
        console.error('[STRIPE_SUBSCRIPTION] Failed to fetch subscription:', error);
      }
    }

    return NextResponse.json({
      role: user.role,
      subscription: subscriptionStatus,
      hasActiveSubscription: !!user.stripeSubscriptionId && isSubscriptionActive(user.stripeCurrentPeriodEnd),
    });
  } catch (error: unknown) {
    console.error('[STRIPE_SUBSCRIPTION]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
