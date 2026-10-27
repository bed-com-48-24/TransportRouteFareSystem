
  "use client"

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { registerMockAccount } from "../Lib/mock-auth";
import Link from "next/link";

export default function AccountsReportsPage() {
  const router = useRouter();
  const [fullName, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!fullName || !email || !password || !confirmPassword) {
      setMessage("Please fill in all fields.");
      return;
    }

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    const account = { fullName, email, password };
    const isRegistered = registerMockAccount(account);

    if (!isRegistered) {
      setMessage("An account with this email already exists.");
      return;
    }

    setMessage("Account created successfully!");
    router.push("/accounts-reports/login");
  }

  return (
    <main className="account-page">
      <section className="account-card" aria-labelledby="register-title">
        <Link href="/" className="account-back">← Back to SBUS</Link>
        <p className="account-kicker">JOIN SBUS</p>
        <h1 id="register-title">Create your account</h1>
        <p className="account-description">Save your passenger details and manage your transport bookings in one place.</p>
        <form className="account-form" onSubmit={handleSubmit}>
          <label htmlFor="fullName">Full name</label>
          <input type="text" id="fullName" value={fullName} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Your full name" required />
          <label htmlFor="email">Email address</label>
          <input type="email" id="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required />
          <label htmlFor="password">Password</label>
          <input type="password" id="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} placeholder="At least 8 characters" required />
          <label htmlFor="confirmPassword">Confirm password</label>
          <input type="password" id="confirmPassword" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} placeholder="Enter your password again" required />
          <button className="account-submit" type="submit">Create account <span aria-hidden="true">→</span></button>
          {message && <p className="account-message" role="alert">{message}</p>}
        </form>
        <p className="account-switch">Already have an account? <Link href="/accounts-reports/login">Sign in</Link></p>
        <p className="account-guest">Account not needed to browse <Link href="/routes-fares">routes and fares</Link>.</p>
      </section>
    </main>
  );
}

