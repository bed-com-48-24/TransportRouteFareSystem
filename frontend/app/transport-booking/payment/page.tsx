"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";
import { useSession } from "@/lib/auth";
import { fmtDate } from "@/lib/booking-data";
import { notifyBookingStatus } from "@/lib/notifications";
import { clearPaymentDraft, readPaymentDraft, savePaymentDraft, type PaymentDraft } from "@/lib/payment-draft";
import { savePaymentReceipt } from "@/lib/payment-receipts";
import { savePaymentSuccess } from "@/lib/payment-success";
import { savePassengerBookingDetails } from "@/lib/passenger-booking-details";
import { readPassengerSession } from "@/lib/passenger-auth";
import { releaseSeatHold } from "@/lib/seat-holds";
import type { Booking, Trip } from "@/lib/types";
import { useBackendTrips, useMyBookings } from "@/lib/use-backend-data";
import { toBooking, toTrip } from "@/services/adapters";
import * as apiBookings from "@/services/bookings.service";
import * as apiPayments from "@/services/payments.service";
import * as apiSchedules from "@/services/schedules.service";
import type { Booking as ApiBooking, PaymentMethod } from "@/services/types";

const MALAWI_BANKS = ["CDH Investment Bank", "Centenary Bank", "Ecobank", "FDH Bank", "First Capital Bank", "National Bank of Malawi", "NBS Bank", "Standard Bank Malawi"];

export default function ContinueWithPaymentPage() {
  const session = useSession();
  const router = useRouter();
  const { data: trips, reload: reloadTrips, loading: tripsLoading } = useBackendTrips();
  const { data: bookings, reload: reloadBookings } = useMyBookings();
  const [draft, setDraft] = useState<PaymentDraft | null>(null);
  const [scheduleTrip, setScheduleTrip] = useState<Trip | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(true);
  const [paymentMethodsError, setPaymentMethodsError] = useState("");
  const [paymentMethodLoadAttempt, setPaymentMethodLoadAttempt] = useState(0);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [pendingReference, setPendingReference] = useState("");
  const [paymentPhone, setPaymentPhone] = useState("");
  const [bankName, setBankName] = useState("");
  const [paymentAccountName, setPaymentAccountName] = useState("");
  const [paymentAccountNumber, setPaymentAccountNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [paymentStarted, setPaymentStarted] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = readPaymentDraft();
      setDraft(saved);
      setPendingReference(saved?.pendingBookingReference ?? "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (draft?.name && draft?.email) return;
    const timer = window.setTimeout(() => {
      const passenger = readPassengerSession();
      if (!passenger?.fullName && !passenger?.email) return;
      setDraft((current) => current ? {
        ...current,
        name: current.name || passenger.fullName || "",
        email: current.email || passenger.email || "",
      } : current);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [draft]);

  useEffect(() => {
    let cancelled = false;
    apiPayments.listMethods().then((methods) => {
      if (cancelled) return;
      const supported = methods.filter((method) => method.id === "mobile_money" || method.id === "bank_card");
      const demoMethods: PaymentMethod[] = [
        { id: "airtel_demo", name: "Airtel Money (demo)", provider: "demo", description: "Mobile money demo" },
        { id: "tnm_demo", name: "TNM Mpamba (demo)", provider: "demo", description: "Mobile money demo" },
        { id: "paychangu_demo", name: "PayChangu (demo)", provider: "demo", description: "Payment gateway demo" },
        { id: "bank_demo", name: "Malawi bank transfer (demo)", provider: "demo", description: "Bank transfer demo" },
      ];
      setPaymentMethods([...supported, ...demoMethods]);
      setPaymentMethodId((current) => current || supported[0]?.id || "");
      setPaymentMethodsLoading(false);
    }).catch((reason: unknown) => {
      if (!cancelled) {
        setPaymentMethodsError(reason instanceof Error ? reason.message : "Payment methods could not be loaded.");
        setPaymentMethodsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [paymentMethodLoadAttempt]);

  const scheduledTrip = draft
    ? trips.find((trip) => trip.id === draft.tripId && trip.date === draft.travelDate)
    : undefined;
  const activeTrip = scheduledTrip ?? scheduleTrip;

  // A direct visit or a slow schedule list should still find the chosen trip.
  useEffect(() => {
    if (!draft || scheduledTrip || tripsLoading) return;
    let cancelled = false;
    apiSchedules.get(Number(draft.tripId), draft.travelDate).then((schedule) => {
      if (!cancelled) setScheduleTrip(toTrip(schedule, draft.travelDate));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [draft, scheduledTrip, tripsLoading]);

  const passengers = draft?.seats.length ?? 0;
  const amountDue = (activeTrip?.fare ?? 0) * passengers;

  async function completePayment() {
    if (!draft || !activeTrip || !session) return;
    const phoneDigits = draft.phone.replace(/\D/g, "");
    if (draft.name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
      setError("Check the passenger name and email on your reservation.");
      return;
    }
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      setError("Enter a valid phone number with at least 7 digits before paying.");
      return;
    }

    const selectedMethod = paymentMethods.find((method) => method.id === paymentMethodId);
    if (!selectedMethod) {
      setError("Choose an available payment method.");
      return;
    }
    if (paymentMethodId.endsWith("_demo")) {
      if ((paymentMethodId === "airtel_demo" || paymentMethodId === "tnm_demo") && !paymentPhone.trim()) {
        setError("Enter the mobile money phone number for this demonstration.");
        return;
      }
      if (paymentMethodId === "bank_demo" && (!bankName || !paymentAccountName.trim() || !paymentAccountNumber.trim())) {
        setError("Select a bank and enter the account name and number for this demonstration.");
        return;
      }
      if (paymentMethodId === "paychangu_demo" && (!paymentAccountName.trim() || !paymentPhone.trim())) {
        setError("Enter the payer name and phone number for this PayChangu demonstration.");
        return;
      }
      setError("These provider choices are demonstration only. Choose Mobile Money or Bank Card for the backend simulator.");
      return;
    }

    const seats = [...draft.seats].sort((first, second) => first - second);
    setPaymentStarted(true);
    setSaving(true);
    setError("");
    setNotice("");
    let createdReference = pendingReference || draft.pendingBookingReference || undefined;
    let shouldCancelCreatedBooking = false;
    let paymentRequestStarted = false;

    try {
      const previousHold = createdReference ? undefined : bookings.find((booking) =>
        booking.tripId === activeTrip.id &&
        booking.travelDate === draft.travelDate &&
        booking.status === "confirmed" &&
        booking.paymentStatus !== "paid" &&
        booking.seats?.length === seats.length &&
        booking.seats.every((seat, index) => seat === seats[index]),
      );
      let created: ApiBooking;
      if (createdReference) {
        created = await apiBookings.get(createdReference);
      } else if (previousHold) {
        created = await apiBookings.get(previousHold.reference);
      } else {
        created = await apiBookings.create({
          scheduleId: Number(activeTrip.id),
          travelDate: draft.travelDate,
          seatNumbers: seats,
        });
        shouldCancelCreatedBooking = true;
      }
      createdReference = created.reference;
      setPendingReference(created.reference);

      await apiBookings.updatePassenger(created.reference, {
        passengerName: draft.name.trim(),
        passengerEmail: draft.email.trim().toLowerCase(),
        phoneNumber: draft.phone,
      });
      try {
        savePassengerBookingDetails({
          bookingReference: created.reference,
          passengerName: draft.name.trim(),
          passengerEmail: draft.email.trim().toLowerCase(),
          passengerPhone: draft.phone,
        });
      } catch {
        // Browser storage is only a profile fallback.
      }

      paymentRequestStarted = true;
      const payment = await apiPayments.create(
        created.reference,
        paymentMethodId as "mobile_money" | "bank_card",
      );
      const backendPaymentStatus = payment.status?.toLowerCase() ?? "pending";
      const demoSuccess = backendPaymentStatus === "pending" && selectedMethod.provider === "simulated";
      const paymentStatus = demoSuccess ? "successful" : backendPaymentStatus;
      const paymentConfirmed = demoSuccess || ["succeeded", "paid", "completed", "success", "successful"].includes(paymentStatus);
      const paidAmount = Number(payment.amount ?? amountDue);

      try {
        savePaymentReceipt({
          bookingReference: created.reference,
          paymentId: payment.id,
          amount: paidAmount,
          currency: payment.currency ?? "MWK",
          method: selectedMethod.name,
          provider: payment.provider ?? selectedMethod.provider,
          status: paymentStatus,
          passengerName: draft.name.trim(),
          passengerEmail: draft.email.trim().toLowerCase(),
          passengerPhone: draft.phone,
          ...(payment.transactionReference ? { transactionReference: payment.transactionReference } : {}),
          createdAt: payment.createdAt ?? new Date().toISOString(),
        });
      } catch {
        // The backend response remains authoritative if storage is unavailable.
      }

      if (!paymentConfirmed) {
        savePaymentDraft({ ...draft, pendingBookingReference: created.reference });
        setPaymentStarted(false);
        setNotice(`Payment pending. Booking reference: ${created.reference}. You can retry below.`);
        reloadBookings();
        reloadTrips();
        return;
      }

      const booking: Booking = {
        ...toBooking(
          {
            ...created,
            status: created.status,
            seatNumbers: seats,
            travelDate: draft.travelDate,
            passengerName: draft.name.trim(),
            passengerEmail: draft.email.trim().toLowerCase(),
          },
          activeTrip,
        ),
        paymentStatus: "paid",
        paymentMethod: paymentMethodId === "bank_card" ? "bank" : undefined,
        paymentProvider: selectedMethod.name,
        amountPaid: paidAmount,
        paymentReference: payment.transactionReference ?? payment.id,
        paymentCode: payment.transactionReference,
        payerPhone: draft.phone,
        paidAt: payment.createdAt ?? new Date().toISOString(),
      };
      savePaymentSuccess(booking);
      clearPaymentDraft();
      setPendingReference("");
      try {
        notifyBookingStatus(
          booking,
          "payment-complete",
          `Payment received for ${booking.route}. Booking reference: ${booking.reference}.`,
        );
      } catch {
        // The confirmation page remains authoritative if notifications are unavailable.
      }
      reloadTrips();
      reloadBookings();
      router.push("/transport-booking/payment/success");
      return;
    } catch (reason) {
      if (createdReference && shouldCancelCreatedBooking && !paymentRequestStarted) {
        try {
          await apiBookings.cancel(createdReference);
          setPendingReference("");
          savePaymentDraft({ ...draft, pendingBookingReference: "" });
          reloadTrips();
          reloadBookings();
        } catch {
          // Keep the original error visible if cleanup is unavailable.
        }
      }
      setPaymentStarted(false);
      setError(reason instanceof Error ? reason.message : "The payment could not be completed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function backToBooking(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const reference = pendingReference || draft?.pendingBookingReference;
    if (reference) {
      try {
        const booking = await apiBookings.get(reference);
        if (booking.status === "draft" || booking.status === "reviewed") {
          await apiBookings.cancel(reference);
        }
      } catch {
        // Keep clearing the local draft even if the hold cannot be released.
      }
      releaseSeatHold(reference);
    }
    clearPaymentDraft();
    router.push("/transport-booking");
  }

  return (
    <main className="module-shell transport-page-shell">
      <div className="transport-background" aria-hidden="true" />

      {!draft ? (
        <section className="module-section">
          <p className="module-empty">
            No reservation is ready for payment. Choose a departure and select your seats first.{" "}
            <Link href="/transport-booking">Go to booking</Link>
          </p>
        </section>
      ) : !activeTrip ? (
        <section className="module-section">
          <p className="module-empty" role="status">Loading your selected trip…</p>
        </section>
      ) : (
        <div className="payment-summary-columns">
          <section className="module-section payment-summary-panel" aria-label="Summary of your booking">
            <h2>{activeTrip.route}</h2>
            <ol className="process-summary-list">
              <li>
                <span className="process-step">1</span>
                <div>
                  <strong>Route and schedule chosen</strong>
                  <p>{fmtDate(draft.travelDate)} · {activeTrip.departure}–{activeTrip.arrival}</p>
                </div>
              </li>
              <li>
                <span className="process-step">2</span>
                <div>
                  <strong>Seats picked</strong>
                  <p>{draft.seats.join(", ")} · {passengers} passenger{passengers === 1 ? "" : "s"}</p>
                </div>
              </li>
              <li>
                <span className="process-step">3</span>
                <div>
                  <strong>Boarding points set</strong>
                  <p>{draft.pickup || activeTrip.pickup.join(" or ")} → {draft.dropoff || activeTrip.dropoff.join(" or ")}</p>
                </div>
              </li>
              <li>
                <span className="process-step">4</span>
                <div>
                  <strong>Passenger details entered</strong>
                  <p>{draft.name} · {draft.email} · {draft.phone}</p>
                </div>
              </li>
              <li>
                <span className="process-step">5</span>
                <div>
                  <strong>Fare calculated</strong>
                  <p>MWK {activeTrip.fare.toLocaleString("en-MW")} × {passengers} = MWK {amountDue.toLocaleString("en-MW")}</p>
                </div>
              </li>
            </ol>
            <Link className="primary-button" href="/transport-booking" onClick={backToBooking}>Change booking</Link>
          </section>

          <section className="module-section payment-checkout-panel" aria-label="Payment details">
            {paymentStarted ? (
              <div className="payment-progress" role="status" aria-live="polite">
                <h3>Confirming your payment…</h3>
              </div>
            ) : (
              <>
                {error && <p className="module-error" role="alert">{error}</p>}
                {notice && <p className="module-notice" role="status">{notice}</p>}
                {!session && <p className="module-notice" role="status">Sign in as a passenger to pay. <Link href="/login/user">Sign in</Link></p>}
                <strong>Amount due: MWK {amountDue.toLocaleString("en-MW")}</strong>

                <label className="map-route-filter">Payment method
                  <select
                    value={paymentMethodId}
                    onChange={(event) => { setPaymentMethodId(event.target.value); setError(""); }}
                  >
                    {paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}
                  </select>
                </label>

                {paymentMethodId.endsWith("_demo") && (
                  <div className="payment-provider-fields">
                    <p className="module-footnote">Demonstration form only. Details are not sent to a provider or stored.</p>
                    {(paymentMethodId === "airtel_demo" || paymentMethodId === "tnm_demo" || paymentMethodId === "paychangu_demo") && (
                      <label className="map-route-filter">
                        {paymentMethodId === "paychangu_demo" ? "Payer phone number" : "Mobile money phone number"}
                        <input value={paymentPhone} onChange={(event) => setPaymentPhone(event.target.value)} inputMode="tel" placeholder="e.g. 0991 234 567" />
                      </label>
                    )}
                    {(paymentMethodId === "bank_demo" || paymentMethodId === "paychangu_demo") && (
                      <label className="map-route-filter">Account or payer name<input value={paymentAccountName} onChange={(event) => setPaymentAccountName(event.target.value)} placeholder="Name on account" /></label>
                    )}
                    {paymentMethodId === "bank_demo" && <>
                      <label className="map-route-filter">Bank<select value={bankName} onChange={(event) => setBankName(event.target.value)}><option value="">Choose a Malawi bank</option>{MALAWI_BANKS.map((bank) => <option key={bank}>{bank}</option>)}</select></label>
                      <label className="map-route-filter">Account number<input value={paymentAccountNumber} onChange={(event) => setPaymentAccountNumber(event.target.value)} inputMode="numeric" /></label>
                    </>}
                  </div>
                )}

                {paymentMethodsLoading && <p className="module-copy" role="status">Loading payment methods…</p>}
                {paymentMethodsError && <p className="module-error" role="alert">{paymentMethodsError} <button type="button" className="text-action" onClick={() => {
                  setPaymentMethodsLoading(true);
                  setPaymentMethodsError("");
                  setPaymentMethodLoadAttempt((attempt) => attempt + 1);
                }}>Retry</button></p>}
                {!paymentMethodsLoading && !paymentMethodsError && paymentMethods.length === 0 && <p className="module-error" role="alert">No supported payment methods are available.</p>}
                <div className="payment-actions">
                  <button className="primary-button" type="button" onClick={completePayment} disabled={saving || !session || paymentMethodsLoading || paymentMethods.length === 0} aria-busy={saving}>
                    Pay
                  </button>
                  <Link className="primary-button" href="/transport-booking" onClick={backToBooking}>Back to booking</Link>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
