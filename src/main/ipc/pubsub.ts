import { ipcMain, WebContents } from 'electron'
import { pubsubService } from '../services/pubsub.service'

// Maps a topic to a Set of subscribed Renderer WebContents
const topicSubscribers = new Map<string, Set<WebContents>>()
// Stores the backend-to-frontend bridge listeners to prevent duplication
const globalListeners = new Map<string, (data: any) => void>()

/**
 * Registers the Pub/Sub IPC handlers.
 * Allows agents in the renderer process to publish and subscribe
 * to the central event bus hosted in the main process.
 */
export function registerPubSubIPC(): void {
  // Renderer -> Main: Publish
  ipcMain.on('pubsub:publish', (_event, topic: string, data: any) => {
    pubsubService.publish(topic, data)
  })

  // Renderer -> Main: Subscribe
  ipcMain.on('pubsub:subscribe', (event, topic: string) => {
    const sender = event.sender

    if (!topicSubscribers.has(topic)) {
      topicSubscribers.set(topic, new Set())

      // Create an idempotent bridge listener for this topic
      const bridgeListener = (data: any) => {
        const subs = topicSubscribers.get(topic)
        if (subs) {
          for (const wc of subs) {
            if (!wc.isDestroyed()) {
              wc.send('pubsub:message', topic, data)
            } else {
              subs.delete(wc)
            }
          }
        }
      }

      globalListeners.set(topic, bridgeListener)
      pubsubService.subscribe(topic, bridgeListener)
    }

    // Add renderer to the subscription list for this topic
    topicSubscribers.get(topic)!.add(sender)

    // Cleanup if this specific webContents is destroyed
    if (!sender.isDestroyed()) {
      sender.once('destroyed', () => {
        const subs = topicSubscribers.get(topic)
        if (subs) {
          subs.delete(sender)
        }
      })
    }
  })

  // Renderer -> Main: Unsubscribe
  ipcMain.on('pubsub:unsubscribe', (event, topic: string) => {
    const sender = event.sender
    const subs = topicSubscribers.get(topic)
    if (subs) {
      subs.delete(sender)
    }
  })
}
