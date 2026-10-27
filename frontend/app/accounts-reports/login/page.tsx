"use client";

import { useState, type FormEvent } from "react";
import { mockLogin } from "../Lib/mock-auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  
  function handleForgetPassword() {
    if (!email.trim()) {
      setMessage("Please enter your email first.");
      return;
    }
    router.push(`/accounts-reports/login/forgot-password?email=${encodeURIComponent(email)}`);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

          const success = mockLogin(email, password);
          if (success) {
            router.push("/accounts-reports/home");

                }else{
                  setMessage("Invalid email or password. Please try again");
                }

}
  return (
    <main className="account-page">
      <section className="account-card" aria-labelledby="login-title">
        <Link href="/" className="account-back">← Back to SBUS</Link>
        <p className="account-kicker">PASSENGER ACCOUNT</p>
        <h1 id="login-title">Welcome back</h1>
        <p className="account-description">Sign in to manage your profile and bookings. You can search routes and fares as a guest.</p>
        <form className="account-form" onSubmit={handleSubmit}>
          <label htmlFor="email">Email address</label>
          <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required />
          <div className="account-label-row"><label htmlFor="password">Password</label><button className="account-text-button" type="button" onClick={handleForgetPassword}>Forgot password?</button></div>
          <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Enter your password" required />
          <button className="account-submit" type="submit">Sign in <span aria-hidden="true">→</span></button>
          {message && <p className="account-message" role="alert">{message}</p>}
        </form>
        <p className="account-switch">New to SBUS? <Link href="/accounts-reports/register">Create an account</Link></p>
        <p className="account-guest">Just planning a trip? <Link href="/routes-fares">Continue as a guest</Link></p>
      </section>
    </main>
  );
}

