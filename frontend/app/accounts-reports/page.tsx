"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { loginPassenger, logoutPassenger, readPassengerSession, registerPassenger, updatePassengerName, type PassengerSession } from "@/lib/passenger-auth";
import { KEYS } from "@/lib/seed";
import { loadList, newId, saveList } from "@/lib/storage";
import type { ReportItem } from "@/lib/types";

type AccountTab = "sign-in" | "create-account" | "profile" | "report";
type Feedback = { kind: "success" | "error"; message: string } | null;
type SavedProfile = { fullName: string; email: string; phone: string };

const PROFILE_KEY = "routewise-profile-v1";

export default function AccountsReportsPage() {
  const [tab, setTab] = useState<AccountTab>("sign-in");
  const [session, setSession] = useState<PassengerSession | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  const [reportType, setReportType] = useState<ReportItem["type"]>("Route");
  const [itemName, setItemName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const current = readPassengerSession();
        setSession(current);
        if (current) {
          setFullName(current.fullName);
          setEmail(current.email);
        }

        const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null") as Partial<SavedProfile> | null;
        if (saved && typeof saved === "object") {
          if (typeof saved.fullName === "string") setFullName(saved.fullName);
          if (typeof saved.email === "string") setEmail(saved.email);
          if (typeof saved.phone === "string") setPhone(saved.phone);
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

        const created = await registerPassenger(fullName, email, password);
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

  function saveProfile(event: FormEvent<HTMLFormElement>) {
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

    try {
      const updated = updatePassengerName(session.email, fullName);
      localStorage.setItem(PROFILE_KEY, JSON.stringify({
        fullName: updated.fullName,
        email: updated.email,
        phone: phone.trim(),
      } satisfies SavedProfile));
      setSession(updated);
      setFeedback({ kind: "success", message: "Your profile has been updated." });
    } catch (reason) {
      setFeedback({
        kind: "error",
        message: reason instanceof Error ? reason.message : "Your profile could not be saved.",
      });
    }
  }

  function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    if (itemName.trim().length < 2 || description.trim().length < 10) {
      setFeedback({ kind: "error", message: "Add the route or stop name and at least 10 characters describing the issue." });
      return;
    }

    const report: ReportItem = {
      id: newId("report"),
      category: "Issue report",
      type: reportType,
      itemName: itemName.trim(),
      description: description.trim(),
      location: location.trim(),
      customerName: session?.fullName ?? "",
      customerEmail: session?.email ?? "",
      status: "open",
      adminNote: "",
      createdAt: new Date().toISOString(),
    };

    try {
      saveList(KEYS.reports, [...loadList<ReportItem>(KEYS.reports, []), report]);
      setItemName("");
      setLocation("");
      setDescription("");
      setFeedback({ kind: "success", message: "Thank you. Your report has been submitted for review." });
    } catch {
      setFeedback({ kind: "error", message: "Your report could not be saved on this device. Please try again." });
    }
  }

  function signOut() {
    try {
      logoutPassenger();
      setSession(null);
      setPassword("");
      setFeedback({ kind: "success", message: "You have been signed out." });
      setTab("sign-in");
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
          <Link href="/routes-fares">Continue as a guest</Link>
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
            <div className="guest-callout"><strong>Just looking for travel information?</strong><p>You do not need an account to find routes, fares, stops, or available trips.</p><Link href="/routes-fares">Continue as a guest →</Link></div>
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
              <label>Password<input type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" required /></label>
              <label>Confirm password<input type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>
              <button className="primary-button form-submit" type="submit" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
            </form>
            <p className="module-footnote">For this demonstration, account information is stored in this browser. Do not reuse a sensitive password.</p>
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
            <p className="module-copy">Tell us what is inaccurate or out of date. Our team can review the route, fare, or stop details.</p>
            <form className="module-form narrow-form" onSubmit={submitReport}>
              <label>What needs attention?
                <select value={reportType} onChange={(event) => setReportType(event.target.value as ReportItem["type"])}>
                  <option value="Route">Route</option><option value="Fare">Fare</option><option value="Stop">Pickup or drop-off point</option><option value="Other">Other</option>
                </select>
              </label>
              <label>Route, fare, or stop name<input maxLength={120} value={itemName} onChange={(event) => setItemName(event.target.value)} placeholder="e.g. Blantyre to Zomba" required /></label>
              <label>Town or area <span className="optional-label">Optional</span><input maxLength={100} value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Where did you see the issue?" /></label>
              <label>Describe the issue<textarea minLength={10} maxLength={1000} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Explain what is wrong or what has changed…" required /></label>
              <button className="primary-button form-submit" type="submit">Submit report</button>
            </form>
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
