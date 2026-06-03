import { NextResponse } from "next/server";
import { getAuthSession } from "../../../../lib/auth-session";
import { resolveRoleHome } from "../../../../lib/rbac";

export async function GET() {
  const session = await getAuthSession();

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const user = {
    name: session.name,
    email: session.email,
    role: session.role,
    roles: session.roles,
    permissions: session.permissions,
    careHomeId: session.careHomeId,
    careHomeName: session.careHomeName,
    adminLevel: session.adminLevel,
    platformScope: session.platformScope,
  };

  return NextResponse.json({
    authenticated: true,
    home: resolveRoleHome(user),
    user,
  });
}
