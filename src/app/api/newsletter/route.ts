import { NextResponse } from "next/server";
import { checkEndpointRateLimit, getClientIp } from "@/lib/rate-limit";

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    try {
      const rl = await checkEndpointRateLimit(ip, "newsletter", 5, "1 h");
      if (!rl.success) {
        return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
      }
    } catch {
      // Allow through if rate limiter is unavailable — don't block newsletter signups
    }

    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const source = typeof body?.source === "string" ? body.source : "organic";

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    // Fire-and-forget: write to newsletter log file (best-effort, won't block response)
    import("fs/promises").then(async (fs) => {
      const path = await import("path");
      const logDir = path.join(process.cwd(), "analytics-logs");
      const logFile = path.join(logDir, "newsletter-signups.jsonl");
      await fs.mkdir(logDir, { recursive: true });
      await fs.appendFile(
        logFile,
        JSON.stringify({ email, timestamp: new Date().toISOString(), ip: ip.substring(0, 8) + "***", source }) + "\n",
        "utf-8"
      );
    }).catch(() => {
      // Filesystem may be read-only (e.g. Vercel) — silently ignore
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[newsletter] Error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
