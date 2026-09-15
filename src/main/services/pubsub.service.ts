import { EventEmitter } from 'events'

/**
 * Lightweight Event Emitter service for Inter-Agent Pub/Sub.
 * Enables real-time memory sharing and event passing between agents
 * operating in the backend (terminal/Node) or frontend (renderer).
 */
class PubSubService extends EventEmitter {
  constructor() {
    super()
    // Support a large number of agent subscriptions simultaneously
    this.setMaxListeners(200)
  }

  /**
   * Publish an event to a specific topic
   * @param topic - The channel/topic name (e.g., 'agent:memory:update')
   * @param data - The payload to dispatch
   * @returns true if the event had listeners, false otherwise
   */
  publish<T = any>(topic: string, data?: T): boolean {
    return this.emit(topic, data)
  }

  /**
   * Subscribe to a specific topic
   * @param topic - The channel/topic name
   * @param listener - Callback function to invoke on events
   */
  subscribe<T = any>(topic: string, listener: (data: T) => void): this {
    // Idempotent addition: only add if not already listening
    if (!this.listeners(topic).includes(listener)) {
      this.on(topic, listener)
    }
    return this
  }

  /**
   * Unsubscribe from a specific topic
   * @param topic - The channel/topic name
   * @param listener - Callback function to remove
   */
  unsubscribe<T = any>(topic: string, listener: (data: T) => void): this {
    this.off(topic, listener)
    return this
  }
}

export const pubsubService = new PubSubService()
