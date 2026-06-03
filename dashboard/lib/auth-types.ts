export const AUTH_COOKIE_NAME = "carehomeos.auth";

export type AuthSession = {
  name: string;
  email: string;
  role: string;
  roles: string[];
  permissions: string[];
  careHomeId?: string | null;
  careHomeName?: string | null;
  adminLevel?: string | null;
  platformScope?: string | null;
  idToken?: string;
  accessToken?: string;
  expiresAt: number;
};

export type AuthSessionSummary = Pick<
  AuthSession,
  | "name"
  | "email"
  | "role"
  | "roles"
  | "permissions"
  | "careHomeId"
  | "careHomeName"
  | "adminLevel"
  | "platformScope"
>;
