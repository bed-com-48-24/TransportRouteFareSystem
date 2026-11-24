"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { KEYS } from "@/lib/seed";

type MockProfile = {
  name: string;
  email: string;
  phone: string;
  identificationNumber: string;
};

const EMPTY_PROFILE: MockProfile = { name: "", email: "", phone: "", identificationNumber: "" };

export default function PassengerProfilePage() {
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEYS.profile);
      if (saved) setProfile({ ...EMPTY_PROFILE, ...JSON.parse(saved) as Partial<MockProfile> });
    } catch {
      setMessage("Saved demo profile could not be read. You can enter your details again.");
    }
  }, []);

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      localStorage.setItem(KEYS.profile, JSON.stringify({
        ...profile,
        name: profile.name.trim(),
        email: profile.email.trim().toLowerCase(),
        phone: profile.phone.trim(),
        identificationNumber: profile.identificationNumber.trim(),
      }));
      setMessage("Profile saved on this device.");
    } catch {
      setMessage("Profile could not be saved in this browser.");
    }
  }

  return (
    <main className="module-shell">
      <header className="module-intro">
        <p className="module-eyebrow">PASSENGER ACCOUNT · MOCKUP</p>
        <h1>Passenger profile</h1>
        <p>Keep your contact details ready for trip reservations. This demo profile is stored only in this browser.</p>
        <div className="module-shortcuts"><Link href="/accounts-reports/home">Account home</Link><Link href="/accounts-reports/notifications">Notifications</Link></div>
      </header>
      <section className="module-section">
        <form className="module-form narrow-form" onSubmit={saveProfile}>
          <label>Full name<input autoComplete="name" minLength={2} maxLength={100} value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} required /></label>
          <label>Email address<input type="email" autoComplete="email" maxLength={254} value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} /></label>
          <label>Phone number<input type="tel" autoComplete="tel" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></label>
          <label>Identification number <span className="optional-label">Optional</span><input value={profile.identificationNumber} onChange={(event) => setProfile({ ...profile, identificationNumber: event.target.value })} /></label>
          <button className="primary-button form-submit" type="submit">Save profile</button>
        </form>
        {message && <p className="module-feedback" role="status">{message}</p>}
      </section>
    </main>
  );
}
