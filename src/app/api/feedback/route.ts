import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { uploadToR2, isR2Configured } from "@/lib/r2";

const VALID_TYPES = ["BUG", "FEATURE", "SUGGESTION"] as const;
const MAX_TITLE_LENGTH = 200;
const MAX_DESC_LENGTH = 5000;
const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const rl = await checkEndpointRateLimit(session.user.id, "feedback", 10, "1 d");
    if (!rl.success) {
      return NextResponse.json(
        { error: "You've reached the daily feedback limit. Please try again tomorrow." },
        { status: 429 },
      );
    }

    const formData = await req.formData();
    const type = formData.get("type") as string;
    const title = (formData.get("title") as string)?.trim();
    const description = (formData.get("description") as string)?.trim();
    const category = (formData.get("category") as string)?.trim() || null;
    const screenshot = formData.get("screenshot") as File | null;
    const userAgent = req.headers.get("user-agent") || "";
    const pageUrl = (formData.get("pageUrl") as string)?.trim() || "";

    // Validate
    if (!type || !VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
      return NextResponse.json({ error: "Invalid feedback type" }, { status: 400 });
    }
    if (!title || title.length > MAX_TITLE_LENGTH) {
      return NextResponse.json({ error: "Title is required (max 200 characters)" }, { status: 400 });
    }
    if (!description || description.length > MAX_DESC_LENGTH) {
      return NextResponse.json({ error: "Description is required (max 5000 characters)" }, { status: 400 });
    }

    // Upload screenshot if provided
    let screenshotUrl: string | null = null;
    if (screenshot && screenshot.size > 0) {
      if (screenshot.size > MAX_SCREENSHOT_SIZE) {
        return NextResponse.json({ error: "Screenshot must be under 5MB" }, { status: 400 });
      }

      if (isR2Configured()) {
        const buffer = Buffer.from(await screenshot.arrayBuffer());
        const result = await uploadToR2(buffer, `feedback-${Date.now()}.${screenshot.name.split(".").pop() || "png"}`, screenshot.type);
        if (result.success) {
          screenshotUrl = result.url;
        }
      }
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId: session.user.id,
        type: type as (typeof VALID_TYPES)[number],
        title,
        description,
        category,
        screenshotUrl,
        metadata: { userAgent, pageUrl },
      },
    });

    return NextResponse.json({ success: true, id: feedback.id });
  } catch (error) {
    console.error("[feedback] Error:", error);
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const feedbacks = await prisma.feedback.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ feedbacks });
  } catch (error) {
    console.error("[feedback] Error:", error);
    return NextResponse.json({ error: "Failed to load feedback" }, { status: 500 });
  }
}
