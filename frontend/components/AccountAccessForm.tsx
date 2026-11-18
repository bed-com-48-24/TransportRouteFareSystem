"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { loginUser, useSession, type SessionRole } from "@/lib/auth";
import { registerPassenger } from "@/lib/passenger-auth";

const REMEMBER_KEY = "sbus-remembered-email";

function destinationForRole(role: SessionRole): string {
  if (role === "admin") {
    return "/maps-admin-integration?panel=admin&section=overview";
  }
  if (role === "driver") {
    return "/driver/manifest";
  }
  return "/home";
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a3 3 0 0 0 4.24 4.24" />
      <path d="M9.9 5.2A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.4 3.3" />
      <path d="M6.6 6.6A18.4 18.4 0 0 0 2 12s3.5 7 10 7a10.4 10.4 0 0 0 4.1-.8" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="16" r="4" />
      <path d="m10.8 13.2 8.2-8.2" />
      <path d="m16 8 3 3" />
      <path d="m19 5 2 2" />
    </svg>
  );
}

export default function AccountAccessForm() {
  const router = useRouter();
  const session = useSession();
  const [creating, setCreating] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  // Already signed in: go straight to the right view.
  useEffect(() => {
    if (session) {
      router.replace(destinationForRole(session.role));
    }
  }, [session, router]);

  useEffect(() => {
    let saved = "";
    try {
      saved = localStorage.getItem(REMEMBER_KEY) ?? "";
    } catch {
      saved = "";
    }
    if (!saved) return;

    const frame = window.requestAnimationFrame(() => {
      setEmail((current) => current || saved);
      setRemember(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function handleForgotPassword() {
    setError("");
    setInfo("Password recovery is not available yet. Please contact support.");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);

    try {
      if (creating) {
        if (fullName.trim().length < 2 || fullName.trim().length > 100) {
          setError("Enter a name between 2 and 100 characters.");
          return;
        }
        if (phone.trim().length < 7) {
          setError("Enter a phone number so the transport company can reach you.");
          return;
        }
        if (password.length < 8) {
          setError("Use at least 8 characters for your password.");
          return;
        }
        if (password !== confirmPassword) {
          setError("The passwords do not match.");
          return;
        }

        await registerPassenger(fullName, email, password, remember, phone);
        const createdRole = await loginUser(email, password, remember);
        if (!createdRole) {
          throw new Error("Your account was created, but sign-in failed. Please sign in with your new account.");
        }
        setPassword("");
        setConfirmPassword("");
        router.push(destinationForRole(createdRole));
        return;
      }

      const signedInRole = await loginUser(email, password, remember);
      if (!signedInRole) {
        setError("Email or password is not correct. Create an account first if you do not have one.");
        return;
      }

      try {
        if (remember) {
          localStorage.setItem(REMEMBER_KEY, email.trim().toLowerCase());
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }
      } catch {
        // Remember-me is optional; ignore blocked storage.
      }

      setPassword("");
      router.push(destinationForRole(signedInRole));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Account access is unavailable right now. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="account-page">
      <section className="account-card" aria-labelledby="login-title">
        <h1 id="login-title" className="account-title-centered">
          {creating ? "Create an account" : "Sign in"}
        </h1>

        <form className="account-form" onSubmit={submit}>
          {creating && (
            <>
              <label htmlFor="login-full-name">Full name</label>
              <input
                id="login-full-name"
                autoComplete="name"
                minLength={2}
                maxLength={100}
                placeholder="Your full name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </>
          )}

          <label htmlFor="login-email">Email</label>
          <div className="account-input-wrap">
            <span className="account-input-icon" aria-hidden="true"><MailIcon /></span>
            <input
              id="login-email"
              type="email"
              className="has-icon"
              autoComplete={creating ? "email" : "username"}
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          {creating && (
            <>
              <label htmlFor="login-phone">Phone number</label>
              <input
                id="login-phone"
                type="tel"
                autoComplete="tel"
                maxLength={25}
                placeholder="e.g. +265 991 234 567"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
              />
            </>
          )}

          <label htmlFor="login-password">Password</label>
          <div className="account-input-wrap">
            <span className="account-input-icon" aria-hidden="true"><KeyIcon /></span>
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              className="has-icon has-trailing"
              autoComplete={creating ? "new-password" : "current-password"}
              minLength={creating ? 8 : undefined}
              placeholder={creating ? "At least 8 characters" : "Password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              type="button"
              className="account-password-toggle"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>

          {!creating && (
            <div className="account-options">
              <label className="account-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <a
                className="account-forgot"
                href="#forgot-password"
                onClick={(event) => {
                  event.preventDefault();
                  handleForgotPassword();
                }}
              >
                Forgot password?
              </a>
            </div>
          )}
          {info && <p className="account-message account-info" role="status">{info}</p>}

          {creating && (
            <>
              <label htmlFor="login-confirm-password">Confirm password</label>
              <div className="account-input-wrap">
                <span className="account-input-icon" aria-hidden="true"><KeyIcon /></span>
                <input
                  id="login-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  className="has-icon has-trailing"
                  autoComplete="new-password"
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="account-password-toggle"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  aria-pressed={showConfirmPassword}
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </>
          )}

          <button className="account-submit" type="submit" disabled={busy}>
            {busy
              ? creating ? "Creating account…" : "Signing in…"
              : creating ? "Create account" : "Sign in"}
            <span aria-hidden="true">→</span>
          </button>
          {error && <p className="account-message" role="alert">{error}</p>}
        </form>

        <p className="account-footnote">
          {creating ? (
            <>
              Already have an account?{" "}
              <button type="button" className="account-text-button" onClick={() => { setCreating(false); setError(""); setInfo(""); }}>
                Sign in
              </button>
              .
            </>
          ) : (
            <>
              Don&apos;t have an account?{" "}
              <button type="button" className="account-text-button" onClick={() => { setCreating(true); setError(""); setInfo(""); }}>
                Sign up
              </button>
              .
            </>
          )}
        </p>
      </section>
    </main>
  );
}