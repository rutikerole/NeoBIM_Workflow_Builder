import { NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { formatErrorResponse, UserErrors, detectOpenAIError } from "@/lib/user-errors";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(formatErrorResponse(UserErrors.UNAUTHORIZED), { status: 401 });
    }

    // Rate limit: 20 requests per minute
    const rateLimit = await checkEndpointRateLimit(session.user.id, "ai-chat", 20, "1 m");
    if (!rateLimit.success) {
      return NextResponse.json(formatErrorResponse({
        title: "Too many requests",
        message: "Please wait a moment before sending another message.",
        code: "RATE_001",
      }), { status: 429 });
    }

    const body = (await req.json()) as { message?: string; systemPrompt?: string };
    const { message, systemPrompt } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(formatErrorResponse(UserErrors.INVALID_INPUT, "Message is required"), { status: 400 });
    }

    if (message.length > 2000) {
      return NextResponse.json(formatErrorResponse(UserErrors.PROMPT_TOO_LONG, "Message too long (max 2000 chars)"), { status: 400 });
    }

    // Validate systemPrompt if provided — prevent injection and token exhaustion
    if (systemPrompt !== undefined) {
      if (typeof systemPrompt !== "string") {
        return NextResponse.json(formatErrorResponse(UserErrors.INVALID_INPUT, "systemPrompt must be a string"), { status: 400 });
      }
      if (systemPrompt.length > 1000) {
        return NextResponse.json(formatErrorResponse(UserErrors.INVALID_INPUT, "systemPrompt too long (max 1000 chars)"), { status: 400 });
      }
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(formatErrorResponse(UserErrors.OPENAI_INVALID_KEY), { status: 500 });
    }

    const client = new OpenAI({ apiKey });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt || "You are a helpful AEC workflow assistant." },
        { role: "user", content: message },
      ],
      max_tokens: 800,
      temperature: 0.3,
    });

    const reply = completion.choices[0]?.message?.content || "I couldn't generate a response.";

    return NextResponse.json({ reply });
  } catch (error: unknown) {
    console.error("[AI Chat]", error);
    const userError = detectOpenAIError(error);
    return NextResponse.json(formatErrorResponse(userError), { status: 500 });
  }
}
