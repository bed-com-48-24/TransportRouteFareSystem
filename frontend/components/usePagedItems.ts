"use client";

import { useEffect, useState } from "react";
import { compareText } from "@/lib/list-utils";

type PagedItemsOptions = {
  pageSize?: number;
  resetKey?: string | number;
};

export function usePagedItems<T>(
  items: readonly T[],
  labelForSort: (item: T) => string,
  { pageSize = 4, resetKey }: PagedItemsOptions = {},
) {
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [resetKey]);

  const sorted = [...items].sort((a, b) => compareText(labelForSort(a), labelForSort(b)));
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * pageSize;
  const visibleItems = sorted.slice(start, start + pageSize);

  return { page: safePage, setPage, pageCount, visibleItems, total: sorted.length };
}
