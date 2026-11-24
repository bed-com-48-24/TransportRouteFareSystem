"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { fmtDate } from "@/lib/booking-data";
import { paymentLabel } from "@/lib/profile-booking";
import type { Booking } from "@/lib/types";

/** The same ticket passengers receive immediately after a successful payment. */
export default function PaymentTicketCard({ booking }: { booking: Booking }) {
  const [qr, setQr] = useState("");

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(JSON.stringify({
      reference: booking.reference,
      tripId: booking.tripId,
      route: booking.route,
      travelDate: booking.travelDate,
      pickup: booking.pickup,
      dropoff: booking.dropoff,
      passengers: booking.passengers,
      seats: booking.seats,
    }), { errorCorrectionLevel: "H", margin: 1, width: 280 })
      .then((url) => { if (!cancelled) setQr(url); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [booking]);

  async function downloadTicketImage() {
    if (!qr) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 720;
      const context = canvas.getContext("2d");
      if (!context) return;

      context.fillStyle = "#f2f7fb";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#ffffff";
      context.fillRect(32, 32, 1136, 656);
      context.fillStyle = "#12304a";
      context.fillRect(32, 32, 1136, 100);
      context.fillStyle = "#ffffff";
      context.font = "700 40px sans-serif";
      context.fillText("SBUS TICKET", 76, 94);

      const fields: Array<[string, string]> = [
        ["ROUTE", booking.route],
        ["PASSENGER", booking.name],
        ["DATE", fmtDate(booking.travelDate)],
        ["BOARDING", booking.pickup],
        ["DESTINATION", booking.dropoff],
        ["PASSENGERS", String(booking.passengers)],
        ["SEATS", booking.seats?.length ? booking.seats.join(", ") : "Not assigned"],
        ["REFERENCE", booking.reference],
        ["PAID", `MWK ${(booking.amountPaid ?? 0).toLocaleString("en-MW")}`],
      ];
      let y = 166;
      for (const [label, value] of fields) {
        context.fillStyle = "#526d87";
        context.font = "700 15px sans-serif";
        context.fillText(label, 76, y);
        context.fillStyle = "#12304a";
        context.font = "600 22px sans-serif";
        context.fillText(value, 76, y + 24, 700);
        y += 44;
      }

      const qrImage = document.createElement("img");
      qrImage.src = qr;
      await qrImage.decode();
      context.fillStyle = "#ffffff";
      context.fillRect(850, 190, 260, 260);
      context.drawImage(qrImage, 860, 200, 240, 240);

      const download = document.createElement("a");
      download.href = canvas.toDataURL("image/png");
      download.download = `sbus-ticket-${booking.reference}.png`;
      download.click();
    } catch {
      // A failed download should not hide the ticket that is already on screen.
    }
  }

  return (
    <article className="ticket-card" aria-label={`Ticket ${booking.reference}`}>
      <div className="ticket-details">
        <p className="ticket-route">{booking.route}</p>
        <p>{fmtDate(booking.travelDate)}</p>
        <p>{booking.pickup} → {booking.dropoff}</p>
        <p>{booking.passengers} passenger{booking.passengers === 1 ? "" : "s"} · {booking.name}</p>
        {booking.seats?.length ? <p>Seats: {booking.seats.join(", ")}</p> : null}
        <p className="ticket-reference">Reference: <strong>{booking.reference}</strong></p>
        <div className="ticket-receipt">
          <dl>
            <div><dt>Amount paid</dt><dd>MWK {(booking.amountPaid ?? 0).toLocaleString("en-MW")}</dd></div>
            <div><dt>Payment method</dt><dd>{paymentLabel(booking)}</dd></div>
          </dl>
        </div>
        <div className="ticket-actions">
          <button className="primary-button" type="button" onClick={downloadTicketImage} disabled={!qr}>Download ticket</button>
        </div>
      </div>
      <div className="ticket-qr-wrap">
        {qr ? (
          <Image src={qr} alt={`QR code for ticket ${booking.reference}`} width={200} height={200} unoptimized />
        ) : (
          <span className="ticket-qr-placeholder" aria-hidden="true" />
        )}
        <small>Show this code when boarding</small>
      </div>
    </article>
  );
}
