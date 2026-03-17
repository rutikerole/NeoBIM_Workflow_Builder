import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateAdminCredentials, getAdminSessionCookie } from "@/lib/admin-auth";
import { getAdminSession, unauthorizedResponse, logAudit } from "@/lib/admin-server";

/** GET /api/admin — return current admin session info */
export async function GET() {
  const session = await getAdminSession();
  if (!session) return unauthorizedResponse();
  return NextResponse.json({ admin: session });
}

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    const admin = await validateAdminCredentials(username, password);
    if (!admin) {
      await logAudit(null, "ADMIN_LOGIN", "admin", null, {
        username,
        success: false,
      });
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Get the fresh session token
    const freshAdmin = await prisma.adminAccount.findUnique({
      where: { id: admin.id },
      select: { sessionToken: true },
    });

    const sessionToken = freshAdmin?.sessionToken ?? "";

    await logAudit(admin.id, "ADMIN_LOGIN", "admin", admin.id, {
      username: admin.username,
      success: true,
    });

    const response = NextResponse.json({
      success: true,
      admin: { id: admin.id, displayName: admin.displayName, role: admin.role },
    });
    response.headers.set("Set-Cookie", getAdminSessionCookie(admin.id, sessionToken));
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
