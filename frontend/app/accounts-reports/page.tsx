"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import PassengerReportForm from "@/components/PassengerReportForm";
import { loginPassenger, logoutPassenger, readPassengerSession, registerPassenger, updatePassengerName, type PassengerSession } from "@/lib/passenger-auth";
import * as apiMe from "@/services/me.service";

type AccountTab = "sign-in" | "create-account" | "profile" | "report";
type Feedback = { kind: "success" | "error"; message: string } | null;

export default function AccountsReportsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<AccountTab>("sign-in");
  const [session, setSession] = useState<PassengerSession | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const current = readPassengerSession();
        setSession(current);
        if (current) {
          setFullName(current.fullName);
          setEmail(current.email);
        }

        if (current) {
          void apiMe.getPassengerProfile().then((profile) => {
            if (!profile) return;
            setFullName(profile.name);
            setEmail(profile.email);
            setPhone(profile.phone ?? "");
          }).catch((reason: unknown) => {
            setFeedback({ kind: "error", message: reason instanceof Error ? reason.message : "Passenger profile could not be loaded." });
          });
        }
      } catch (reason) {
        setFeedback({
          kind: "error",
          message: reason instanceof Error ? reason.message : "Saved account details could not be loaded.",
        });
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function chooseTab(nextTab: AccountTab) {
    setTab(nextTab);
    setFeedback(null);
  }

  async function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setBusy(true);

    try {
      if (tab === "create-account") {
        if (fullName.trim().length < 2 || fullName.trim().length > 100) {
          setFeedback({ kind: "error", message: "Enter a name between 2 and 100 characters." });
          return;
        }
        if (password.length < 8) {
          setFeedback({ kind: "error", message: "Use at least 8 characters for your password." });
          return;
        }
        if (password !== confirmPassword) {
          setFeedback({ kind: "error", message: "The passwords do not match." });
          return;
        }

        if (phone.trim().length < 7) {
          setFeedback({ kind: "error", message: "Enter a phone number so the transport company can reach you." });
          return;
        }

        const created = await registerPassenger(fullName, email, password, false, phone);
        setSession(created);
        setPassword("");
        setConfirmPassword("");
        setFeedback({ kind: "success", message: "Your account is ready. You are now signed in." });
        return;
      }

      const signedIn = await loginPassenger(email, password);
      if (!signedIn) {
        setFeedback({ kind: "error", message: "Email or password is not correct. Please try again." });
        return;
      }

      setSession(signedIn);
      setFullName(signedIn.fullName);
      setEmail(signedIn.email);
      setPassword("");
      setFeedback({ kind: "success", message: `Welcome back, ${signedIn.fullName}.` });
    } catch (reason) {
      setFeedback({
        kind: "error",
        message: reason instanceof Error ? reason.message : "Account access could not be completed. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (!session) {
      setFeedback({ kind: "error", message: "Sign in to update your passenger profile." });
      return;
    }
    if (fullName.trim().length < 2 || fullName.trim().length > 100) {
      setFeedback({ kind: "error", message: "Enter a name between 2 and 100 characters." });
      return;
    }

    setBusy(true);
    try {
      const saved = await apiMe.savePassengerProfile({
        name: fullName.trim(),
        email: session.email,
        phone: phone.trim(),
      });
      const updated = updatePassengerName(session.email, fullName);
      setFullName(saved.name || updated.fullName);
      setPhone(saved.phone ?? "");
      setSession(updated);
      setFeedback({ kind: "success", message: "Your profile has been updated." });
    } catch (reason) {
      setFeedback({
        kind: "error",
        message: reason instanceof Error ? reason.message : "Your profile could not be saved.",
      });
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    try {
      logoutPassenger();
      setSession(null);
      setPassword("");
      setFeedback({ kind: "success", message: "You have been signed out." });
      setTab("sign-in");
      router.push("/");
    } catch {
      setFeedback({ kind: "error", message: "Could not sign out. Please try again." });
    }
  }

  return (
    <main className="module-shell">
      <header className="module-intro">
        <p className="module-eyebrow">PASSENGER ACCOUNT · SUPPORT</p>
        <h1>Account and travel help</h1>
        <p>
          Sign in, create an account, update your profile, or tell us about
          transport information that needs attention. You can browse as a guest.
        </p>
        <div className="module-shortcuts">
          <Link href="/transport-booking">Continue as a guest</Link>
          <Link href="/transport-booking">View trips and bookings</Link>
        </div>
      </header>

      {session && (
        <div className="account-session-bar">
          <span>Signed in as <strong>{session.fullName}</strong> · {session.email}</span>
          <button type="button" className="secondary-button" onClick={signOut}>Sign out</button>
        </div>
      )}

      <nav className="module-tabs" aria-label="Account options">
        {([
          ["sign-in", "Sign in"],
          ["create-account", "Create account"],
          ["profile", "My profile"],
          ["report", "Report information"],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" aria-pressed={tab === id} className={tab === id ? "is-active" : ""} onClick={() => chooseTab(id)}>
            {label}
          </button>
        ))}
      </nav>

      <section className="module-section account-panel" aria-live="polite">
        {tab === "sign-in" && (
          <>
            <div className="module-section-heading">
              <div><p className="module-eyebrow">WELCOME BACK</p><h2>Sign in to your account</h2></div>
            </div>
            <form className="module-form narrow-form" onSubmit={submitAccount}>
              <label>Email address<input type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label>
              <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
              <button className="primary-button form-submit" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
            </form>
            <div className="guest-callout"><strong>Just looking for travel information?</strong><p>You do not need an account to find routes, fares, stops, or available trips.</p><Link href="/transport-booking">Continue as a guest →</Link></div>
          </>
        )}

        {tab === "create-account" && (
          <>
            <div className="module-section-heading">
              <div><p className="module-eyebrow">JOIN THE SERVICE</p><h2>Create a passenger account</h2></div>
            </div>
            <form className="module-form narrow-form" onSubmit={submitAccount}>
              <label>Full name<input autoComplete="name" minLength={2} maxLength={100} value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your full name" required /></label>
              <label>Email address<input type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label>
              <label>Phone number<input type="tel" autoComplete="tel" maxLength={25} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="e.g. +265 991 234 567" required /></label>
              <label>Password<input type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" required /></label>
              <label>Confirm password<input type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>
              <button className="primary-button form-submit" type="submit" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
            </form>
            <p className="module-footnote">Your account is created through the YendaRoute backend.</p>
          </>
        )}

        {tab === "profile" && (
          <>
            <div className="module-section-heading">
              <div><p className="module-eyebrow">YOUR DETAILS</p><h2>Manage your profile</h2></div>
            </div>
            {!session ? (
              <div className="guest-callout"><p>Sign in to view and update your saved passenger details.</p><button className="secondary-button" type="button" onClick={() => chooseTab("sign-in")}>Go to sign in</button></div>
            ) : (
              <form className="module-form narrow-form" onSubmit={saveProfile}>
                <label>Full name<input autoComplete="name" minLength={2} maxLength={100} value={fullName} onChange={(event) => setFullName(event.target.value)} required /></label>
                <label>Email address<input type="email" value={session.email} readOnly aria-describedby="email-note" /></label>
                <p id="email-note" className="module-footnote">Your sign-in email cannot be changed here.</p>
                <label>Phone number <span className="optional-label">Optional</span><input type="tel" autoComplete="tel" maxLength={25} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="e.g. +265 991 234 567" /></label>
                <button className="primary-button form-submit" type="submit">Save profile</button>
              </form>
            )}
          </>
        )}

        {tab === "report" && (
          <>
            <div className="module-section-heading">
              <div><p className="module-eyebrow">HELP IMPROVE TRAVEL INFORMATION</p><h2>Report an issue</h2></div>
            </div>
            <p className="module-copy">
              Use the browser-only report demo to record a sample issue. Reports and staff notes stay on this device and are not sent to the backend.
            </p>
            <PassengerReportForm />
          </>
        )}
      </section>

      {feedback && (
        <p className={`module-feedback ${feedback.kind}`} role={feedback.kind === "error" ? "alert" : "status"}>
          {feedback.message}
        </p>
      )}
    </main>
  );
}
