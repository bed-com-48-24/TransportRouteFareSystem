"use client";

import { useState, type FormEvent } from "react";

export default function ProfilePage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Profile changes successfully");
  }

  return (
    <main className="profile-container">
      <h1>My Profile</h1>
      <p>View and update your personal information.</p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="fullName">Full Name</label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          autoComplete="name"
          required
        />

        <label htmlFor="email">Email Address</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />

        <label htmlFor="phone">Phone Number (optional)</label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          autoComplete="tel"
        />

        <button type="submit">Save Changes</button>

        {message && <p role="status">{message}</p>}
      </form>
    </main>
  );
}