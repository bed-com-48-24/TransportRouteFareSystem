"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { KEYS, SEED_ROUTES } from "@/lib/seed";
import { useStoredList } from "@/lib/storage";
import type { RouteItem } from "@/lib/types";

const RECENT_SEARCH_KEY = "routewise-recent-destinations-v1";

export default function HomeJourneySearch() {
  const router = useRouter();
  const routes = useStoredList<RouteItem>(KEYS.routes, SEED_ROUTES).filter((route) => route.active !== false);
  const towns = useMemo(() => [...new Set(routes.flatMap((route) => [route.origin, route.destination]))].sort(), [routes]);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(RECENT_SEARCH_KEY) ?? "[]");
      if (Array.isArray(saved) && saved.every((item) => typeof item === "string")) setRecent(saved.slice(0, 5));
    } catch {
      setRecent([]);
    }
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const from = origin.trim();
    const to = destination.trim();
    if (!from || !to || from.toLowerCase() === to.toLowerCase()) return;

    try {
      const current: string[] = JSON.parse(localStorage.getItem(RECENT_SEARCH_KEY) ?? "[]");
      const next = [to, ...current.filter((item) => item !== to)].slice(0, 5);
      localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(next));
      setRecent(next);
    } catch {
      setRecent([]);
    }
    router.push(`/routes-fares?origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}`);
  }

  return (
    <form className="home-journey-search" onSubmit={submit}>
      <label>From<input list="home-route-towns" value={origin} onChange={(event) => setOrigin(event.target.value)} placeholder="Starting town" required /></label>
      <label>To<input list="home-route-towns" value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Where are you going?" required /></label>
      <datalist id="home-route-towns">{towns.map((town) => <option key={town} value={town} />)}</datalist>
      <button className="primary-button" type="submit">Search sample routes</button>
      <small>Mock destination suggestions · Malawi</small>
      {recent.length > 0 && <div className="home-recent-searches"><span>Recent destinations:</span>{recent.map((place) => <button key={place} type="button" onClick={() => setDestination(place)}>{place}</button>)}</div>}
    </form>
  );
}
