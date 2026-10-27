"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = searchParams.get("email") || "";

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleResetPassword() {
    if (!email.trim()) {
      setMessage(
        "Please return to login and enter your email address first."
      );
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // Connect this request to your authentication backend.
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error("Unable to request a password reset.");
      }

      setMessage(
        "If an account exists for this email, a password reset link will be sent."
      );
    } catch {
      setMessage(
        "Password reset is currently unavailable. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="account-page">
      <section className="account-card" aria-labelledby="reset-title">
        <p className="account-kicker">ACCOUNT SUPPORT</p>
        <h1 id="reset-title">Reset your password</h1>
        <p className="account-description">Request a password reset link for the email address you entered at sign in.</p>
        <div className="account-summary">
          <span>Email address</span>
          <strong>{email || "No email provided"}</strong>
        </div>
<<<<<<< HEAD

        {message && (
          <p
            role="status"
            className="mb-4 text-sm text-[#12304A]"
          >
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={handleResetPassword}
          disabled={loading || !email.trim()}
          className="w-full rounded-lg bg-[#12304A] px-4 py-3 font-semibold text-white hover:bg-[#0D2438] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Sending request..." : "Send Reset Link"}
=======
        {message && <p role="status" className="account-message">{message}</p>}
        <button type="button" onClick={handleResetPassword} disabled={loading || !email.trim()} className="account-submit" style={{ opacity: loading || !email.trim() ? 0.55 : 1 }}>
          {loading ? "Sending request…" : "Send reset link"} <span aria-hidden="true">→</span>
>>>>>>> origin/feature/integration
        </button>
        <button type="button" onClick={() => router.push("/accounts-reports/login")} className="account-reset-back">Back to sign in</button>
      </section>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
<<<<<<< HEAD
        <main className="flex min-h-screen items-center justify-center bg-[#F4F8FC] px-4">
          <p role="status" className="text-sm text-[#12304A]">
            Loading password reset...
          </p>
=======
        <main className="account-page">
          <section className="account-card"><p className="account-description">Loading account support…</p></section>
>>>>>>> origin/feature/integration
        </main>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
<<<<<<< HEAD
}
=======
}
>>>>>>> origin/feature/integration
