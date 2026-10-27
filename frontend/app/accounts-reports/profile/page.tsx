"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

const PROFILE_KEY = "routewise-profile-v1";

export default function ProfilePage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null");
      if (saved && typeof saved === "object") {
        setFullName(typeof saved.fullName === "string" ? saved.fullName : "");
        setEmail(typeof saved.email === "string" ? saved.email : "");
        setPhone(typeof saved.phone === "string" ? saved.phone : "");
      }
    } catch {
      setMessage("Saved profile details could not be loaded.");
    }
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!fullName.trim() || !email.trim()) {
      setMessage("Enter your name and email address.");
      return;
    }
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify({ fullName: fullName.trim(), email: email.trim(), phone: phone.trim() }));
      setMessage("Profile updated successfully.");
    } catch {
      setMessage("We could not save your profile on this device.");
    }
    
  }

  return (
    <main className="account-page">
      <section className="account-card" aria-labelledby="profile-title">
      <Link href="/accounts-reports/home" className="account-back">← Dashboard</Link>
      <p className="account-kicker">PASSENGER ACCOUNT</p>
      <h1 id="profile-title">My profile</h1>
      <p className="account-description">Update the personal information saved for this browser.</p>

      <form className="account-form" onSubmit={handleSubmit}>
        <label htmlFor="fullName">Full name</label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          autoComplete="name"
          required
        />

        <label htmlFor="email">Email address</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />

        <label htmlFor="phone">Phone number <span className="account-optional">Optional</span></label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          autoComplete="tel"
        />

        <button className="account-submit" type="submit">Save changes <span aria-hidden="true">→</span></button>

        {message && <p className="account-message" role="status">{message}</p>}
      </form>
      </section>
    </main>
  );
}
