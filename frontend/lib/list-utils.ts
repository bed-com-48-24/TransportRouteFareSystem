export const LIST_PAGE_SIZE = 4;

export function compareText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });
}

export function sortByLabel<T>(items: readonly T[], label: (item: T) => string): T[] {
  return [...items].sort((a, b) => compareText(label(a), label(b)));
}
