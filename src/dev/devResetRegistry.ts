export type DevResetHandler = () => void | Promise<void>;

const handlers = new Set<DevResetHandler>();

export function registerDevReset(handler: DevResetHandler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

export async function runAllDevResets(): Promise<void> {
  for (const handler of handlers) {
    await handler();
  }
}
