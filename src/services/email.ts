import { Resend } from 'resend';
import {
  welcomeEmail,
  paymentFailedEmail,
  subscriptionCanceledEmail,
  planChangedEmail,
} from './email-templates';

// Initialize Resend — uses placeholder during build
const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'BuildFlow <noreply@buildflow.app>';

/** Map role enum to display name */
function planDisplayName(role: string): string {
  switch (role) {
    case 'MINI': return 'Mini';
    case 'STARTER': return 'Starter';
    case 'PRO': return 'Pro';
    case 'TEAM_ADMIN': return 'Team';
    default: return 'Free';
  }
}

// ── Core send function ─────────────────────────────────────────────────────────

async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not configured, skipping email to:', to);
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('[email] Resend error:', error);
      return false;
    }

    console.info('[email] Sent:', { to, subject });
    return true;
  } catch (err) {
    console.error('[email] Failed to send:', err);
    return false;
  }
}

// ── Event-specific senders ─────────────────────────────────────────────────────

export async function sendWelcomeEmail(email: string, name: string | null, role: string): Promise<void> {
  const plan = planDisplayName(role);
  await sendEmail({
    to: email,
    subject: `Welcome to BuildFlow ${plan}! 🏗️`,
    html: welcomeEmail(name, plan),
  });
}

export async function sendPaymentFailedEmail(email: string, name: string | null): Promise<void> {
  await sendEmail({
    to: email,
    subject: 'Action Required: Payment Failed — BuildFlow',
    html: paymentFailedEmail(name),
  });
}

export async function sendSubscriptionCanceledEmail(email: string, name: string | null, role: string): Promise<void> {
  const plan = planDisplayName(role);
  await sendEmail({
    to: email,
    subject: `Your BuildFlow ${plan} subscription has been canceled`,
    html: subscriptionCanceledEmail(name, plan),
  });
}

export async function sendPlanChangedEmail(
  email: string,
  name: string | null,
  oldRole: string,
  newRole: string,
  type: 'upgrade' | 'downgrade',
): Promise<void> {
  const oldPlan = planDisplayName(oldRole);
  const newPlan = planDisplayName(newRole);
  await sendEmail({
    to: email,
    subject: type === 'upgrade'
      ? `Plan upgraded to ${newPlan} — BuildFlow`
      : `Plan changed to ${newPlan} — BuildFlow`,
    html: planChangedEmail(name, oldPlan, newPlan, type),
  });
}
