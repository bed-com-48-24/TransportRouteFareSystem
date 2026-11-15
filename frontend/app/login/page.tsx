import Link from "next/link";

function PassengerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}

function CompanyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 21h18" />
      <path d="M5 21V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v15" />
      <path d="M15 10h2a2 2 0 0 1 2 2v9" />
      <path d="M9 8h2M9 12h2M9 16h2" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <main className="account-page">
      <section className="account-card login-choice-card" aria-labelledby="login-title">
        <p className="account-kicker">SBUS ACCOUNT</p>
        <h1 id="login-title">Choose your sign-in</h1>
        <p className="account-description">
          Select the account type you want to use. Passenger and company-admin
          accounts have separate sign-in pages.
        </p>

        <div className="login-choice-grid">
          <article className="login-choice">
            <span className="login-choice-icon">
              <PassengerIcon />
            </span>
            <p className="login-choice-eyebrow">For passengers</p>
            <h2>User</h2>
            <p>Sign in or create a passenger account with your email address.</p>
            <Link className="login-choice-action" href="/login/user">
              Continue as user <span aria-hidden="true">→</span>
            </Link>
          </article>

          <article className="login-choice">
            <span className="login-choice-icon"><PassengerIcon /></span>
            <p className="login-choice-eyebrow">For approved drivers</p>
            <h2>Driver</h2>
            <p>Sign in to view the passenger manifest for your assigned trip.</p>
            <Link className="login-choice-action" href="/login/driver">
              Continue as driver <span aria-hidden="true">â†’</span>
            </Link>
          </article>

          <article className="login-choice">
            <span className="login-choice-icon">
              <CompanyIcon />
            </span>
            <p className="login-choice-eyebrow">For transport companies</p>
            <h2>Company admin</h2>
            <p>Sign in or create a company account to access staff tools.</p>
            <Link className="login-choice-action" href="/login/admin">
              Continue as company admin <span aria-hidden="true">→</span>
            </Link>
          </article>
        </div>
      </section>
    </main>
  );
}
