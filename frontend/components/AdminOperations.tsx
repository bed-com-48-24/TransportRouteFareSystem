"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import ListPagination from "@/components/ListPagination";
import { revealAdminEditor, useAdminFeedbackReveal } from "@/components/admin-reveal";
import { usePagedItems } from "@/components/usePagedItems";
import { suggestedVehicleCapacity } from "@/lib/vehicle-capacity";
import * as apiVehicles from "@/services/vehicles.service";
import type { Vehicle } from "@/services/types";

export default function AdminOperations() {
  return <VehicleFleet />;
}

function VehicleFleet() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("Minibus");
  const [capacity, setCapacity] = useState("15");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [view, setView] = useState<"list" | "form">("list");
  const sectionRef = useRef<HTMLElement>(null);
  useAdminFeedbackReveal(feedback, "admin-vehicle-feedback");
  const vehiclePages = usePagedItems(vehicles, (vehicle) => vehicle.plateNumber);

  const loadFleet = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setVehicles(await apiVehicles.list());
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
    setView("list");
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
    setView("form");
    setFeedback("");
    window.requestAnimationFrame(() => revealAdminEditor(sectionRef.current));
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
      <div className="admin-list-heading">
        <div>
          <h3 id="vehicle-fleet-heading">Fleet</h3>
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={() => { resetForm(); setView("form"); window.requestAnimationFrame(() => revealAdminEditor(sectionRef.current)); }}
        >
          Add vehicle
        </button>
      </div>

      {error && <p className="module-error" role="alert">{error}</p>}
      {feedback && <p id="admin-vehicle-feedback" className="module-feedback" role="status">{feedback}</p>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Registration</th>
              <th>Type</th>
              <th>Seats</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="admin-table-empty">Loading vehicles…</td></tr>
            ) : vehicles.length === 0 ? (
              <tr><td colSpan={5} className="admin-table-empty">No vehicles have been added yet.</td></tr>
            ) : (
              vehiclePages.visibleItems.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td><strong>{vehicle.plateNumber}</strong></td>
                  <td>{vehicle.vehicleType}</td>
                  <td>{vehicle.capacity}</td>
                  <td>{vehicle.description || "—"}</td>
                  <td>
                    <div className="admin-table-actions">
                      <button type="button" className="text-action" onClick={() => editVehicle(vehicle)}>Edit</button>
                      <button type="button" className="text-action danger-action" onClick={() => void removeVehicle(vehicle)}>Remove</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <ListPagination
        page={vehiclePages.page}
        pageCount={vehiclePages.pageCount}
        onPageChange={vehiclePages.setPage}
        label="vehicle"
      />

      {view === "form" && (
        <div className="admin-vehicle-form-wrap">
          <div className="admin-list-heading">
            <div>
              <h4>{editingId !== null ? "Edit vehicle" : "Add vehicle"}</h4>
            </div>
            <button className="secondary-button" type="button" onClick={resetForm}>Cancel</button>
          </div>
          <form className="module-form admin-data-form" onSubmit={saveVehicle}>
            <label>Registration / plate<input value={plateNumber} onChange={(event) => setPlateNumber(event.target.value)} maxLength={30} required /></label>
            <label>Vehicle type<select value={vehicleType} onChange={(event) => {
              const type = event.target.value;
              setVehicleType(type);
              setCapacity(String(suggestedVehicleCapacity(type)));
            }} required><option value="Minibus">Minibus</option><option value="Bus">Bus</option><option value="Coach">Coach</option><option value="Shuttle">Shuttle</option></select></label>
            <label>Passenger seats<input type="number" min="1" max="200" step="1" value={capacity} onChange={(event) => setCapacity(event.target.value)} required /></label>
            <label>Description <span className="optional-label">Optional</span><input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={200} placeholder="e.g. white Toyota Coaster, air-conditioned" /></label>
            <button className="primary-button" type="submit" disabled={saving}>{saving ? "Saving vehicle…" : editingId !== null ? "Save vehicle" : "Add vehicle"}</button>
          </form>
        </div>
      )}
    </section>
  );
}
