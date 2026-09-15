/*
 * Copyright 2025 Lee Boonstra
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { JournalAPI } from '../shared/auditIntegrity'

export interface RequestOptions {
  id?: string
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
  headers?: Record<string, string>
  body?: string
  timeoutMs?: number
  followRedirects?: boolean
}

export interface ResponseResult {
  status: number
  statusText: string
  headers: Record<string, string>
  data: string
  timeMs: number
  sizeBytes: number
  error?: string
}

export interface DnsLookupRecord {
  type: string
  address?: string
  value?: string
  ttl?: number
  priority?: number
}

export interface DnsLookupResult {
  host: string
  records: DnsLookupRecord[]
  timeMs: number
  error?: string
}

export interface TcpPingResult {
  host: string
  port: number
  open: boolean
  timeMs: number
  error?: string
}

export interface SslCheckResult {
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
  protocol?: string
  error?: string
}

export interface NetAPI {
  dispatchRequest: (options: RequestOptions) => Promise<ResponseResult>
  dnsLookup: (host: string) => Promise<DnsLookupResult>
  tcpPing: (host: string, port: number, timeoutMs?: number) => Promise<TcpPingResult>
  sslCheck: (host: string, port?: number) => Promise<SslCheckResult>
}

declare global {
  interface Window {
    nexusAPI: {
      net: NetAPI
      journal: JournalAPI
      [key: string]: any
    }
  }
}

export type { JournalAPI }
