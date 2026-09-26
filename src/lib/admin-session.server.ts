// Server-only admin session helpers.
import { useSession } from "@tanstack/react-start/server";

export type AdminSession = {
  /** Password + second factor both passed. */
  unlocked?: boolean;
  /** Password passed, waiting for the second factor. */
  pending?: boolean;
  /** Id of the emailed one-time code issued for this attempt. */
  codeId?: string | undefined;
};

export function sessionConfig() {
  return {
    password: process.env["SESSION_SECRET"]!,
    name: "mssn-admin",
    maxAge: 60 * 60 * 12,
    cookie: { httpOnly: true, secure: true, sameSite: "none" as const, path: "/" },
  };
}

export function adminSession() {
  return useSession<AdminSession>(sessionConfig());
}

export async function requireAdmin() {
  const session = await adminSession();
  if (!session.data.unlocked) throw new Error("Admin sign-in required.");
}
