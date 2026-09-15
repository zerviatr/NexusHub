/**
 * Copyright 2026 ZenDev / NexusHub
 * Licensed under the Apache License, Version 2.0
 *
 * types.ts
 * Type definitions for Unified API Studio & Native Diagnostics.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

export interface KeyValueItem {
  id: string
  key: string
  value: string
  enabled: boolean
}

export type AuthType = 'none' | 'bearer' | 'basic' | 'apiKey'
export type ApiKeyLocation = 'header' | 'query'

export interface AuthData {
  type: AuthType
  bearerToken?: string
  basicUser?: string
  basicPass?: string
  apiKeyName?: string
  apiKeyValue?: string
  apiKeyLocation?: ApiKeyLocation
}

export type BodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'graphql'
export type RawContentType = 'text/plain' | 'application/json' | 'application/xml' | 'text/html' | 'application/javascript'

export interface ApiResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  data: string
  timeMs: number
  sizeBytes: number
  error?: string
}

export interface EnvVariable {
  id: string
  key: string
  value: string
  enabled: boolean
  isSecret?: boolean
}

export interface ApiEnvironment {
  id: string
  name: string
  variables: EnvVariable[]
}

export interface SavedRequest {
  id: string
  name: string
  collectionName?: string
  method: HttpMethod
  url: string
  params: KeyValueItem[]
  headers: KeyValueItem[]
  auth: AuthData
  bodyType: BodyType
  bodyRaw?: string
  rawContentType?: RawContentType
  bodyFormData?: KeyValueItem[]
  bodyUrlEncoded?: KeyValueItem[]
  graphqlQuery?: string
  graphqlVariables?: string
  updatedAt: number
}

export interface ApiHistoryItem {
  id: string
  timestamp: number
  method: HttpMethod
  url: string
  status?: number
  statusText?: string
  timeMs?: number
  sizeBytes?: number
  requestSnapshot: {
    params: KeyValueItem[]
    headers: KeyValueItem[]
    auth: AuthData
    bodyType: BodyType
    bodyRaw?: string
    rawContentType?: RawContentType
    bodyFormData?: KeyValueItem[]
    bodyUrlEncoded?: KeyValueItem[]
    graphqlQuery?: string
    graphqlVariables?: string
  }
}

export interface DnsRecord {
  type: string
  address?: string
  value?: string
  ttl?: number
  priority?: number
}

export interface DnsDiagnosticsResult {
  host: string
  records: DnsRecord[]
  timeMs: number
  error?: string
}

export interface TcpPingDiagnosticsResult {
  host: string
  port: number
  open: boolean
  timeMs: number
  error?: string
}

export interface SslCertDiagnosticsResult {
  host: string
  port: number
  valid: boolean
  issuer: Record<string, string>
  subject: Record<string, string>
  validFrom: string
  validTo: string
  daysRemaining: number
  fingerprint: string
  cipher: string
  error?: string
}
