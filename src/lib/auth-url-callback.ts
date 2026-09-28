export type AuthUrlCallback =
  | { kind: "tokens"; accessToken: string; refreshToken: string }
  | { kind: "code"; code: string }
  | { kind: "error"; message: string };

let capturedCallback: AuthUrlCallback | null = null;

function captureAndCleanAuthCallback(): AuthUrlCallback | null {
  if (typeof window === "undefined") return null;

  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  const code = url.searchParams.get("code");
  const errorMessage =
    hash.get("error_description") ??
    url.searchParams.get("error_description") ??
    hash.get("error") ??
    url.searchParams.get("error");

  let callback: AuthUrlCallback | null = null;
  if (accessToken && refreshToken) {
    callback = { kind: "tokens", accessToken, refreshToken };
  } else if (code) {
    callback = { kind: "code", code };
  } else if (errorMessage) {
    callback = { kind: "error", message: errorMessage.replace(/\+/g, " ") };
  }

  if (!callback) return null;

  url.hash = "";
  for (const key of ["code", "error", "error_code", "error_description"]) {
    url.searchParams.delete(key);
  }
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
  return callback;
}

// This module is imported before the backend client, so credentials disappear
// before React, route guards, or automatic session detection can run.
capturedCallback = captureAndCleanAuthCallback();

export function takeAuthUrlCallback(): AuthUrlCallback | null {
  if (!capturedCallback) capturedCallback = captureAndCleanAuthCallback();
  const callback = capturedCallback;
  capturedCallback = null;
  return callback;
}