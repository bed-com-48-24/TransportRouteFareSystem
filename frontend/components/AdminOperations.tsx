"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import * as authApi from "@/services/auth.service";
import * as apiBookings from "@/services/bookings.service";
import * as apiSchedules from "@/services/schedules.service";
import * as apiUsers from "@/services/users.service";
import AdminRecordsPanel from "@/components/AdminRecordsPanel";
import { revealAdminEditor, useAdminFeedbackReveal } from "@/components/admin-reveal";
import { suggestedVehicleCapacity } from "@/lib/vehicle-capacity";
import * as apiVehicles from "@/services/vehicles.service";
import type { PendingRequest } from "@/services/auth.service";
import type { BackendUser, Vehicle } from "@/services/types";

type LookupType = "schedule" | "vehicle" | "user" | "booking";

export default function AdminOperations() {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requestError, setRequestError] = useState("");
  const [approving, setApproving] = useState<number | null>(null);
  const [requestType, setRequestType] = useState<"driver" | "admin">("driver");
  const [lookupType, setLookupType] = useState<LookupType>("schedule");
  const [recordId, setRecordId] = useState("");
  const [record, setRecord] = useState<unknown>(null);
  const [lookupError, setLookupError] = useState("");
  const [lookingUp, setLookingUp] = useState(false);

  const loadRequests = useCallback(async (type: "driver" | "admin") => {
    setLoadingRequests(true);
    setRequestError("");
    try {
      setRequests(await authApi.listRequests(type));
    } catch (reason) {
      setRequestError(reason instanceof Error ? reason.message : "Access requests could not be loaded.");
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => { void loadRequests(requestType); }, [loadRequests, requestType]);

  async function approve(id: number) {
    setApproving(id);
    setRequestError("");
    try {
      await authApi.approveRequest(id);
      await loadRequests(requestType);
    } catch (reason) {
      setRequestError(reason instanceof Error ? reason.message : "The access request could not be approved.");
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
      <h3>Access requests, fleet and record lookup</h3>

      <section className="module-section" aria-labelledby="driver-request-heading">
        <div className="module-section-heading">
          <div><p className="module-eyebrow">ACCESS REQUESTS</p><h4 id="driver-request-heading">Pending {requestType} requests</h4></div>
          <div className="admin-record-actions">
            <select aria-label="Request type" value={requestType} onChange={(event) => setRequestType(event.target.value as "driver" | "admin")}>
              <option value="driver">Driver access</option><option value="admin">Admin access</option>
            </select>
            <button className="secondary-button" type="button" onClick={() => void loadRequests(requestType)} disabled={loadingRequests}>Refresh</button>
          </div>
        </div>
        {loadingRequests ? <p className="module-empty">Loading requests…</p> : requestError ? <p className="module-error" role="alert">{requestError}</p> : requests.length === 0 ? <p className="module-empty">There are no pending {requestType} requests.</p> : (
          <ul className="admin-demo-list">
            {requests.map((request) => (
              <li key={request.id}>
                <span><strong>{request.user?.fullName ?? `Request ${request.id}`}</strong><small>{request.user?.email ?? "Email not supplied"} · {request.type ?? "driver"} · {request.status ?? "pending"}</small></span>
                <button className="primary-button" type="button" onClick={() => void approve(request.id)} disabled={approving === request.id}>{approving === request.id ? "Approving…" : `Approve ${requestType}`}</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <VehicleFleet />

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

function VehicleFleet() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<BackendUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("Minibus");
  const [capacity, setCapacity] = useState("15");
  const [description, setDescription] = useState("");
  const [driverId, setDriverId] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  useAdminFeedbackReveal(feedback, "admin-vehicle-feedback");

  const loadFleet = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [fleetResult, driversResult] = await Promise.allSettled([apiVehicles.list(), apiUsers.list("driver")]);
      if (fleetResult.status === "rejected") throw fleetResult.reason;
      setVehicles(fleetResult.value);
      if (driversResult.status === "fulfilled") setDrivers(driversResult.value);
      else setError(driversResult.reason instanceof Error ? `Vehicle list loaded; driver list unavailable: ${driversResult.reason.message}` : "Vehicle list loaded; driver list unavailable.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The vehicle fleet could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadFleet(); }, [loadFleet]);

  function resetForm() {
    setEditingId(null);
    setPlateNumber("");
    setVehicleType("Minibus");
    setCapacity("15");
    setDescription("");
    setDriverId("");
  }

  async function saveVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const seatCapacity = Number(capacity);
    if (!Number.isSafeInteger(seatCapacity) || seatCapacity < 1 || seatCapacity > 200) {
      setFeedback("Seat capacity must be a whole number between 1 and 200.");
      return;
    }
    setSaving(true);
    setFeedback("");
    try {
      const input = {
        plateNumber: plateNumber.trim(),
        vehicleType: vehicleType.trim(),
        capacity: seatCapacity,
        description: description.trim() || undefined,
        driverId: driverId ? Number(driverId) : undefined,
      };
      if (editingId !== null) await apiVehicles.update(editingId, input);
      else await apiVehicles.create(input);
      await loadFleet();
      resetForm();
      setFeedback(editingId !== null ? "Vehicle updated." : "Vehicle added to the fleet.");
    } catch (reason) {
      setFeedback(reason instanceof Error ? reason.message : "The vehicle could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  function editVehicle(vehicle: Vehicle) {
    setEditingId(vehicle.id);
    setPlateNumber(vehicle.plateNumber);
    setVehicleType(vehicle.vehicleType);
    setCapacity(String(vehicle.capacity));
    setDescription(vehicle.description ?? "");
    setDriverId(vehicle.driverId ? String(vehicle.driverId) : "");
    setFeedback("");
    revealAdminEditor(sectionRef.current);
  }

  async function removeVehicle(vehicle: Vehicle) {
    if (!window.confirm(`Remove vehicle ${vehicle.plateNumber} from the fleet?`)) return;
    setError("");
    try {
      await apiVehicles.remove(vehicle.id);
      await loadFleet();
      if (editingId === vehicle.id) resetForm();
      setFeedback(`Vehicle ${vehicle.plateNumber} removed.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The vehicle could not be removed.");
    }
  }

  return (
    <section className="module-section" aria-labelledby="vehicle-fleet-heading" ref={sectionRef}>
      <div className="module-section-heading">
        <div><p className="module-eyebrow">FLEET</p><h4 id="vehicle-fleet-heading">Manage vehicles</h4></div>
        <button type="button" className="secondary-button" onClick={() => void loadFleet()} disabled={loading}>{loading ? "Loading..." : "Refresh fleet"}</button>
      </div>
      <form className="module-form admin-data-form" onSubmit={saveVehicle}>
        <label>Registration / plate<input value={plateNumber} onChange={(event) => setPlateNumber(event.target.value)} maxLength={30} required /></label>
        <label>Vehicle type<select value={vehicleType} onChange={(event) => {
          const type = event.target.value;
          setVehicleType(type);
          setCapacity(String(suggestedVehicleCapacity(type)));
        }} required><option value="Minibus">Minibus</option><option value="Bus">Bus</option><option value="Coach">Coach</option><option value="Shuttle">Shuttle</option></select></label>
        <label>Passenger seats (suggested)<input type="number" min="1" max="200" step="1" value={capacity} onChange={(event) => setCapacity(event.target.value)} required /></label>
        <p className="module-footnote">Capacity fills from vehicle type; adjust it to match the actual vehicle.</p>
        <label>Assigned driver <span className="optional-label">Optional</span><select value={driverId} onChange={(event) => setDriverId(event.target.value)}><option value="">{drivers.length ? "Unassigned" : "No approved drivers available"}</option>{drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.fullName} · {driver.email ?? `ID ${driver.id}`}</option>)}</select></label>
        {drivers.length === 0 && <p className="module-footnote">Approve a driver access request above to add names to this list.</p>}
        <label>Description <span className="optional-label">Optional</span><input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={200} placeholder="e.g. white Toyota Coaster, air-conditioned" /></label>
        <button className="primary-button" type="submit" disabled={saving}>{saving ? "Saving vehicle..." : editingId !== null ? "Save vehicle" : "Add vehicle"}</button>
        {editingId !== null && <button className="secondary-button" type="button" onClick={resetForm}>Cancel edit</button>}
      </form>
      {error && <p className="module-error" role="alert">{error}</p>}
      {feedback && <p id="admin-vehicle-feedback" className="module-feedback" role="status">{feedback}</p>}
      <AdminRecordsPanel label="vehicles in the fleet" count={vehicles.length}>
        {loading ? <p className="module-empty">Loading vehicles...</p> : vehicles.length === 0 ? <p className="module-empty">No vehicles have been added yet.</p> : (
          <div className="admin-record-list">
            {vehicles.map((vehicle) => (
              <article key={vehicle.id}>
                <div><strong>{vehicle.plateNumber} · {vehicle.vehicleType}</strong><small>{vehicle.capacity} seats · {vehicle.description || "No description"} · {drivers.find((driver) => driver.id === vehicle.driverId)?.fullName ?? "No driver assigned"}</small></div>
                <div className="admin-record-actions"><button type="button" className="text-action" onClick={() => editVehicle(vehicle)}>Edit</button><button type="button" className="text-action danger-action" onClick={() => void removeVehicle(vehicle)}>Remove</button></div>
              </article>
            ))}
          </div>
        )}
      </AdminRecordsPanel>
    </section>
  );
}
