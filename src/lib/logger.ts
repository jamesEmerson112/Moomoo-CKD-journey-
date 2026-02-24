export function logInfo(message: string, meta?: Record<string, unknown>): void {
  console.info(`[momoo] ${message}`, meta ?? {});
}

export function logError(message: string, meta?: Record<string, unknown>): void {
  console.error(`[momoo] ${message}`, meta ?? {});
}
