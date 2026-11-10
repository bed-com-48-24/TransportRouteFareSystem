"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { usePassengerAuth } from "@/components/PassengerAuthProvider";
import PassengerUserInformation from "@/components/PassengerUserInformation";
import {
  loginPassenger,
  requestPassengerPasswordReset,
  registerPassenger,
  updatePassengerPassword,
} from "@/lib/passenger-auth";

type AuthMode = "login" | "register" | "forgot" | "reset";
type Feedback = { kind: "success" | "error"; message: string };

function getInitialMode(): AuthMode {
  if (typeof window === "undefined") return "login";
  const mode = new URLSearchParams(window.location.search).get("mode");
  return mode === "register" || mode === "forgot" || mode === "reset" ? mode : "login";
}

function safeReturnPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\") || value.startsWith("/login")) {
    return "/accounts-reports/home";
  }
  return value;
}

export default function LoginPage() {
  const router = useRouter();
  const {
    passenger: session,
    ready: authReady,
    error: authError,
    signIn: signInPassenger,
    signOut: signOutPassenger,
  } = usePassengerAuth();
  const [mode, setMode] = useState<AuthMode>(getInitialMode);
  const nextPath = typeof window === "undefined"
    ? "/accounts-reports/home"
    : safeReturnPath(new URLSearchParams(window.location.search).get("next"));
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const formEmail = email || session?.email || "";
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("mode") === "confirmed"
      ? { kind: "success", message: "Your email is confirmed. Sign in to continue." }
      : new URLSearchParams(window.location.search).get("mode") === "reset"
        ? { kind: "success", message: "Choose a new password for your passenger account." }
      : null;
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authReady && session && new URLSearchParams(window.location.search).has("next")) {
      router.replace(nextPath);
    }
  }, [authReady, nextPath, router, session]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setSubmitting(true);

    try {
      if (mode === "forgot") {
        const resetMethod = await requestPassengerPasswordReset(formEmail);
        if (resetMethod === "mock") {
          setMode("reset");
          setPassword("");
          setPasswordConfirmation("");
          setFeedback({
            kind: "success",
            message: "Demo reset: enter a new password below. Mock accounts do not send email.",
          });
        } else {
          setFeedback({
            kind: "success",
            message: "If an account exists for that email, a password reset link has been sent.",
          });
        }
        return;
      }

      if (mode === "reset") {
        if (password.length < 8) {
          setFeedback({ kind: "error", message: "Use a password with at least 8 characters." });
          return;
        }
        if (password !== passwordConfirmation) {
          setFeedback({ kind: "error", message: "The passwords do not match." });
          return;
        }

        await updatePassengerPassword(password, formEmail);
        setPassword("");
        setPasswordConfirmation("");
        setMode("login");
        setFeedback({ kind: "success", message: "Your password has been reset. Sign in with your new password." });
        return;
      }

      if (mode === "register") {
        const result = await registerPassenger(fullName, phoneNumber, formEmail, password);
        if (!result.session) {
          setFeedback({
            kind: "success",
            message: result.confirmationRequired
              ? "Account created. Check your email to confirm it, then sign in."
              : "Your account was created. Sign in to continue.",
          });
          setMode("login");
          setPassword("");
          return;
        }
        await signInPassenger(result.session);
        router.push(safeReturnPath(new URLSearchParams(window.location.search).get("next")));
        return;
      }

      const currentSession = await loginPassenger(formEmail, password);
      if (!currentSession) {
        setFeedback({ kind: "error", message: "Email or password is incorrect." });
        return;
      }
      await signInPassenger(currentSession);
      router.push(safeReturnPath(new URLSearchParams(window.location.search).get("next")));
    } catch (reason) {
      setFeedback({
        kind: "error",
        message: reason instanceof Error ? reason.message : "Your account request could not be completed.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setFeedback(null);
    setPassword("");
    setPasswordConfirmation("");
  }

  async function signOut() {
    setFeedback(null);
    try {
      await signOutPassenger();
      setPassword("");
      setFeedback({ kind: "success", message: "You have been signed out." });
    } catch (reason) {
      setFeedback({
        kind: "error",
        message: reason instanceof Error ? reason.message : "Could not sign out. Please try again.",
      });
    }
  }

  return (
    <main className="module-shell account-auth-shell passenger-login-shell">
      <header className="module-intro account-auth-intro passenger-login-intro">
        <span className="passenger-login-wordmark">SBUS</span>
        <h1>{session ? `Welcome, ${session.fullName}` : "Find your route. Book your journey."}</h1>
        <p>
          Sign in to manage your trips and bookings, or create an account to get started.
        </p>
        <Link className="account-auth-browse-link" href="/transport-booking">Browse available trips →</Link>
        {authError && <p className="module-error" role="alert">{authError}</p>}
      </header>

      <section className="account-auth-controls passenger-login-controls" aria-labelledby="account-form-heading">
        {!authReady ? (
          <p className="module-empty" role="status">Checking your passenger account…</p>
        ) : mode === "reset" ? (
          <div className="module-section account-panel account-auth-card">
            <div className="module-section-heading">
              <div>
                <p className="module-eyebrow">PASSWORD RECOVERY</p>
                <h2 id="account-form-heading">Choose a new password</h2>
              </div>
            </div>
            <form className="module-form" onSubmit={submit}>
              <label>
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  value={formEmail}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <label>
                New password
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
              <label>
                Confirm new password
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  required
                />
              </label>
              <button className="primary-button form-submit" type="submit" disabled={submitting}>
                {submitting ? "Please wait…" : "Reset password"}
              </button>
            </form>
            {feedback && (
              <p className={`module-feedback ${feedback.kind}`} role={feedback.kind === "error" ? "alert" : "status"}>
                {feedback.message}
              </p>
            )}
            <button className="account-auth-secondary-link" type="button" onClick={() => changeMode("login")}>
              Back to sign in
            </button>
          </div>
        ) : session ? (
          <>
            <PassengerUserInformation passenger={session} />
            {feedback && (
              <p className={`module-feedback ${feedback.kind}`} role={feedback.kind === "error" ? "alert" : "status"}>
                {feedback.message}
              </p>
            )}
            <div className="module-shortcuts">
              <Link className="primary-button" href={nextPath}>Continue</Link>
              <Link href="/transport-booking/my-bookings">My bookings</Link>
            </div>
            <button className="account-auth-secondary-link" type="button" onClick={() => void signOut()}>
              Sign out
            </button>
          </>
        ) : (
          <>
            {mode !== "login" && (
              <button className="account-auth-secondary-link account-auth-return" type="button" onClick={() => changeMode("login")}>
                ← Back to sign in
              </button>
            )}
            <div className="module-section account-panel account-auth-card passenger-login-card">
              <div className="module-section-heading">
                <div>
                  <p className="module-eyebrow">{mode === "login" ? "WELCOME BACK" : mode === "register" ? "NEW PASSENGER" : "PASSWORD RECOVERY"}</p>
                  <h2 id="account-form-heading">
                    {mode === "login"
                      ? "Sign in to your account"
                      : mode === "register"
                        ? "Create your account"
                        : "Reset your password"}
                  </h2>
                </div>
              </div>
              <form className="module-form" onSubmit={submit}>
                {mode === "register" && (
                  <>
                    <label>
                      Full name
                      <input
                        autoComplete="name"
                        minLength={2}
                        maxLength={100}
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        required
                      />
                    </label>
                    <label>
                      Phone number
                      <input
                        type="tel"
                        autoComplete="tel"
                        maxLength={32}
                        value={phoneNumber}
                        onChange={(event) => setPhoneNumber(event.target.value)}
                        placeholder="+265 999 123 456"
                        required
                      />
                    </label>
                  </>
                )}
                <label>
                  Email address
                  <input
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    value={formEmail}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </label>
                {mode !== "forgot" && <label>
                  Password
                  <input
                    type="password"
                    autoComplete={mode === "register" ? "new-password" : "current-password"}
                    minLength={mode === "register" ? 8 : undefined}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </label>}
                <button className="primary-button form-submit" type="submit" disabled={submitting}>
                  {submitting
                    ? "Please wait…"
                    : mode === "login"
                      ? "Sign in"
                      : mode === "register"
                        ? "Create account"
                        : "Send reset link"}
                </button>
              </form>
              {feedback && (
                <p className={`module-feedback ${feedback.kind}`} role={feedback.kind === "error" ? "alert" : "status"}>
                  {feedback.message}
                </p>
              )}
              {mode === "forgot" && (
                <p className="module-footnote">
                  If you use a mock account, the demo will let you set a new password on this device.
                </p>
              )}
              {mode === "login" && (
                <>
                  <button
                    className="account-auth-secondary-link passenger-login-forgot"
                    type="button"
                    onClick={() => changeMode("forgot")}
                  >
                    Forgot password?
                  </button>
                  <div className="passenger-login-divider" aria-hidden="true" />
                  <button
                    className="account-create-button"
                    type="button"
                    onClick={() => changeMode("register")}
                  >
                    Create new account
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
