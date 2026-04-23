"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type LocalUser = {
  name: string;
  email: string;
  role: string;
};

export default function AuthStatus() {
  const [user, setUser] = useState<LocalUser | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem("carehomeos.user");
    try {
      if (raw) {
        setUser(JSON.parse(raw));
      }
    } catch {
      window.localStorage.removeItem("carehomeos.user");
    }

    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (payload?.user) {
          setUser(payload.user);
        }
      })
      .catch(() => undefined);
  }, []);

  function logout() {
    window.localStorage.removeItem("carehomeos.user");
    window.localStorage.removeItem("carehomeos.token");
    window.localStorage.removeItem("carehomeos.intendedRole");
    window.location.href = "/sign-out";
  }

  if (!user) {
    return <Link className="btn primary" href="/login">Sign in</Link>;
  }

  return (
    <div className="userPill authUserPill">
      <span className="avatar">{user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>
      <span>
        <strong>{user.name}</strong>
        <small>{user.role.replaceAll("_", " ")}</small>
      </span>
      <button className="linkButton" onClick={logout} type="button">Logout</button>
    </div>
  );
}
