"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import MainNavigation from "@/components/MainNavigation";

export default function SiteHeader() {
  const pathname = usePathname();
  const isEntryPage =
    pathname === "/" || pathname === "/login" || pathname.startsWith("/login/");

  // The first page is a plain account chooser, so it has no site navigation.
  if (isEntryPage) return null;

  return (
    <header className="site-header">
      <Link href="/" className="site-brand" aria-label="SBUS home">
        <span className="site-brand-mark" aria-hidden="true">S</span>
        <span>SBUS<small>Travel information</small></span>
      </Link>
      <Suspense fallback={null}>
        <MainNavigation />
      </Suspense>
    </header>
  );
}
