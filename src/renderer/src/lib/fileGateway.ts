import { useEffect, useRef } from 'react'

export interface FileGatewayDropDetail {
  file: File
  name: string
  path: string
  size: number
  type: string
}

declare global {
  interface Window {
    __nexus_pending_drop?: FileGatewayDropDetail
  }
}

/** Supported extension matching logic matching enterprise requirements */
export function resolveGatewayRoute(fileName: string): string | null {
  const lower = fileName.toLowerCase()

  if (lower.endsWith('.pdf')) {
    return '/pdf-studio'
  }
  if (lower.endsWith('.sqlite') || lower.endsWith('.db') || lower.endsWith('.db3') || lower.endsWith('.sql')) {
    return '/json-studio'
  }
  if (/\.(png|jpe?g|webp|avif|gif|tiff|bmp|svg)$/i.test(lower)) {
    return '/image'
  }
  if (lower.endsWith('.nexusvault')) {
    return '/fortress'
  }
  if (lower.endsWith('.jwt')) {
    return '/jwt-studio'
  }
  if (lower.endsWith('.cron') || lower.endsWith('.tab')) {
    return '/cron-studio'
  }
  if (lower.endsWith('.mmd') || lower.endsWith('.mermaid')) {
    return '/mermaid-studio'
  }
  if (lower.endsWith('.b64') || lower.endsWith('.hex') || lower.endsWith('.bin')) {
    return '/encoding-studio'
  }
  if (lower.endsWith('.json')) {
    return '/json-studio'
  }
  if (/\.(md|markdown|txt)$/i.test(lower)) {
    return '/scratchpad'
  }
  if (/\.(sha256|sha512|md5)$/i.test(lower)) {
    return '/hash-studio'
  }

  return null
}

let pendingDrop: FileGatewayDropDetail | null = null

export function setPendingDrop(detail: FileGatewayDropDetail): void {
  pendingDrop = detail
  if (typeof window !== 'undefined') {
    window.__nexus_pending_drop = detail
  }
}

export function consumePendingDrop(): FileGatewayDropDetail | null {
  const item = pendingDrop || (typeof window !== 'undefined' ? window.__nexus_pending_drop : null)
  pendingDrop = null
  if (typeof window !== 'undefined') {
    delete window.__nexus_pending_drop
  }
  return item || null
}

export function getPendingDrop(): FileGatewayDropDetail | null {
  return pendingDrop || (typeof window !== 'undefined' ? window.__nexus_pending_drop : null) || null
}

export function dispatchGatewayDrop(detail: FileGatewayDropDetail): void {
  setPendingDrop(detail)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<FileGatewayDropDetail>('nexus:file-gateway-drop', {
        detail,
      })
    )
  }
}

/**
 * Hook for tool workstations to consume dropped files synchronously on mount
 * and in real-time when already open.
 */
export function useFileGatewayDrop(handler: (detail: FileGatewayDropDetail) => void) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    // 1. Consume pending drop cached during navigation
    const pending = consumePendingDrop()
    if (pending) {
      handlerRef.current(pending)
    }

    // 2. Listen for runtime drops while already mounted
    const onDropEvent = (e: Event) => {
      const customEvent = e as CustomEvent<FileGatewayDropDetail>
      if (customEvent.detail) {
        handlerRef.current(customEvent.detail)
      }
    }

    window.addEventListener('nexus:file-gateway-drop', onDropEvent)
    return () => {
      window.removeEventListener('nexus:file-gateway-drop', onDropEvent)
    }
  }, [])
}
