"use client";

import { useEffect } from "react";

/**
 * Bring the section that owns an edit form into view and focus the first field
 * of that form, so editing a row from a collapsed list never leaves the admin
 * staring at the bottom of the page.
 */
export function revealAdminEditor(section: HTMLElement | null) {
  if (!section) return;
  section.scrollIntoView({ behavior: "smooth", block: "start" });
  const forms = section.querySelectorAll<HTMLElement>(".admin-data-form");
  const form = forms[forms.length - 1] ?? null;
  const field = form?.querySelector<HTMLElement>(
    "input:not([type='hidden']):not([disabled]), select:not([disabled]), textarea:not([disabled])",
  );
  field?.focus({ preventScroll: true });
}

/**
 * Status messages sit above the collapsible record lists. Reveal them whenever
 * they change so Hide/Remove/Edit results are visible where the action was taken.
 */
export function useAdminFeedbackReveal(feedback: string, id: string) {
  useEffect(() => {
    if (!feedback) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [feedback, id]);
}
