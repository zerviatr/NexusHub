/*
 Copyright 2025 Lee Boonstra

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

/**
 * @file apiStudioReverification.test.ts
 * @description Empirical Adversarial Re-verification Suite for API Studio cURL parser remediation.
 * Auditor: Challenger Re-Verification (challenger_retest_api)
 * Sprint: NexusHub Enterprise Sprint Iteration 2
 */

import { describe, it, expect } from 'vitest'
import {
  tokenizeCommandLine,
  parseCurlCommand,
  exportToCurl,
  ParsedRequest,
} from '../src/renderer/src/utils/curlParser'

describe('Challenger Re-Verification: Remediation Probes', () => {
  describe('1. Four Remediated Baseline Defects', () => {
    it('DEFECT 1 PROBE: should parse condensed -H"Header: Value" without space', () => {
      const cmd = 'curl -H"Content-Type: application/json" -H"X-Custom-Token: secret456" https://api.enterprise.com'
      const parsed = parseCurlCommand(cmd)

      expect(parsed.headers['Content-Type']).toBe('application/json')
      expect(parsed.headers['X-Custom-Token']).toBe('secret456')
    })

    it('DEFECT 1 EXTENDED: should handle ISO timestamp with multiple colons in condensed -H', () => {
      const cmd = 'curl -H"X-Timestamp: 2026-09-13T22:15:00Z" -H"X-Trace-ID: trace:node:99" https://api.enterprise.com'
      const parsed = parseCurlCommand(cmd)

      expect(parsed.headers['X-Timestamp']).toBe('2026-09-13T22:15:00Z')
      expect(parsed.headers['X-Trace-ID']).toBe('trace:node:99')
    })

    it('DEFECT 2 PROBE: should parse GNU long flag with equals --header="Header: Value"', () => {
      const cmd = 'curl --header="Content-Type: application/json; charset=utf-8" https://api.enterprise.com'
      const parsed = parseCurlCommand(cmd)

      expect(parsed.headers['Content-Type']).toBe('application/json; charset=utf-8')
    })

    it('DEFECT 2 EXTENDED: should parse multiple --header= flags with complex values', () => {
      const cmd = 'curl --header="X-Forwarded-For: 10.0.0.1, 192.168.1.1" --header="X-App-Version: 2.1.0-alpha" https://api.enterprise.com'
      const parsed = parseCurlCommand(cmd)

      expect(parsed.headers['X-Forwarded-For']).toBe('10.0.0.1, 192.168.1.1')
      expect(parsed.headers['X-App-Version']).toBe('2.1.0-alpha')
    })

    it('DEFECT 3 PROBE: should parse GNU long flag with equals --data="payload"', () => {
      const cmd = 'curl https://api.enterprise.com --data="key=val"'
      const parsed = parseCurlCommand(cmd)

      expect(parsed.body).toBe('key=val')
      expect(parsed.method).toBe('POST')
    })

    it('DEFECT 3 EXTENDED: should parse JSON body inside --data= and default method to POST', () => {
      const cmd = 'curl https://api.enterprise.com --data=\'{"action":"deploy","target":"production"}\''
      const parsed = parseCurlCommand(cmd)

      expect(parsed.body).toBe('{"action":"deploy","target":"production"}')
      expect(parsed.method).toBe('POST')
    })

    it('DEFECT 3 ESCAPED: should parse bash-escaped quotes inside --data="{\\"k\\":\\"v\\"}"', () => {
      const cmd = 'curl https://api.enterprise.com --data="{\\"action\\":\\"deploy\\",\\"target\\":\\"production\\"}"'
      const parsed = parseCurlCommand(cmd)

      expect(parsed.body).toBe('{"action":"deploy","target":"production"}')
      expect(parsed.method).toBe('POST')
    })

    it('DEFECT 4 PROBE: should parse GNU long flag with equals --url="https://..."', () => {
      const cmd = 'curl --url="https://api.enterprise.com"'
      const parsed = parseCurlCommand(cmd)

      expect(parsed.url).toBe('https://api.enterprise.com')
    })

    it('DEFECT 4 EXTENDED: should parse --url= with port, path, and query params', () => {
      const cmd = 'curl --url="https://telemetry.enterprise.com:8443/v1/metrics?interval=60s&unit=bytes"'
      const parsed = parseCurlCommand(cmd)

      expect(parsed.url).toBe('https://telemetry.enterprise.com:8443/v1/metrics?interval=60s&unit=bytes')
      expect(parsed.queryParams).toEqual({
        interval: '60s',
        unit: 'bytes',
      })
    })
  })

  describe('2. Other Condensed Flags (-d, -u, -X)', () => {
    it('should parse condensed data: -d"..." without space', () => {
      const cmd = 'curl https://api.enterprise.com -d"grant_type=client_credentials&client_id=123"'
      const parsed = parseCurlCommand(cmd)

      expect(parsed.body).toBe('grant_type=client_credentials&client_id=123')
      expect(parsed.method).toBe('POST')
    })

    it('should parse condensed data with equals: -d="key=val"', () => {
      const cmd = 'curl https://api.enterprise.com -d="payload=encoded"'
      const parsed = parseCurlCommand(cmd)

      expect(parsed.body).toBe('payload=encoded')
      expect(parsed.method).toBe('POST')
    })

    it('should parse condensed basic auth: -u"username:password" without space', () => {
      const cmd = 'curl -u"adminUser:SuperPassword123" https://api.enterprise.com'
      const parsed = parseCurlCommand(cmd)

      expect(parsed.auth?.type).toBe('basic')
      expect(parsed.auth?.username).toBe('adminUser')
      expect(parsed.auth?.password).toBe('SuperPassword123')
      expect(parsed.headers['Authorization']).toBe(`Basic ${Buffer.from('adminUser:SuperPassword123').toString('base64')}`)
    })

    it('should parse condensed basic auth with equals: -u="adminUser:SuperPassword123"', () => {
      const cmd = 'curl -u="svc_nexus:p@ssword!99" https://api.enterprise.com'
      const parsed = parseCurlCommand(cmd)

      expect(parsed.auth?.type).toBe('basic')
      expect(parsed.auth?.username).toBe('svc_nexus')
      expect(parsed.auth?.password).toBe('p@ssword!99')
    })

    it('should parse basic auth with colon in password: -u"user:pass:with:colons"', () => {
      const cmd = 'curl -u"api_client:secret:token:extra" https://api.enterprise.com'
      const parsed = parseCurlCommand(cmd)

      expect(parsed.auth?.type).toBe('basic')
      expect(parsed.auth?.username).toBe('api_client')
      expect(parsed.auth?.password).toBe('secret:token:extra')
    })

    it('should parse condensed HTTP methods: -XPOST, -XPUT, -XDELETE, -XPATCH, -XHEAD, -XOPTIONS', () => {
      expect(parseCurlCommand('curl -XPOST https://api.test.com').method).toBe('POST')
      expect(parseCurlCommand('curl -XPUT https://api.test.com').method).toBe('PUT')
      expect(parseCurlCommand('curl -XDELETE https://api.test.com').method).toBe('DELETE')
      expect(parseCurlCommand('curl -XPATCH https://api.test.com').method).toBe('PATCH')
      expect(parseCurlCommand('curl -XHEAD https://api.test.com').method).toBe('HEAD')
      expect(parseCurlCommand('curl -XOPTIONS https://api.test.com').method).toBe('OPTIONS')
    })

    it('should parse condensed method with equals: -X=DELETE', () => {
      const parsed = parseCurlCommand('curl -X=DELETE https://api.test.com/resource/1')
      expect(parsed.method).toBe('DELETE')
    })

    it('should parse condensed header with equals: -H="X-Key: Value"', () => {
      const parsed = parseCurlCommand('curl -H="X-Key: Value" https://api.test.com')
      expect(parsed.headers['X-Key']).toBe('Value')
    })
  })

  describe('3. Extended GNU Long Flags with Equals', () => {
    it('should parse --request=METHOD', () => {
      expect(parseCurlCommand('curl --request=PATCH https://api.test.com').method).toBe('PATCH')
      expect(parseCurlCommand('curl --request=DELETE https://api.test.com/res').method).toBe('DELETE')
      expect(parseCurlCommand('curl --request="PUT" https://api.test.com/res').method).toBe('PUT')
    })

    it('should parse --user=username:password', () => {
      const cmd = 'curl --user=enterprise_user:vault_secure_token https://api.test.com'
      const parsed = parseCurlCommand(cmd)

      expect(parsed.auth?.type).toBe('basic')
      expect(parsed.auth?.username).toBe('enterprise_user')
      expect(parsed.auth?.password).toBe('vault_secure_token')
    })

    it('should parse --data-raw=payload', () => {
      const cmd = 'curl https://api.test.com --data-raw="field1=foo&field2=bar"'
      const parsed = parseCurlCommand(cmd)

      expect(parsed.body).toBe('field1=foo&field2=bar')
      expect(parsed.method).toBe('POST')
    })

    it('should parse --data-binary=payload', () => {
      const cmd = 'curl https://api.test.com --data-binary="raw_binary_content_stream"'
      const parsed = parseCurlCommand(cmd)

      expect(parsed.body).toBe('raw_binary_content_stream')
      expect(parsed.method).toBe('POST')
    })

    it('should parse --data-ascii=payload', () => {
      const cmd = 'curl https://api.test.com --data-ascii="ascii_content_payload"'
      const parsed = parseCurlCommand(cmd)

      expect(parsed.body).toBe('ascii_content_payload')
      expect(parsed.method).toBe('POST')
    })

    it('should parse --data-urlencode=payload', () => {
      const cmd = 'curl https://api.test.com --data-urlencode="query=search%20term"'
      const parsed = parseCurlCommand(cmd)

      expect(parsed.body).toBe('query=search%20term')
      expect(parsed.method).toBe('POST')
    })
  })

  describe('4. Compound and Mixed Flag Scenarios', () => {
    it('should parse multi-line bash cURL mixing condensed and GNU flags', () => {
      const cmd = `curl -XPOST \\
        --url="https://api.nexus.io/v1/auth/tokens" \\
        -H"Content-Type: application/json" \\
        --header="X-Client-Version: 3.2.0" \\
        -u"client_id_01:client_secret_99" \\
        --data-raw='{"grant_type":"client_credentials"}'`

      const parsed = parseCurlCommand(cmd)

      expect(parsed.method).toBe('POST')
      expect(parsed.url).toBe('https://api.nexus.io/v1/auth/tokens')
      expect(parsed.headers['Content-Type']).toBe('application/json')
      expect(parsed.headers['X-Client-Version']).toBe('3.2.0')
      expect(parsed.auth?.type).toBe('basic')
      expect(parsed.auth?.username).toBe('client_id_01')
      expect(parsed.auth?.password).toBe('client_secret_99')
      expect(parsed.body).toBe('{"grant_type":"client_credentials"}')
    })

    it('should concatenate multiple condensed and GNU data chunks with &', () => {
      const cmd = `curl https://api.nexus.io/form \\
        -d"fieldA=1" \\
        --data="fieldB=2" \\
        --data-raw="fieldC=3"`

      const parsed = parseCurlCommand(cmd)

      expect(parsed.body).toBe('fieldA=1&fieldB=2&fieldC=3')
      expect(parsed.method).toBe('POST')
    })

    it('should parse multiple condensed headers without losing any', () => {
      const cmd = `curl https://api.nexus.io \\
        -H"Header1: Value1" \\
        -H"Header2: Value2" \\
        -H"Header3: Value3" \\
        --header="Header4: Value4" \\
        --header="Header5: Value5"`

      const parsed = parseCurlCommand(cmd)

      expect(parsed.headers['Header1']).toBe('Value1')
      expect(parsed.headers['Header2']).toBe('Value2')
      expect(parsed.headers['Header3']).toBe('Value3')
      expect(parsed.headers['Header4']).toBe('Value4')
      expect(parsed.headers['Header5']).toBe('Value5')
    })
  })

  describe('5. Edge Cases, Values with Equals & Escaping', () => {
    it('should correctly parse header values containing equal signs', () => {
      const cmd = 'curl -H"Cookie: sessionId=abc123xyz; token=eyJhbGciOiJIUzI1NiJ9" https://api.enterprise.com'
      const parsed = parseCurlCommand(cmd)

      expect(parsed.headers['Cookie']).toBe('sessionId=abc123xyz; token=eyJhbGciOiJIUzI1NiJ9')
    })

    it('should correctly parse GNU --header with equal signs in value', () => {
      const cmd = 'curl --header="Cookie: session=xyz==; theme=dark" https://api.enterprise.com'
      const parsed = parseCurlCommand(cmd)

      expect(parsed.headers['Cookie']).toBe('session=xyz==; theme=dark')
    })

    it('should trim surrounding spaces in header keys and values for condensed flags', () => {
      const cmd = 'curl -H"  X-Padded-Key   :   Padded Value   " https://api.enterprise.com'
      const parsed = parseCurlCommand(cmd)

      expect(parsed.headers['X-Padded-Key']).toBe('Padded Value')
    })

    it('should auto-prefix https:// when URL without schema is in --url=', () => {
      const cmd = 'curl --url="api.example.com/status"'
      const parsed = parseCurlCommand(cmd)

      expect(parsed.url).toBe('https://api.example.com/status')
    })

    it('should export and round-trip re-parse a request constructed with condensed/GNU flags', () => {
      const originalCmd = 'curl -XPUT --url="https://api.nexus.io/v2/config" -H"Content-Type: application/json" -d\'{"active":true}\''
      const parsed = parseCurlCommand(originalCmd)

      const exported = exportToCurl(parsed, false)
      const reparsed = parseCurlCommand(exported)

      expect(reparsed.url).toBe('https://api.nexus.io/v2/config')
      expect(reparsed.method).toBe('PUT')
      expect(reparsed.headers['Content-Type']).toBe('application/json')
      expect(reparsed.body).toBe('{"active":true}')
    })
  })
})
