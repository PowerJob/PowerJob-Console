// WorkerStatusVO exposes CPU as load / cores and memory/disk as a percentage.
export function resourcePercent(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const percentage = value.match(/^\s*([\d.,\u00a0\u202f]+)\s*%/);
  const cpu = value.match(/^\s*([\d.,\u00a0\u202f]+)\s*\/\s*([\d.,\u00a0\u202f]+)\s+cores\s*$/i);
  const number = (text: string) => {
    const compact = text.replace(/[\u00a0\u202f]/g, '');
    // The VO's NumberFormat allows one decimal digit and uses the Server locale.
    if (/,\d$/.test(compact)) return Number(compact.replace(/\./g, '').replace(',', '.'));
    if (/^\d{1,3}(\.\d{3})+$/.test(compact)) return Number(compact.replace(/\./g, ''));
    return Number(compact.replace(/,/g, ''));
  };
  let percent: number;
  if (percentage) percent = number(percentage[1]!);
  else if (cpu) {
    const cores = number(cpu[2]!);
    if (cores <= 0) return undefined;
    percent = number(cpu[1]!) / cores * 100;
  } else return undefined;
  return Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : undefined;
}
