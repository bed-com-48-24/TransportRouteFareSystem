"use client";

import { usePassengerNotificationPreferences } from "@/components/usePassengerNotificationPreferences";
import type { PassengerSession } from "@/lib/passenger-auth";

export default function PassengerUserInformation({ passenger }: { passenger: PassengerSession }) {
  const { preferences, error, saveError, updatePreference } =
    usePassengerNotificationPreferences(passenger.email);

  return (
    <div className="module-section account-panel account-auth-card">
      <div className="module-section-heading">
        <div>
          <p className="module-eyebrow">USER INFORMATION</p>
          <h2 id="account-form-heading">{passenger.fullName}</h2>
        </div>
      </div>
      <dl className="grid gap-3 text-sm">
        <div>
          <dt className="font-semibold text-slate-500">Full name</dt>
          <dd className="mt-1 text-slate-900">{passenger.fullName}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-500">Email address</dt>
          <dd className="mt-1 break-words text-slate-900">{passenger.email}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-500">Phone number</dt>
          <dd className="mt-1 text-slate-900">{passenger.phoneNumber || "Not provided"}</dd>
        </div>
      </dl>

      <section className="mt-6 border-t border-slate-200 pt-5" aria-labelledby="notification-preferences-heading">
        <h3 id="notification-preferences-heading" className="text-base font-bold text-slate-900">Notification preferences</h3>
        <div className="mt-3 grid gap-3 text-sm">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={preferences.inApp}
              onChange={(event) => updatePreference("inApp", event.target.checked)}
            />
            <span>Show booking notifications in my account</span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={preferences.email}
              onChange={(event) => updatePreference("email", event.target.checked)}
            />
            <span>Email me about booking updates <small className="block text-slate-500">Preference only; email delivery is not configured in this demo.</small></span>
          </label>
        </div>
        {(saveError || error) && <p className="module-error mt-3" role="alert">{saveError || error}</p>}
      </section>
    </div>
  );
}
