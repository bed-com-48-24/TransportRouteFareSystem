import { Suspense } from "react";
import TicketView from "./TicketView";

type TicketPageProps = {
  params: Promise<{ reference: string }>;
};

export default function TicketPage({ params }: TicketPageProps) {
  return (
    <Suspense fallback={(
      <main className="module-shell transport-page-shell payment-success-page profile-ticket-page">
        <div className="transport-background" aria-hidden="true" />
        <section className="module-section payment-success-panel">
          <p role="status">Loading your ticket…</p>
        </section>
      </main>
    )}>
      <TicketView params={params} />
    </Suspense>
  );
}
