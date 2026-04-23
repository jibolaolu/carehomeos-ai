import { NextResponse } from "next/server";
import { getAuthSession } from "../../../../lib/auth-session";

export async function GET() {
  const session = await getAuthSession();

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      name: session.name,
      email: session.email,
      role: session.role,
      roles: session.roles,
      permissions: session.permissions,
      careHomeId: session.careHomeId,
      careHomeName: session.careHomeName,
      adminLevel: session.adminLevel,
      platformScope: session.platformScope,
    },
  });
}
