/** Canonical public dashboard URL for local HTTPS proxy development. */
export const LOCAL_DASHBOARD_ORIGIN = "https://carehomeos.localtest.me";

function configuredDashboardOrigin(): string {
  for (const key of ["PUBLIC_DASHBOARD_URL", "NEXT_PUBLIC_DASHBOARD_URL", "AUTH0_BASE_URL"]) {
    const value = process.env[key]?.trim();
    if (!value) {
      continue;
    }
    try {
      return new URL(value).origin;
    } catch {
      continue;
    }
  }
  return LOCAL_DASHBOARD_ORIGIN;
}

function requestHostname(request: { headers: Headers; nextUrl: URL }): string {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host") || request.nextUrl.host;
  return host.split(":")[0].toLowerCase();
}

/** Public browser origin — never localhost when the app is served via localtest.me. */
export function getPublicOrigin(request: {
  headers: Headers;
  nextUrl: URL;
}): string {
  const configured = configuredDashboardOrigin();
  const hostname = requestHostname(request);
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || request.nextUrl.protocol.replace(":", "");

  if (hostname === "carehomeos.localtest.me") {
    return LOCAL_DASHBOARD_ORIGIN;
  }

  // Reverse proxy forwards to localhost:3105 — keep redirects/cookies on the public host.
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return configured;
  }

  if (protocol === "https") {
    return `https://${hostname}`;
  }

  return configured;
}

export function isSecureRequest(request: {
  headers: Headers;
  nextUrl: URL;
}) {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || request.nextUrl.protocol.replace(":", "");
  return protocol === "https";
}

export function publicUrl(
  request: { headers: Headers; nextUrl: URL },
  pathname: string,
  searchParams?: Record<string, string>,
) {
  const url = new URL(pathname, getPublicOrigin(request));
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }
  return url;
}
