import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getAdminSession, unauthorizedResponse, forbiddenResponse, logAudit } from "@/lib/admin-server";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return unauthorizedResponse();

  const accounts = await prisma.adminAccount.findMany({
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    accounts: accounts.map((a) => ({
      ...a,
      lastLoginAt: a.lastLoginAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return unauthorizedResponse();
  if (session.role !== "SUPER_ADMIN") return forbiddenResponse();

  const { username, password, displayName, role } = await req.json();

  if (!username || !password || !displayName) {
    return NextResponse.json({ error: "Username, password, and display name are required" }, { status: 400 });
  }

  if (!["SUPER_ADMIN", "ADMIN", "VIEWER"].includes(role || "ADMIN")) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Check if username already exists
  const existing = await prisma.adminAccount.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: "Username already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const account = await prisma.adminAccount.create({
    data: {
      username,
      passwordHash,
      displayName,
      role: role || "ADMIN",
    },
    select: { id: true, username: true, displayName: true, role: true },
  });

  await logAudit(session.id, "ADMIN_CREATED", "admin", account.id, {
    username: account.username,
    role: account.role,
  });

  return NextResponse.json({ success: true, account });
}
