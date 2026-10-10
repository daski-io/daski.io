// Daski counts a failed order its provider later recovered as completed (the
// owner's decision of 2026-10-10). The gateway reports recoveries apart from
// the original Failed outcomes, which never change on-chain; the website moves
// them from failed to completed as it reads the counts, so every figure, the
// completion rate included, treats them as completed and none shows a recovery
// of its own.
export function recoveredAsCompleted(
  completed: string,
  failed: string,
  recovered: string | null,
): { completed: string; failed: string; moved: boolean } {
  const failures = BigInt(failed);
  const count = recovered === null ? 0n : BigInt(recovered);
  const moved = count < failures ? count : failures;
  return { completed: String(BigInt(completed) + moved), failed: String(failures - moved), moved: moved > 0n };
}

/** A completion rate as the gateway reports one: a percentage to two decimals. */
export function completionRateOf(completed: string, sampleSize: string): number | null {
  const sample = Number(sampleSize);
  return sample > 0 ? Math.round((Number(completed) / sample) * 10000) / 100 : null;
}
