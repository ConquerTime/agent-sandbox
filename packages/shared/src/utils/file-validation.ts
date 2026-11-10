const DEFAULT_MAX_BYTES = 20 * 1024 * 1024;

export function validateFileSize(
  file: File,
  maxBytes: number = DEFAULT_MAX_BYTES
): { ok: boolean; error?: string } {
  if (file.size <= maxBytes) {
    return { ok: true };
  }
  return {
    ok: false,
    error: `File exceeds ${(maxBytes / (1024 * 1024)).toFixed(0)}MB limit`,
  };
}
