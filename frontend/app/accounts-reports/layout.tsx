import Link from "next/link";
import type { ReactNode } from "react";

export default function AccountsReportsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <header className="border-b border-[#D7E2EF] bg-white">
        <nav
          aria-label="Accounts and reports navigation"
          className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"
        >
          <Link href="/accounts-reports/home" className="font-bold text-[#12304A]">
            SBUS <span className="font-medium text-[#617B96]">Accounts &amp; Reports</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/accounts-reports/home"
              className="text-sm font-semibold text-[#29466D] hover:underline"
            >
              Dashboard
            </Link>
            </div>
        </nav>
      </header>
      {children}
    </>
  );
}
