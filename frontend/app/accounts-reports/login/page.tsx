"use client";

import { useState, type FormEvent } from "react";
import { mockLogin } from "../Lib/mock-auth";
import { useRouter } from "next/navigation";

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
    <main className="login-container">
      <h1>Welcome Back</h1>
      <p>Log in to your transport account.</p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Email Address</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />

        <button type="submit">Log In</button>
        <button type="button" onClick={handleForgetPassword}>
          Forget Password?
        </button>

        {message && <p role="status">{message}</p>}
      </form>

      <p>
        Don&apos;t have an account?{" "}
        <a href="/accounts-reports/register">Register here</a>
      </p>
    </main>
  );
}

