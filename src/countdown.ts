export function formatSecondsRemaining(deadline: number, now: number, precision: 0 | 1 = 0): string {
  return Math.max(0, (deadline - now) / 1000).toFixed(precision);
}
