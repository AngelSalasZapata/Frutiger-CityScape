export type EventMap = Record<string, unknown>
export type EventListener<TPayload> = (payload: TPayload) => void

/**
 * Bus de eventos tipado. Permite que simulación, render y UI se comuniquen
 * sin conocerse entre sí (principio de la arquitectura del proyecto).
 */
export class EventBus<TEvents extends object> {
  private readonly listeners = new Map<keyof TEvents, Set<EventListener<never>>>()

  on<TKey extends keyof TEvents>(event: TKey, listener: EventListener<TEvents[TKey]>): () => void {
    let listenersForEvent = this.listeners.get(event)

    if (!listenersForEvent) {
      listenersForEvent = new Set<EventListener<never>>()
      this.listeners.set(event, listenersForEvent)
    }

    listenersForEvent.add(listener as EventListener<never>)

    return () => {
      this.off(event, listener)
    }
  }

  off<TKey extends keyof TEvents>(event: TKey, listener: EventListener<TEvents[TKey]>): void {
    const listenersForEvent = this.listeners.get(event)
    if (!listenersForEvent) return

    listenersForEvent.delete(listener as EventListener<never>)

    if (listenersForEvent.size === 0) {
      this.listeners.delete(event)
    }
  }

  emit<TKey extends keyof TEvents>(event: TKey, payload: TEvents[TKey]): void {
    const listenersForEvent = this.listeners.get(event)
    if (!listenersForEvent) return

    // Copia defensiva: un listener puede desuscribirse o suscribirse durante el emit.
    for (const listener of [...listenersForEvent]) {
      ;(listener as EventListener<TEvents[TKey]>)(payload)
    }
  }

  clear(): void {
    this.listeners.clear()
  }
}
