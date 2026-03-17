import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getAdminSession, unauthorizedResponse, forbiddenResponse, logAudit } from "@/lib/admin-server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session) return unauthorizedResponse();
  if (session.role !== "SUPER_ADMIN") return forbiddenResponse();

  const { id } = await params;
  const body = await req.json();

  const updates: Record<string, unknown> = {};
  if (body.displayName) updates.displayName = body.displayName;
  if (body.role && ["SUPER_ADMIN", "ADMIN", "VIEWER"].includes(body.role)) updates.role = body.role;
  if (typeof body.isActive === "boolean") updates.isActive = body.isActive;
  if (body.password) updates.passwordHash = await bcrypt.hash(body.password, 12);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const account = await prisma.adminAccount.update({
    where: { id },
    data: updates,
    select: { id: true, username: true, displayName: true, role: true, isActive: true },
  });

  await logAudit(session.id, "ADMIN_UPDATED", "admin", id, {
    username: account.username,
    changes: Object.keys(updates).filter((k) => k !== "passwordHash"),
  });

  return NextResponse.json({ success: true, account });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session) return unauthorizedResponse();
  if (session.role !== "SUPER_ADMIN") return forbiddenResponse();

  const { id } = await params;

  // Prevent deleting yourself
  if (id === session.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  // Prevent deleting the last super admin
  const superAdminCount = await prisma.adminAccount.count({ where: { role: "SUPER_ADMIN" } });
  const target = await prisma.adminAccount.findUnique({ where: { id }, select: { role: true, username: true } });
  if (target?.role === "SUPER_ADMIN" && superAdminCount <= 1) {
    return NextResponse.json({ error: "Cannot delete the last super admin" }, { status: 400 });
  }

  await prisma.adminAccount.delete({ where: { id } });

  await logAudit(session.id, "ADMIN_DELETED", "admin", id, {
    username: target?.username,
  });

  return NextResponse.json({ success: true });
}
