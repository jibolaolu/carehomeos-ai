#!/usr/bin/env node
/**
 * CareHomeOS Auth0 tenant bootstrap script
 *
 * Creates (idempotent — safe to re-run):
 *   - CareHomeOS API resource server  (audience: https://carehomeos-api.localtest.me)
 *   - Dashboard application            (Regular Web Application)
 *   - Roles: super_admin, care_home_admin, sub_admin, staff
 *   - Post Login Action (injects https://carehomeos.local/ role + care-home claims)
 *   - Client grants for the dashboard app
 *   - Demo users (see DEMO_USERS below)
 *
 * Prerequisites:
 *   1. Auth0 tenant at https://manage.auth0.com
 *   2. A Machine-to-Machine app authorised for the Auth0 Management API with
 *      the scopes listed in REQUIRED_MGMT_SCOPES below.
 *
 * Usage (from repo root or scripts/):
 *   node scripts/setup-auth0.js
 *
 * Required env vars (root .env or exported):
 *   AUTH0_DOMAIN                 e.g. dev-careorchestrator.uk.auth0.com
 *   AUTH0_MANAGEMENT_CLIENT_ID
 *   AUTH0_MANAGEMENT_CLIENT_SECRET
 *
 * Optional overrides:
 *   DASHBOARD_BASE_URL           default: https://carehomeos.localtest.me
 *   API_BASE_URL                 default: https://carehomeos-api.localtest.me
 */

const https  = require("https");
const fs     = require("fs");
const path   = require("path");
const crypto = require("crypto");

const ROOT_DIR = path.resolve(__dirname, "..");

/* ── Load .env ──────────────────────────────────────────────────────────── */
function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  fs.readFileSync(filePath, "utf8").split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eq = trimmed.indexOf("=");
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  });
}

loadDotEnv(path.join(ROOT_DIR, ".env"));
loadDotEnv(path.join(ROOT_DIR, ".env.local"));

/* ── Config ─────────────────────────────────────────────────────────────── */
const DOMAIN = (
  process.env.AUTH0_DOMAIN ||
  (process.env.AUTH0_ISSUER_BASE_URL || "").replace(/^https?:\/\//, "").replace(/\/$/, "")
);
const MGMT_CLIENT_ID     = process.env.AUTH0_MANAGEMENT_CLIENT_ID     || "";
const MGMT_CLIENT_SECRET = process.env.AUTH0_MANAGEMENT_CLIENT_SECRET || "";
const DASHBOARD_BASE_URL = process.env.DASHBOARD_BASE_URL             || "https://carehomeos.localtest.me";
const API_BASE_URL       = process.env.API_BASE_URL                   || "https://carehomeos-api.localtest.me";
const API_IDENTIFIER     = process.env.AUTH0_AUDIENCE                 || API_BASE_URL;

const CALLBACK_URLS = [
  ...new Set([
    `${DASHBOARD_BASE_URL}/api/auth/callback`,
    "http://localhost:3000/api/auth/callback",
    "http://localhost:3105/api/auth/callback",
    "https://localhost:3105/api/auth/callback",
  ]),
];

const LOGOUT_URLS = [
  ...new Set([
    DASHBOARD_BASE_URL,
    `${DASHBOARD_BASE_URL}/`,
    `${DASHBOARD_BASE_URL}/login`,
    "http://localhost:3000",
    "http://localhost:3105",
  ]),
];

const ALLOWED_ORIGINS = [
  DASHBOARD_BASE_URL,
  "http://localhost:3000",
  "http://localhost:3105",
];

/* ── API scopes ─────────────────────────────────────────────────────────── */
const API_SCOPES = [
  { value: "read:residents",   description: "Read resident records" },
  { value: "write:residents",  description: "Create/update residents" },
  { value: "read:care-notes",  description: "Read care notes" },
  { value: "write:care-notes", description: "Record care notes" },
  { value: "read:rota",        description: "Read rota and shifts" },
  { value: "write:rota",       description: "Manage rota" },
  { value: "read:mar",         description: "Read medication records" },
  { value: "write:mar",        description: "Record medication" },
  { value: "read:cqc",         description: "Read CQC evidence" },
  { value: "read:finance",     description: "Read financial data" },
  { value: "manage:billing",   description: "Manage subscriptions" },
  { value: "admin:all",        description: "Platform super admin" },
];

/* ── Auth0 roles ─────────────────────────────────────────────────────────── */
const ROLES = [
  { name: "super_admin",      description: "CareHomeOS platform operator (full access)" },
  { name: "care_home_admin",  description: "Registered manager / care home admin" },
  { name: "sub_admin",        description: "Deputy/assistant manager" },
  { name: "staff",            description: "Front-line care staff" },
];

/* ── Demo users ──────────────────────────────────────────────────────────── */
const DEMO_USERS = [
  {
    email:    "superadmin@carehomeos.local",
    password: "CareHomeOS!2026",
    name:     "Sofia Platform",
    role:     "super_admin",
    app_metadata: {
      role: "super_admin",
      roles: ["super_admin"],
      platform_scope: "carehomeos_company",
    },
  },
  {
    email:    "manager@oakfield.local",
    password: "CareHomeOS!2026",
    name:     "Ruth Manager",
    role:     "care_home_admin",
    app_metadata: {
      role: "care_home_admin",
      roles: ["care_home_admin"],
      care_home_id: "home-oakfield",
      care_home_name: "Oakfield House",
      admin_level: "registered_manager",
    },
  },
  {
    email:    "deputy@oakfield.local",
    password: "CareHomeOS!2026",
    name:     "Devon Deputy",
    role:     "sub_admin",
    app_metadata: {
      role: "sub_admin",
      roles: ["sub_admin"],
      care_home_id: "home-oakfield",
      care_home_name: "Oakfield House",
      admin_level: "assistant_manager",
    },
  },
  {
    email:    "staff@oakfield.local",
    password: "CareHomeOS!2026",
    name:     "Amelia Williams",
    role:     "staff",
    app_metadata: {
      role: "staff",
      roles: ["staff"],
      care_home_id: "home-oakfield",
      care_home_name: "Oakfield House",
    },
  },
  {
    email:    "manager@demo.com",
    password: "DemoManager123!",
    name:     "Demo Manager",
    role:     "care_home_admin",
    app_metadata: {
      role: "care_home_admin",
      roles: ["care_home_admin"],
      care_home_id: "home-demo",
      care_home_name: "Demo Care Home Ltd",
      admin_level: "registered_manager",
    },
  },
  {
    email:    "admin@demo.com",
    password: "DemoAdmin123!",
    name:     "Demo Admin",
    role:     "super_admin",
    app_metadata: {
      role: "super_admin",
      roles: ["super_admin"],
      platform_scope: "carehomeos_company",
    },
  },
  {
    email:    "staff@demo.com",
    password: "DemoStaff123!",
    name:     "Demo Staff",
    role:     "staff",
    app_metadata: {
      role: "staff",
      roles: ["staff"],
      care_home_id: "home-demo",
      care_home_name: "Demo Care Home Ltd",
    },
  },
];

/* ── Post-login action ───────────────────────────────────────────────────── */
const POST_LOGIN_ACTION_NAME = "Add CareHomeOS Claims";
const CLAIM_NS = "https://carehomeos.local";
const POST_LOGIN_ACTION_CODE = `/**
 * CareHomeOS post-login action.
 * Injects role, roles, care_home_id, care_home_name, admin_level,
 * platform_scope claims into both the ID token and access token.
 */
exports.onExecutePostLogin = async (event, api) => {
  // This tenant is shared with other applications (NestIQ, PeopleOS, etc.).
  // Exit immediately for any client that is not a CareHomeOS application.
  if (!event.client.name.startsWith('CareHomeOS')) return;

  const ns = '${CLAIM_NS}/';
  const meta = event.user.app_metadata || {};

  const claimsToInject = [
    'role', 'roles', 'care_home_id', 'care_home_name',
    'admin_level', 'platform_scope',
  ];

  for (const key of claimsToInject) {
    const value = meta[key];
    if (value !== undefined && value !== null) {
      api.idToken.setCustomClaim(ns + key, value);
      api.accessToken.setCustomClaim(ns + key, value);
    }
  }

  // Also inject Auth0 roles from the Authorization object (fallback)
  const auth0Roles = event.authorization?.roles || [];
  if (auth0Roles.length > 0 && !meta.roles) {
    api.idToken.setCustomClaim(ns + 'roles', auth0Roles);
    api.accessToken.setCustomClaim(ns + 'roles', auth0Roles);
  }
};`;

/* ── Required management API scopes ─────────────────────────────────────── */
const REQUIRED_MGMT_SCOPES = [
  "read:resource_servers",
  "create:resource_servers",
  "update:resource_servers",
  "read:clients",
  "create:clients",
  "update:clients",
  "read:client_grants",
  "create:client_grants",
  "update:client_grants",
  "read:roles",
  "create:roles",
  "read:users",
  "create:users",
  "update:users",
  "update:users_app_metadata",
  "read:actions",
  "create:actions",
  "update:actions",
  "read:action_triggers",
  "update:action_triggers",
];

/* ── HTTP helpers ────────────────────────────────────────────────────────── */
function request(method, urlPath, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: DOMAIN,
      port: 443,
      path: urlPath,
      method,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
    };
    if (token) options.headers.Authorization = `Bearer ${token}`;

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
          else reject(new Error(`HTTP ${res.statusCode}: ${parsed.message || parsed.error || data}`));
        } catch {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
          else reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getMgmtToken() {
  const resp = await request("POST", "/oauth/token", {
    grant_type: "client_credentials",
    client_id: MGMT_CLIENT_ID,
    client_secret: MGMT_CLIENT_SECRET,
    audience: `https://${DOMAIN}/api/v2/`,
  });
  return resp.access_token;
}

function mgmt(token) {
  return {
    get:   (p)    => request("GET",   `/api/v2${p}`, null, token),
    post:  (p, b) => request("POST",  `/api/v2${p}`, b,    token),
    patch: (p, b) => request("PATCH", `/api/v2${p}`, b,    token),
  };
}

function die(msg) {
  console.error("\nERROR: " + msg);
  process.exit(1);
}

function isInsufficientScope(err) {
  const msg = err?.message || String(err);
  return msg.includes("Insufficient scope") || msg.includes("HTTP 403");
}

function printScopeHelp() {
  console.log("\n" + "=".repeat(70));
  console.log("AUTH0 MANAGEMENT API — ENABLE THESE SCOPES ON YOUR M2M APP");
  console.log("=".repeat(70));
  console.log("Auth0 Dashboard → Applications → [M2M app] → APIs → Auth0 Management API → Permissions\n");
  for (const scope of REQUIRED_MGMT_SCOPES) {
    console.log(`  - ${scope}`);
  }
  console.log("\nThen re-run:  node scripts/setup-auth0.js");
  console.log("=".repeat(70) + "\n");
}

/* ── Setup steps ─────────────────────────────────────────────────────────── */
async function getOrCreateApi(api) {
  console.log("Checking API resource server…");
  const servers = await api.get("/resource-servers");
  let rs = servers.find((s) => s.identifier === API_IDENTIFIER);

  const patch = {
    signing_alg: "RS256",
    token_lifetime: 86400,
    allow_offline_access: false,
    skip_consent_for_verifiable_first_party_clients: true,
  };

  if (rs) {
    console.log(`   OK  API exists: ${rs.name} (${rs.identifier})`);
    const existing = new Set((rs.scopes || []).map((s) => s.value));
    const missing  = API_SCOPES.filter((s) => !existing.has(s.value));
    if (missing.length) patch.scopes = [...(rs.scopes || []), ...missing];
    await api.patch(`/resource-servers/${rs.id}`, patch).catch((err) =>
      console.log(`   WARN  Could not patch API: ${err.message}`),
    );
    if (missing.length) console.log(`   Updated: added ${missing.length} new scope(s)`);
    return rs;
  }

  console.log("   Creating CareHomeOS API resource server…");
  rs = await api.post("/resource-servers", {
    name: "CareHomeOS API",
    identifier: API_IDENTIFIER,
    ...patch,
    scopes: API_SCOPES,
  });
  console.log(`   OK  Created: ${rs.name}`);
  return rs;
}

async function getOrCreateDashboardApp(api) {
  console.log("Checking Dashboard application…");
  const clients = await api.get("/clients?per_page=100");
  let client = clients.find((c) => c.name === "CareHomeOS Dashboard");

  const payload = {
    name: "CareHomeOS Dashboard",
    app_type: "regular_web",
    callbacks: CALLBACK_URLS,
    allowed_logout_urls: LOGOUT_URLS,
    allowed_origins: ALLOWED_ORIGINS,
    web_origins: ALLOWED_ORIGINS,
    grant_types: ["authorization_code", "refresh_token", "client_credentials"],
    jwt_configuration: { alg: "RS256" },
    oidc_conformant: true,
  };

  if (client) {
    console.log(`   OK  App exists: ${client.name} (${client.client_id})`);
    await api.patch(`/clients/${client.client_id}`, payload);
    console.log("      Updated callback URLs");
  } else {
    console.log("   Creating CareHomeOS Dashboard app…");
    client = await api.post("/clients", payload);
    console.log(`   OK  Created: ${client.name} (${client.client_id})`);
  }

  return client;
}

async function getOrCreateClientGrant(api, client) {
  console.log("Checking client grant…");
  let grants;
  try {
    grants = await api.get("/client-grants?per_page=100");
  } catch (err) {
    if (isInsufficientScope(err)) {
      console.log("   SKIP  Cannot list client grants — enable read:client_grants on your M2M app");
      return;
    }
    throw err;
  }

  const scopes = API_SCOPES.map((s) => s.value);
  const existing = grants.find(
    (g) => g.client_id === client.client_id && g.audience === API_IDENTIFIER,
  );

  if (existing) {
    // If allow_all_scopes is true, we can't patch scope — it's already authorized for everything
    if (existing.allow_all_scopes) {
      console.log("   OK  Grant exists with allow_all_scopes=true — no update needed");
      return;
    }
    const merged = [...new Set([...(existing.scope || []), ...scopes])];
    await api.patch(`/client-grants/${existing.id}`, { scope: merged });
    console.log("   OK  Grant updated: CareHomeOS Dashboard");
  } else {
    await api.post("/client-grants", {
      client_id: client.client_id,
      audience: API_IDENTIFIER,
      scope: scopes,
    });
    console.log("   OK  Grant created: CareHomeOS Dashboard");
  }
}

async function getOrCreateRoles(api) {
  console.log("Checking roles…");
  const allRoles = await api.get("/roles");
  const results  = [];
  for (const def of ROLES) {
    let role = allRoles.find((r) => r.name === def.name);
    if (role) {
      console.log(`   OK  Role exists: ${role.name}`);
    } else {
      try {
        role = await api.post("/roles", def);
        console.log(`   OK  Created role: ${role.name}`);
      } catch (err) {
        if (err.message && err.message.includes("409")) {
          const all = await api.get("/roles");
          role = all.find((r) => r.name === def.name);
          if (role) {
            console.log(`   OK  Role exists (re-fetched): ${role.name}`);
          } else {
            console.warn(`   WARN  Could not create role ${def.name}: ${err.message}`);
            continue;
          }
        } else {
          throw err;
        }
      }
    }
    results.push(role);
  }
  return results;
}

async function getOrCreatePostLoginAction() {
  console.log("Checking post-login Action…");
  const token = await getMgmtToken();

  const actionsResp = await request(
    "GET", "/api/v2/actions/actions?triggerId=post-login", null, token,
  );
  const actions = actionsResp.actions || [];
  let action = actions.find((a) => a.name === POST_LOGIN_ACTION_NAME);

  const payload = {
    code: POST_LOGIN_ACTION_CODE,
    runtime: "node22",
    supported_triggers: [{ id: "post-login", version: "v3" }],
  };

  if (action) {
    console.log(`   OK  Action exists: ${action.name}`);
    await request("PATCH", `/api/v2/actions/actions/${action.id}`, payload, token);
  } else {
    action = await request(
      "POST",
      "/api/v2/actions/actions",
      { name: POST_LOGIN_ACTION_NAME, ...payload },
      token,
    );
    console.log(`   OK  Created action: ${action.name}`);
  }

  console.log("   Waiting for action build…");
  let built = false;
  for (let i = 0; i < 15; i++) {
    const status = await request("GET", `/api/v2/actions/actions/${action.id}`, null, token);
    if (status.status === "built") { built = true; break; }
    await new Promise((r) => setTimeout(r, 2000));
  }

  if (!built) {
    console.log("   WARN  Action still building — deploy manually in Auth0 Dashboard");
  } else {
    await request("POST", `/api/v2/actions/actions/${action.id}/deploy`, {}, token);
    console.log("   OK  Action deployed");
  }

  const bindingsResp = await request(
    "GET", "/api/v2/actions/triggers/post-login/bindings", null, token,
  );
  const bindings = bindingsResp.bindings || [];
  if (!bindings.some((b) => b.action?.id === action.id)) {
    const existing = bindings.map((b) => ({
      display_name: b.display_name,
      ref: { type: "action_id", value: b.action?.id || b.ref?.value },
    }));
    await request(
      "PATCH",
      "/api/v2/actions/triggers/post-login/bindings",
      {
        bindings: [
          ...existing,
          { display_name: POST_LOGIN_ACTION_NAME, ref: { type: "action_id", value: action.id } },
        ],
      },
      token,
    );
    console.log("   OK  Bound to Login flow");
  } else {
    console.log("   OK  Already on Login flow");
  }
}

async function createDemoUsers(api, roles) {
  console.log("Checking demo users…");
  const roleMap = Object.fromEntries(roles.map((r) => [r.name, r.id]));

  for (const def of DEMO_USERS) {
    let user;
    try {
      const found = await api.get(`/users-by-email?email=${encodeURIComponent(def.email)}`);
      if (found && found.length > 0) {
        user = found[0];
        console.log(`   OK  User exists: ${user.email}`);
        await api.patch(`/users/${user.user_id}`, {
          password: def.password,
          app_metadata: def.app_metadata,
        });
        console.log(`      Updated: password + app_metadata`);
      } else {
        throw new Error("not found");
      }
    } catch {
      user = await api.post("/users", {
        connection: "Username-Password-Authentication",
        email: def.email,
        password: def.password,
        name: def.name,
        email_verified: true,
        app_metadata: def.app_metadata,
      });
      console.log(`   OK  Created: ${user.email} (${def.name})`);
    }

    const roleId = roleMap[def.role];
    if (roleId) {
      try {
        await api.post(`/users/${user.user_id}/roles`, { roles: [roleId] });
        console.log(`      Assigned Auth0 role: ${def.role}`);
      } catch {
        console.log(`      Role already assigned: ${def.role}`);
      }
    }
  }
}

function printEnvBlock(client) {
  console.log("\n" + "=".repeat(70));
  console.log("COPY INTO YOUR carehomeos/.env");
  console.log("=".repeat(70));
  console.log(`\nAUTH0_DOMAIN=${DOMAIN}`);
  console.log(`AUTH0_AUDIENCE=${API_IDENTIFIER}`);
  console.log(`AUTH0_CLIENT_ID=${client.client_id}`);
  console.log(`AUTH0_CLIENT_SECRET=${client.client_secret || "<check Auth0 dashboard>"}`);
  console.log(`AUTH0_MANAGEMENT_CLIENT_ID=${MGMT_CLIENT_ID}`);
  console.log(`AUTH0_MANAGEMENT_CLIENT_SECRET=${MGMT_CLIENT_SECRET}`);
  console.log(`PUBLIC_DASHBOARD_URL=${DASHBOARD_BASE_URL}`);
  console.log(`PUBLIC_API_BASE_URL=${API_BASE_URL}`);

  console.log("\n" + "=".repeat(70));
  console.log("DEMO USERS");
  console.log("=".repeat(70));
  for (const u of DEMO_USERS) {
    console.log(`  ${u.email.padEnd(30)} ${u.role.padEnd(20)} pw: ${u.password}`);
  }
  console.log("=".repeat(70) + "\n");
}

/* ── Env validation ──────────────────────────────────────────────────────── */
function checkEnv() {
  if (!DOMAIN) {
    die("AUTH0_DOMAIN (or AUTH0_ISSUER_BASE_URL) is required.\n\n" +
        "Add it to carehomeos/.env:\n" +
        "  AUTH0_DOMAIN=your-tenant.uk.auth0.com\n");
  }
  if (!MGMT_CLIENT_ID) {
    die("AUTH0_MANAGEMENT_CLIENT_ID is required.\n\n" +
        "You need to create a Machine-to-Machine application in Auth0\n" +
        "and authorize it for the Auth0 Management API.\n\n" +
        "See docs/AUTH0_SETUP.md for step-by-step instructions.\n\n" +
        "Add the credentials to carehomeos/.env:\n" +
        "  AUTH0_MANAGEMENT_CLIENT_ID=your-m2m-client-id\n" +
        "  AUTH0_MANAGEMENT_CLIENT_SECRET=your-m2m-client-secret\n");
  }
  if (!MGMT_CLIENT_SECRET) {
    die("AUTH0_MANAGEMENT_CLIENT_SECRET is required.\n\n" +
        "You need to create a Machine-to-Machine application in Auth0\n" +
        "and authorize it for the Auth0 Management API.\n\n" +
        "See docs/AUTH0_SETUP.md for step-by-step instructions.\n\n" +
        "Add the credentials to carehomeos/.env:\n" +
        "  AUTH0_MANAGEMENT_CLIENT_ID=your-m2m-client-id\n" +
        "  AUTH0_MANAGEMENT_CLIENT_SECRET=your-m2m-client-secret\n");
  }
}

/* ── Main ────────────────────────────────────────────────────────────────── */
async function main() {
  console.log("\nCareHomeOS Auth0 bootstrap\n");
  checkEnv();
  console.log(`Domain:   ${DOMAIN}`);
  console.log(`Audience: ${API_IDENTIFIER}`);
  console.log(`Dashboard: ${DASHBOARD_BASE_URL}\n`);

  const token = await getMgmtToken();
  const api   = mgmt(token);

  try {
    await getOrCreateApi(api);
    const client = await getOrCreateDashboardApp(api);
    await getOrCreateClientGrant(api, client);
    const roles = await getOrCreateRoles(api);
    await getOrCreatePostLoginAction();
    await createDemoUsers(api, roles);

    console.log("\nAuth0 setup complete.");
    printEnvBlock(client);
  } catch (err) {
    const msg = err?.message || String(err);
    console.error("\nSetup failed:", msg);
    if (isInsufficientScope(err)) {
      printScopeHelp();
    }
    process.exit(1);
  }
}

main();
