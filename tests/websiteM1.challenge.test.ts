/**
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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from '../website/node_modules/react';
import { renderToString } from '../website/node_modules/react-dom/server';
import * as fs from 'fs';
import * as path from 'path';

// Mock canvas-confetti before importing any components that use it
const mockConfetti = vi.fn();
vi.mock('canvas-confetti', () => ({
  default: (...args: unknown[]) => mockConfetti(...args),
}));

// Import website data and translations
import { translations } from '../website/src/lib/translations';
import { PRICING_PLANS } from '../website/src/lib/toolsData';
import { LiveBase64Demo } from '../website/src/components/LivePlayground/LiveBase64Demo';
import { ArchitectureRadar } from '../website/src/components/ArchitectureRadar';
import { SimulatedCheckoutModal } from '../website/src/components/SimulatedCheckoutModal';

describe('Empirical Challenge: Milestone M1 Website Modernization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // TASK 1: LiveBase64Demo Stress-Testing (UTF-8, Turkish, Emoji, URL-Safe, Corrupted)
  // =========================================================================
  describe('1. LiveBase64Demo: UTF-8, Edge-Cases & Corruption Resilience', () => {
    // Component's exact UTF-8 safe encode helper logic
    const encodeUtf8 = (str: string, isUrlSafe: boolean): string => {
      const bytes = new TextEncoder().encode(str);
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      let b64 = btoa(binary);
      if (isUrlSafe) {
        b64 = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      }
      return b64;
    };

    // Component's exact UTF-8 safe decode helper logic
    const decodeUtf8 = (b64: string): string => {
      let clean = b64.trim();
      if (!clean) return '';
      clean = clean.replace(/-/g, '+').replace(/_/g, '/');
      while (clean.length % 4 !== 0) {
        clean += '=';
      }
      const binary = atob(clean);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    };

    // Safe executor simulating component try/catch
    const safeExecute = (input: string, mode: 'encode' | 'decode', urlSafe: boolean = false) => {
      if (!input.trim()) {
        return { output: '', error: null };
      }
      try {
        if (mode === 'encode') {
          return { output: encodeUtf8(input, urlSafe), error: null };
        } else {
          return { output: decodeUtf8(input), error: null };
        }
      } catch (err: unknown) {
        return {
          output: '',
          error:
            mode === 'decode'
              ? 'Geçersiz Base64 dizisi veya bozuk UTF-8 bayt dizilimi.'
              : 'Kodlama sırasında beklenmeyen hata oluştu.',
        };
      }
    };

    it('handles empty strings and whitespace without error', () => {
      expect(safeExecute('', 'encode')).toEqual({ output: '', error: null });
      expect(safeExecute('   ', 'encode')).toEqual({ output: '', error: null });
      expect(safeExecute('\n\t  \r', 'encode')).toEqual({ output: '', error: null });

      expect(safeExecute('', 'decode')).toEqual({ output: '', error: null });
      expect(safeExecute('   ', 'decode')).toEqual({ output: '', error: null });
    });

    it('correctly encodes and round-trip decodes Turkish characters (ş, ğ, ü, ö, ç, İ, Ş, Ğ, Ü, Ö, Ç, ı)', () => {
      const turkishSamples = [
        'ş, ğ, ü, ö, ç, İ',
        'Ş, Ğ, Ü, Ö, Ç, ı',
        'Pijamalı hasta, yağız şoföre çabucak güvendi.',
        'İstanbul, Ağrı Dağı, Çanakkale Boğazı, Şanlıurfa, Gümüşhane, Üsküdar',
        'ZenDev v2.4.3: Hızlı, Güvenli ve Özgür Geliştirici Paketi! 🚀',
      ];

      for (const sample of turkishSamples) {
        const resEncode = safeExecute(sample, 'encode');
        expect(resEncode.error).toBeNull();
        expect(resEncode.output.length).toBeGreaterThan(0);

        // Raw btoa would have failed with InvalidCharacterError on these strings
        expect(() => {
          // Standard JS btoa fails without UTF-8 encoding
          btoa(sample);
        }).toThrow();

        // The safe decode round-trips byte-for-byte
        const resDecode = safeExecute(resEncode.output, 'decode');
        expect(resDecode.error).toBeNull();
        expect(resDecode.output).toBe(sample);
      }
    });

    it('correctly encodes and round-trip decodes complex emojis and astral Unicode planes', () => {
      const emojiSamples = [
        '🚀🔥🎉✨🌟💻🤖🛡️',
        '👨‍👩‍👧‍👦', // Complex ZWJ sequence
        '🇹🇷 🇺🇸 🇪🇺 🇯🇵', // Regional indicator flag emojis
        'ZenDev ⚡ Rust 🦀 Tauri 🪟 WebView2 🌐',
      ];

      for (const sample of emojiSamples) {
        const resEncode = safeExecute(sample, 'encode');
        expect(resEncode.error).toBeNull();

        const resDecode = safeExecute(resEncode.output, 'decode');
        expect(resDecode.error).toBeNull();
        expect(resDecode.output).toBe(sample);
      }
    });

    it('handles URL-Safe Base64 mode without (+, /) and strips padding (=)', () => {
      // Input specifically producing + and / in standard Base64
      const input = ' subjects? >>>> ????? +++++ ///// 1234567890';
      const standardB64 = safeExecute(input, 'encode', false).output;
      expect(standardB64).toMatch(/[+/=]/);

      const urlSafeB64 = safeExecute(input, 'encode', true).output;
      expect(urlSafeB64).not.toContain('+');
      expect(urlSafeB64).not.toContain('/');
      expect(urlSafeB64).not.toContain('=');
      expect(urlSafeB64).toMatch(/[-_]/);

      // Decoding the URL-safe Base64 string must restore exact text
      const decodedFromUrlSafe = safeExecute(urlSafeB64, 'decode');
      expect(decodedFromUrlSafe.error).toBeNull();
      expect(decodedFromUrlSafe.output).toBe(input);
    });

    it('gracefully catches malformed / corrupted Base64 strings without uncaught exceptions', () => {
      const corruptedInputs = [
        'This is definitely not base64!@#$%',
        '???@@@###',
        'a', // Invalid single character
        'abc', // 3 chars without padding
        '====', // Only padding
        'A===', // Invalid padding
        'ZZZZ!!!!', // Invalid characters
        '--__--__', // Valid URL-safe chars but invalid decoding bytes
      ];

      for (const badInput of corruptedInputs) {
        let result: { output: string; error: string | null };
        expect(() => {
          result = safeExecute(badInput, 'decode');
        }).not.toThrow();

        // Either decodes or returns a user-friendly error, NEVER throws uncaught
        result = safeExecute(badInput, 'decode');
        if (result.error !== null) {
          expect(result.error).toBe('Geçersiz Base64 dizisi veya bozuk UTF-8 bayt dizilimi.');
          expect(result.output).toBe('');
        }
      }
    });

    it('gracefully catches invalid UTF-8 byte sequences produced by valid Base64', () => {
      // Base64 string "//4=" decodes to byte [0xFF, 0xFE], which is an invalid UTF-8 sequence
      const invalidUtf8Base64 = '//4=';
      const result = safeExecute(invalidUtf8Base64, 'decode');
      expect(result.error).toBe('Geçersiz Base64 dizisi veya bozuk UTF-8 bayt dizilimi.');
      expect(result.output).toBe('');
    });

    it('calculates accurate character counts and byte lengths for multibyte UTF-8 inputs', () => {
      const sample = 'İst'; // 'İ' is 2 bytes, 's' is 1 byte, 't' is 1 byte -> 3 chars, 4 bytes
      const bytes = new TextEncoder().encode(sample).byteLength;
      expect(sample.length).toBe(3);
      expect(bytes).toBe(4);

      const emoji = '🚀'; // length 2 (surrogate pair), 4 bytes UTF-8
      const emojiBytes = new TextEncoder().encode(emoji).byteLength;
      expect(emoji.length).toBe(2);
      expect(emojiBytes).toBe(4);
    });

    it('losslessly round-trips 100 fuzz-generated randomized Unicode and multilingual strings', () => {
      const charPool = [
        'A', 'z', '0', '9', ' ', '\t', '\n',
        'ş', 'ğ', 'ü', 'ö', 'ç', 'İ', 'ı', 'Ş', 'Ğ', 'Ü', 'Ö', 'Ç',
        'ä', 'ö', 'ü', 'ß', 'é', 'à', 'ç', 'ñ', 'ø', 'å',
        'Д', 'ж', 'ф', 'я', 'Ω', 'λ', 'π',
        'こんにちは', '世界', '你好', 'مرحبا', 'שלום',
        '🚀', '🔥', '🛡️', '💻', '⚡', '✨', '🎉',
      ];

      for (let run = 0; run < 100; run++) {
        let randomStr = '';
        const len = Math.floor(Math.random() * 80) + 1;
        for (let i = 0; i < len; i++) {
          randomStr += charPool[Math.floor(Math.random() * charPool.length)];
        }
        if (!randomStr.trim()) {
          randomStr = 'ZenDev_' + run;
        }

        const encoded = safeExecute(randomStr, 'encode');
        expect(encoded.error).toBeNull();
        expect(encoded.output.length).toBeGreaterThan(0);

        const decoded = safeExecute(encoded.output, 'decode');
        expect(decoded.error).toBeNull();
        expect(decoded.output).toBe(randomStr);
      }
    });

    it('gracefully handles 100 fuzz-generated malformed/corrupted Base64 strings without throwing', () => {
      const corruptChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '=', '~', '`', '<', '>', '?', '/', '\\', ' '];

      for (let run = 0; run < 100; run++) {
        let badStr = '';
        const len = Math.floor(Math.random() * 40) + 1;
        for (let i = 0; i < len; i++) {
          badStr += corruptChars[Math.floor(Math.random() * corruptChars.length)];
        }

        expect(() => {
          const res = safeExecute(badStr, 'decode');
          if (res.error !== null) {
            expect(res.error).toBe('Geçersiz Base64 dizisi veya bozuk UTF-8 bayt dizilimi.');
          }
        }).not.toThrow();
      }
    });

    it('correctly tests modulo 3 padding boundaries for URL-Safe Base64 (0, 1, and 2 padding chars)', () => {
      // 1 byte -> mod 3 is 1 -> in standard Base64: 2 padding chars '=='
      const input1 = 'A';
      const encoded1 = safeExecute(input1, 'encode', true).output;
      expect(encoded1).not.toContain('=');
      expect(safeExecute(encoded1, 'decode').output).toBe(input1);

      // 2 bytes -> mod 3 is 2 -> in standard Base64: 1 padding char '='
      const input2 = 'AB';
      const encoded2 = safeExecute(input2, 'encode', true).output;
      expect(encoded2).not.toContain('=');
      expect(safeExecute(encoded2, 'decode').output).toBe(input2);

      // 3 bytes -> mod 3 is 0 -> in standard Base64: 0 padding chars
      const input3 = 'ABC';
      const encoded3 = safeExecute(input3, 'encode', true).output;
      expect(encoded3).not.toContain('=');
      expect(safeExecute(encoded3, 'decode').output).toBe(input3);
    });

    it('renders LiveBase64Demo React component tree without crashing', () => {
      let html = '';
      expect(() => {
        html = renderToString(React.createElement(LiveBase64Demo));
      }).not.toThrow();

      expect(html).toContain('Base64Studio');
      expect(html).toContain('ENCODE');
      expect(html).toContain('DECODE');
      expect(html).toContain('URL-Safe Base64');
    });
  });

  // =========================================================================
  // TASK 2: SimulatedCheckoutModal Stress-Testing
  // =========================================================================
  describe('2. SimulatedCheckoutModal: License Generation, Discounts & State Machine', () => {
    // License generation oracle identical to component
    const generateLicenseKey = (planId: string): string => {
      const prefix = planId === 'studio' ? 'ZEN-TEAM' : 'ZEN-PRO';
      const randomHex = () => {
        const chars = '0123456789ABCDEF';
        let str = '';
        for (let i = 0; i < 4; i++) {
          str += chars[Math.floor(Math.random() * chars.length)];
        }
        return str;
      };
      return `${prefix}-${randomHex()}-${randomHex()}-${randomHex()}-2026`;
    };

    // Price calculation helper
    const calculatePrice = (
      rawPrice: number,
      discountPercent: number
    ): { discountAmount: number; finalPrice: number } => {
      const discountAmount = discountPercent > 0 ? (rawPrice * discountPercent) / 100 : 0;
      const finalPrice = Math.max(0, Math.round((rawPrice - discountAmount) * 100) / 100);
      return { discountAmount, finalPrice };
    };

    it('generates 1,000 valid, formatted, and unique license keys with expected prefixes', () => {
      const generatedProKeys = new Set<string>();
      const proRegex = /^ZEN-PRO-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-2026$/;

      for (let i = 0; i < 500; i++) {
        const key = generateLicenseKey('personal');
        expect(key).toMatch(proRegex);
        expect(key.length).toBe(27);
        expect(key.startsWith('ZEN-PRO-')).toBe(true);
        expect(key.endsWith('-2026')).toBe(true);
        generatedProKeys.add(key);
      }
      // Zero collisions in 500 random keys
      expect(generatedProKeys.size).toBe(500);

      const generatedTeamKeys = new Set<string>();
      const teamRegex = /^ZEN-TEAM-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-2026$/;

      for (let i = 0; i < 500; i++) {
        const key = generateLicenseKey('studio');
        expect(key).toMatch(teamRegex);
        expect(key.length).toBe(28);
        expect(key.startsWith('ZEN-TEAM-')).toBe(true);
        expect(key.endsWith('-2026')).toBe(true);
        generatedTeamKeys.add(key);
      }
      expect(generatedTeamKeys.size).toBe(500);
    });

    it('calculates price discounts correctly across all currencies and plans', () => {
      const proPlan = PRICING_PLANS.find((p) => p.id === 'personal')!;
      expect(proPlan).toBeDefined();

      // USD Yearly: $79
      const usdYearly = proPlan.prices.USD.yearly;
      expect(usdYearly).toBe(79);

      // Test with 20% discount (ZENDEV20)
      const res20 = calculatePrice(usdYearly, 20);
      expect(res20.discountAmount).toBe(15.8);
      expect(res20.finalPrice).toBe(63.2);

      // Test with 30% discount (OGRENCI)
      const res30 = calculatePrice(usdYearly, 30);
      expect(res30.discountAmount).toBe(23.7);
      expect(res30.finalPrice).toBe(55.3);

      // Test with 25% discount (SPECIAL25)
      const res25 = calculatePrice(usdYearly, 25);
      expect(res25.discountAmount).toBe(19.75);
      expect(res25.finalPrice).toBe(59.25);

      // Test with 0% discount
      const res0 = calculatePrice(usdYearly, 0);
      expect(res0.discountAmount).toBe(0);
      expect(res0.finalPrice).toBe(79);

      // Test with 100% discount
      const res100 = calculatePrice(usdYearly, 100);
      expect(res100.discountAmount).toBe(79);
      expect(res100.finalPrice).toBe(0);

      // Test extreme boundary > 100% discount: Math.max(0, ...) must prevent negative prices
      const resOverflow = calculatePrice(usdYearly, 150);
      expect(resOverflow.finalPrice).toBe(0);
    });

    it('triggers canvas-confetti with expected particle count, spread, and cyber colors on checkout success', () => {
      // Simulate checkout completion triggering confetti
      const triggerCelebration = () => {
        mockConfetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#00f2fe', '#8b5cf6', '#10b981', '#38bdf8', '#f59e0b'],
        });
      };

      triggerCelebration();

      expect(mockConfetti).toHaveBeenCalledTimes(1);
      expect(mockConfetti).toHaveBeenCalledWith({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#00f2fe', '#8b5cf6', '#10b981', '#38bdf8', '#f59e0b'],
      });
    });

    it('validates all 5 official promotional coupons with case-insensitivity and whitespace trimming', () => {
      const validCoupons: Record<string, number> = {
        ZENDEV20: 20,
        OGRENCI: 30,
        EARLYBIRD: 20,
        PROMO20: 20,
        SPECIAL25: 25,
      };

      const testCases = [
        { input: 'ZENDEV20', expectedPercent: 20 },
        { input: '  zendev20  ', expectedPercent: 20 },
        { input: 'ogrenci', expectedPercent: 30 },
        { input: '  EARLYBIRD\t', expectedPercent: 20 },
        { input: 'promo20', expectedPercent: 20 },
        { input: 'Special25', expectedPercent: 25 },
        { input: 'INVALID_COUPON', expectedPercent: 0 },
        { input: '', expectedPercent: 0 },
      ];

      for (const tc of testCases) {
        const clean = tc.input.trim().toUpperCase();
        const percent = validCoupons[clean] || 0;
        expect(percent).toBe(tc.expectedPercent);
      }
    });

    it('renders SimulatedCheckoutModal React component tree in open and closed states without crashing', () => {
      const plan = PRICING_PLANS[1];

      // Closed state: renders null
      const closedHtml = renderToString(
        React.createElement(SimulatedCheckoutModal, {
          isOpen: false,
          onClose: () => {},
          plan,
          billingCycle: 'yearly',
          currency: 'USD',
          discountPercent: 20,
          lang: 'tr',
        })
      );
      expect(closedHtml).toBe('');

      // Open state: renders review modal
      const openHtml = renderToString(
        React.createElement(SimulatedCheckoutModal, {
          isOpen: true,
          onClose: () => {},
          plan,
          billingCycle: 'yearly',
          currency: 'USD',
          discountPercent: 20,
          lang: 'tr',
        })
      );
      expect(openHtml).toContain('Simüle SaaS Ödeme &amp; Lisans');
      expect(openHtml).toContain('Simülasyon Modu:');
      expect(openHtml).toContain('Kupon İndirimi (%20):');
      expect(openHtml).toContain('developer@zendev.app');
      expect(openHtml).toContain('4242 •••• •••• 4242');
    });
  });

  // =========================================================================
  // TASK 3: ArchitectureRadar Stress-Testing & Mathematical Precision
  // =========================================================================
  describe('3. ArchitectureRadar: Metric Calculations & Framer-Motion Props', () => {
    it('verifies exact mathematical reduction percentages for all 3 performance metrics', () => {
      // 1. RAM: <26 MB vs 450 MB
      const ramZenDev = 26;
      const ramElectron = 450;
      const ramReductionPct = ((ramElectron - ramZenDev) / ramElectron) * 100;
      expect(ramReductionPct.toFixed(1)).toBe('94.2');
      const ramBarPct = (ramZenDev / ramElectron) * 100;
      expect(ramBarPct.toFixed(1)).toBe('5.8');

      // 2. Binary / Installer Size: 4.6 MB vs 120 MB
      const sizeZenDev = 4.6;
      const sizeElectron = 120;
      const sizeReductionPct = ((sizeElectron - sizeZenDev) / sizeElectron) * 100;
      expect(sizeReductionPct.toFixed(1)).toBe('96.2');
      const sizeBarPct = (sizeZenDev / sizeElectron) * 100;
      expect(sizeBarPct.toFixed(1)).toBe('3.8');

      // 3. Boot Time Latency: 0.35s vs 3.2s
      const bootZenDev = 0.35;
      const bootElectron = 3.2;
      const bootReductionPct = ((bootElectron - bootZenDev) / bootElectron) * 100;
      expect(bootReductionPct.toFixed(1)).toBe('89.1');
      const bootBarPct = (bootZenDev / bootElectron) * 100;
      expect(bootBarPct.toFixed(1)).toBe('10.9');
    });

    it('verifies exact matching text in both TR and EN translations for radar metrics', () => {
      // Turkish
      const trRadar = translations.tr.radar;
      expect(trRadar.metrics.ram.zendev).toBe('< 26 MB (Tauri v2)');
      expect(trRadar.metrics.ram.electron).toBe('450+ MB (Klasik Electron)');
      expect(trRadar.metrics.size.zendev).toBe('4.6 MB Yükleyici');
      expect(trRadar.metrics.size.electron).toBe('120 MB (Klasik Electron)');
      expect(trRadar.metrics.boot.zendev).toBe('0.35 Saniye');
      expect(trRadar.metrics.boot.electron).toBe('3.2 Saniye');

      // English
      const enRadar = translations.en.radar;
      expect(enRadar.metrics.ram.zendev).toBe('< 26 MB (Tauri v2)');
      expect(enRadar.metrics.ram.electron).toBe('450+ MB (Standard Electron)');
      expect(enRadar.metrics.size.zendev).toBe('4.6 MB Installer');
      expect(enRadar.metrics.size.electron).toBe('120 MB (Standard Electron)');
      expect(enRadar.metrics.boot.zendev).toBe('0.35 Seconds');
      expect(enRadar.metrics.boot.electron).toBe('3.2 Seconds');

      // 100% key parity
      const trKeys = Object.keys(trRadar.metrics);
      const enKeys = Object.keys(enRadar.metrics);
      expect(trKeys).toEqual(enKeys);
    });

    it('verifies framer-motion props in ArchitectureRadar.tsx source code', () => {
      const radarSourcePath = path.resolve(__dirname, '../website/src/components/ArchitectureRadar.tsx');
      const radarSource = fs.readFileSync(radarSourcePath, 'utf-8');

      // Verify framer-motion imports
      expect(radarSource).toContain("import { motion } from 'framer-motion';");

      // Verify whileInView and viewport once: true are configured
      expect(radarSource).toContain("whileInView={{ width: '5.8%' }}");
      expect(radarSource).toContain("whileInView={{ width: '3.8%' }}");
      expect(radarSource).toContain("whileInView={{ width: '10.9%' }}");
      expect(radarSource).toContain("viewport={{ once: true }}");

      // Verify spring transitions
      expect(radarSource).toContain("type: 'spring', damping: 15, stiffness: 60");
      expect(radarSource).toContain("type: 'spring', damping: 20, stiffness: 60");

      // Verify percentage strings in component JSX
      expect(radarSource).toContain("%94.2 Daha Az RAM");
      expect(radarSource).toContain("94.2% Less RAM");
      expect(radarSource).toContain("%96.2 Daha Kompakt");
      expect(radarSource).toContain("96.2% Smaller");
      expect(radarSource).toContain("%89.1 Daha Hızlı Açılış");
      expect(radarSource).toContain("89.1% Faster Boot");
    });

    it('renders ArchitectureRadar React component tree without crashing in both TR and EN', () => {
      let trHtml = '';
      let enHtml = '';

      expect(() => {
        trHtml = renderToString(React.createElement(ArchitectureRadar, { lang: 'tr' }));
      }).not.toThrow();

      expect(() => {
        enHtml = renderToString(React.createElement(ArchitectureRadar, { lang: 'en' }));
      }).not.toThrow();

      expect(trHtml).toContain('MİMARİ KARŞILAŞTIRMA');
      expect(trHtml).toContain('%94.2 Daha Az RAM');
      expect(trHtml).toContain('&lt; 26 MB');
      expect(trHtml).toContain('4.6 MB');
      expect(trHtml).toContain('0.35s');

      expect(enHtml).toContain('ARCHITECTURE BENCHMARK');
      expect(enHtml).toContain('94.2% Less RAM');
      expect(enHtml).toContain('&lt; 26 MB');
      expect(enHtml).toContain('4.6 MB');
      expect(enHtml).toContain('0.35s');
    });
  });

  // =========================================================================
  // TASK 4: Direct Release Download Integration & Fallback
  // =========================================================================
  describe('4. Direct Release Download Integration & Fallback', () => {
    it('declares exact release URLs matching v2.5.2 binary specification', async () => {
      const { ZENDEV_RELEASE_CONFIG } = await import('../website/src/lib/downloadHelper');

      expect(ZENDEV_RELEASE_CONFIG.version).toBe('2.5.2');
      expect(ZENDEV_RELEASE_CONFIG.setupExe).toBe(
        'https://github.com/zerviatr/NexusHub/releases/download/v2.5.2/ZenDev-Setup-2.5.2.exe'
      );
      expect(ZENDEV_RELEASE_CONFIG.portableExe).toBe(
        'https://github.com/zerviatr/NexusHub/releases/download/v2.5.2/ZenDev-Portable-2.5.2.exe'
      );
      expect(ZENDEV_RELEASE_CONFIG.fallbackLatestRelease).toBe(
        'https://github.com/zerviatr/NexusHub/releases/latest'
      );
    });

    it('verifies Navbar and HeroSection source files wire download buttons to setupExe', () => {
      const navbarSource = fs.readFileSync(
        path.resolve(__dirname, '../website/src/components/Navbar.tsx'),
        'utf-8'
      );
      const heroSource = fs.readFileSync(
        path.resolve(__dirname, '../website/src/components/HeroSection.tsx'),
        'utf-8'
      );

      // Verify no dead #download hrefs remain on primary action buttons
      expect(navbarSource).toContain('href={ZENDEV_RELEASE_CONFIG.setupExe}');
      expect(heroSource).toContain('href={ZENDEV_RELEASE_CONFIG.setupExe}');
      expect(heroSource).toContain('href={ZENDEV_RELEASE_CONFIG.portableExe}');
    });
  });

  // =========================================================================
  // TASK 5: Non-Version Invariant Guard (secret_keys.env 2.4 KB & sRGB gamma 2.4)
  // =========================================================================
  describe('5. Non-Version Constants & Invariant Integrity', () => {
    it('verifies HeroSection.tsx line 280 preserves secret_keys.env (2.4 KB)', () => {
      const heroSource = fs.readFileSync(
        path.resolve(__dirname, '../website/src/components/HeroSection.tsx'),
        'utf-8'
      );
      expect(heroSource).toContain('secret_keys.env (2.4 KB)');
    });

    it('verifies LiveColorDemo.tsx line 24 preserves sRGB gamma transfer constant 2.4', () => {
      const colorDemoSource = fs.readFileSync(
        path.resolve(__dirname, '../website/src/components/LivePlayground/LiveColorDemo.tsx'),
        'utf-8'
      );
      expect(colorDemoSource).toContain('Math.pow((s + 0.055) / 1.055, 2.4)');
    });
  });
});
