/**
 * website/src/lib/api.ts
 * Client for ZenDev License API & Backend services
 */

export interface LicenseLookupResponse {
  valid: boolean;
  tier?: string;
  max_activations?: number;
  activations?: Array<{
    hwid: string;
    hostname?: string;
    activated_at: number;
    last_verified_at: number;
  }>;
  created_at?: number;
  reason?: string;
}

export interface ResetHwidResponse {
  success: boolean;
  message?: string;
  reason?: string;
}

export async function lookupLicense(licenseKey: string): Promise<LicenseLookupResponse> {
  const cleanKey = licenseKey.trim().toUpperCase();
  const res = await fetch(`/api/license/lookup?key=${encodeURIComponent(cleanKey)}`);
  return res.json();
}

export async function resetHwid(licenseKey: string, hwid?: string): Promise<ResetHwidResponse> {
  const cleanKey = licenseKey.trim().toUpperCase();
  const res = await fetch('/api/license/reset-hwid', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: cleanKey, hwid })
  });
  return res.json();
}

export async function joinWaitlist(email: string): Promise<{ success: boolean; message?: string; coupon?: string }> {
  const res = await fetch('/api/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return res.json();
}
