"use client";

import Link from "next/link";
import { KEYS, SEED_FARES, SEED_ROUTES } from "@/lib/seed";
import { useStoredList } from "@/lib/storage";
import type { FareItem, RouteItem } from "@/lib/types";

export default function FeaturedRoutes() {
  const routes = useStoredList<RouteItem>(KEYS.routes, SEED_ROUTES)
    .filter((route) => route.active !== false && route.featured)
    .slice(0, 3);
  const fares = useStoredList<FareItem>(KEYS.fares, SEED_FARES);

  return (
    <section className="home-featured" aria-labelledby="featured-routes-title">
      <div><p className="module-eyebrow">POPULAR SAMPLE ROUTES</p><h2 id="featured-routes-title">Featured journeys</h2></div>
      {routes.length === 0 ? <p>No featured routes have been selected in this demo.</p> : (
        <div className="home-featured-grid">
          {routes.map((route) => {
            const fare = fares.find((item) => item.routeId === route.id)?.amount;
            return <Link key={route.id} href={`/routes-fares/${encodeURIComponent(route.id)}`}><strong>{route.origin} → {route.destination}</strong><span>{route.service} · {fare ? `From MWK ${fare.toLocaleString("en-MW")}` : "Fare estimate unavailable"}</span><small>Route details →</small></Link>;
          })}
        </div>
      )}
    </section>
  );
}
