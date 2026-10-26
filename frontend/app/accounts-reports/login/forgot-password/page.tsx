"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ForgotPasswordPage() {
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
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-md">
        <h1 className="mb-2 text-2xl font-bold text-gray-800">
          Reset Password
        </h1>

        <p className="mb-6 text-sm text-gray-600">
          Request a secure password reset link for the email
          address you entered on the login page.
        </p>

        <div className="mb-5 rounded-lg bg-gray-100 p-3">
          <p className="text-sm text-gray-500">Email address</p>
          <p className="break-all font-medium text-gray-800">
            {email || "No email provided"}
          </p>
        </div>

        {message && (
          <p
            role="status"
            className="mb-4 text-sm text-[#14233b]"
          >
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={handleResetPassword}
          disabled={loading || !email.trim()}
          className="w-full rounded-lg bg-[#14233b] px-4 py-3 font-semibold text-white hover:bg-[#29466d] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Sending request..." : "Send Reset Link"}
        </button>

        <button
          type="button"
          onClick={() =>
            router.push("/accounts-reports/login")
          }
          className="mt-4 w-full text-sm text-gray-600 hover:underline"
        >
          Back to Login
        </button>
      </div>
    </main>
  );
}