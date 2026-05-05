export interface ProjectionPoint {
  age: string
  current: number
  optimised: number
}

export function buildProjection(
  currentMonthlySavings: number,
  optimisedMonthlySavings: number,
  currentBalance: number,
  startAge: number = 23,
  months: number = 84
): ProjectionPoint[] {
  const r = 0.04 / 12

  function fv(contrib: number, pv: number, n: number): number {
    return Math.round(pv * Math.pow(1 + r, n) + contrib * ((Math.pow(1 + r, n) - 1) / r))
  }

  return Array.from({ length: months }, (_, i) => ({
    age: (startAge + i / 12).toFixed(1),
    current: fv(currentMonthlySavings, currentBalance, i),
    optimised: fv(optimisedMonthlySavings, currentBalance, i),
  }))
}
