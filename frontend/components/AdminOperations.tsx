"use client";

import { useEffect, useState, type FormEvent } from "react";
import * as authApi from "@/services/auth.service";
import * as apiBookings from "@/services/bookings.service";
import * as apiSchedules from "@/services/schedules.service";
import * as apiUsers from "@/services/users.service";
import * as apiVehicles from "@/services/vehicles.service";
import type { PendingRequest } from "@/services/auth.service";

type LookupType = "schedule" | "vehicle" | "user" | "booking";

export default function AdminOperations() {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requestError, setRequestError] = useState("");
  const [approving, setApproving] = useState<number | null>(null);
  const [lookupType, setLookupType] = useState<LookupType>("schedule");
  const [recordId, setRecordId] = useState("");
  const [record, setRecord] = useState<unknown>(null);
  const [lookupError, setLookupError] = useState("");
  const [lookingUp, setLookingUp] = useState(false);

  async function loadRequests() {
    setLoadingRequests(true);
    setRequestError("");
    try {
      setRequests(await authApi.listRequests("driver"));
    } catch (reason) {
      setRequestError(reason instanceof Error ? reason.message : "Driver requests could not be loaded.");
    } finally {
      setLoadingRequests(false);
    }
  }

  useEffect(() => { void loadRequests(); }, []);

  async function approve(id: number) {
    setApproving(id);
    setRequestError("");
    try {
      await authApi.approveRequest(id);
      await loadRequests();
    } catch (reason) {
      setRequestError(reason instanceof Error ? reason.message : "The driver request could not be approved.");
    } finally {
      setApproving(null);
    }
  }

  async function lookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLookupError("");
    setRecord(null);
    setLookingUp(true);
    try {
      const numericId = Number(recordId);
      if (lookupType !== "booking" && (!Number.isSafeInteger(numericId) || numericId < 1)) {
        throw new Error("Enter a valid numeric record ID.");
      }
      const result = lookupType === "schedule"
        ? await apiSchedules.getForAdmin(numericId)
        : lookupType === "vehicle"
          ? await apiVehicles.get(numericId)
          : lookupType === "user"
            ? await apiUsers.get(numericId)
            : await apiBookings.getForAdmin(recordId.trim());
      setRecord(result);
    } catch (reason) {
      setLookupError(reason instanceof Error ? reason.message : "The record could not be loaded.");
    } finally {
      setLookingUp(false);
    }
  }

  return (
    <div className="admin-section-content">
      <p className="module-eyebrow">ADMIN TOOLS</p>
      <h3>Driver requests and record lookup</h3>

      <section className="module-section" aria-labelledby="driver-request-heading">
        <div className="module-section-heading">
          <div><p className="module-eyebrow">DRIVER ACCESS</p><h4 id="driver-request-heading">Pending driver requests</h4></div>
          <button className="secondary-button" type="button" onClick={() => void loadRequests()} disabled={loadingRequests}>Refresh</button>
        </div>
        {loadingRequests ? <p className="module-empty">Loading requests…</p> : requestError ? <p className="module-error" role="alert">{requestError}</p> : requests.length === 0 ? <p className="module-empty">There are no driver requests waiting for review.</p> : (
          <ul className="admin-demo-list">
            {requests.map((request) => (
              <li key={request.id}>
                <span><strong>{request.user?.fullName ?? `Request ${request.id}`}</strong><small>{request.user?.email ?? "Email not supplied"} · {request.type ?? "driver"} · {request.status ?? "pending"}</small></span>
                <button className="primary-button" type="button" onClick={() => void approve(request.id)} disabled={approving === request.id}>{approving === request.id ? "Approving…" : "Approve driver"}</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="module-section" aria-labelledby="record-lookup-heading">
        <div className="module-section-heading"><div><p className="module-eyebrow">BACKEND RECORDS</p><h4 id="record-lookup-heading">Look up an individual record</h4></div></div>
        <form className="module-form admin-demo-lookup" onSubmit={lookup}>
          <label>Record type<select value={lookupType} onChange={(event) => setLookupType(event.target.value as LookupType)}><option value="schedule">Schedule</option><option value="vehicle">Vehicle</option><option value="user">User</option><option value="booking">Booking</option></select></label>
          <label>{lookupType === "booking" ? "Booking reference" : "Record ID"}<input value={recordId} onChange={(event) => setRecordId(event.target.value)} required /></label>
          <button className="primary-button" type="submit" disabled={lookingUp}>{lookingUp ? "Loading…" : "Load record"}</button>
        </form>
        {lookupError && <p className="module-error" role="alert">{lookupError}</p>}
        {record !== null && <pre className="admin-demo-record">{JSON.stringify(record, null, 2)}</pre>}
      </section>
    </div>
  );
}
