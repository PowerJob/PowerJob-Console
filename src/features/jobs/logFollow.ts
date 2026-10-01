/** Choose a valid log page without moving a reader away from historical output. */
export function nextLogPage(index: number, previousPages: number | undefined, totalPages: number, following: boolean) {
  const last = Math.max(0, totalPages - 1);
  const validIndex = Math.min(Math.max(0, index), last);
  if (!following) return validIndex;
  // A new viewer starts at the latest page. Later responses may advance only
  // when their request originated at the last known page.
  if (previousPages === undefined || index === Math.max(0, previousPages - 1)) return last;
  return validIndex;
}
