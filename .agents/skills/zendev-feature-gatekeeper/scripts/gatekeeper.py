#!/usr/bin/env python3
"""ZenDev Feature Gatekeeper Evaluator CLI and Library.

Applies the ruthless 5-stage filter and permanent blacklist defined in
zendev-feature-gatekeeper/SKILL.md to evaluate incoming feature and tool proposals:
- Filtre 1: Odeme Testi (Willingness to Pay)
- Filtre 2: Kisisel Ihtiyac mi, Genel Ihtiyac mi? (Founder Bias vs Real Market Need)
- Filtre 3: Cekirdekle Iliski Testi (Developer Studio Core vs Swiss-Army Knife)
- Filtre 4: Risk ve Guven Testi (Security, Malware Risk, Unapproved System Actions)
- Filtre 5: Bakim Maliyeti Testi (Platform Fragility, Maintenance Overhead)
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from typing import Any

# Ensure UTF-8 output encoding on Windows console
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


class GatekeeperEvaluator:
    """Evaluates proposed features using the ZenDev Gatekeeper 5-Filter Protocol."""

    # Permanent Blacklist: Cannot be added under any circumstance
    BLACKLIST_CATEGORIES = [
        (
            "Sistem seviyesi müdahale araçları (port/process öldürme, DNS flush, cache temizleme)",
            [
                r"\bport\b.*(öldür|kill|temiz|clean|free|stop)",
                r"\bprocess\b.*(öldür|kill|sonlandır|terminate)",
                r"\bkill\b.*(port|process|task)",
                r"\bdns\b.*(flush|temiz|sıfırla)",
                r"(önbellek|cache).*(temiz|flush|purge|clear)",
                r"(sistem|system).*(tweak|müdahale|cleaner)",
            ],
            "Sistem seviyesi müdahale araçları SaaS/bulut mantığıyla çelişir ve yüksek OS-bazlı destek maliyeti getirir.",
        ),
        (
            "Kullanıcı onaysız otomatik/sessiz arka plan işlemleri ve güncelleyiciler",
            [
                r"(sessiz|silent).*(güncel|update|arka\s*plan|background)",
                r"(otomatik|auto).*(arka\s*plan|background).*(güncel|update|download|install)",
                r"unattended.*(update|install)",
                r"background.*(updater|daemon)",
            ],
            "Kullanıcı onayı istemeyen otomatik arka plan işlemleri güvenlik yazılımları tarafından malware/trojan olarak işaretlenme riski taşır.",
        ),
        (
            "Kötüye kullanıma açık anonimlik araçları (temp mail vb.)",
            [
                r"temp.*mail",
                r"disposable.*(mail|email)",
                r"anonim.*(posta|mail|email)",
                r"gecici.*(posta|mail)",
                r"sms.*receive.*fake",
            ],
            "Kötüye kullanıma açık anonimlik araçları ciddi yasal risk, spam ve abuse problemleri doğurur.",
        ),
        (
            "Düşük diferansiyasyonlu OS-native veya üçüncü parti araçlar",
            [
                r"clipboard.*(manager|geçmişi|yonetici)",
                r"pano.*(yöneticisi|yonetici|gecmişi)",
                r"not.*defteri",
                r"\bnotepad\b",
                r"swiss.*army",
                r"her.*ise.*yarayan",
                r"dağınık.*araç.*kutusu",
            ],
            "OS-native araçlar tek başına SaaS ödeme gerekçesi oluşturmaz, diferansiyasyonu düşürür ve odağı dağıtır.",
        ),
    ]

    # Retention & B2B Differentiation Exceptions (Prioritized & encouraged)
    RETENTION_EXCEPTIONS = [
        (
            "Workflow Chains",
            [
                r"workflow.*chain",
                r"araç.*zincir",
                r"zincirleme",
                r"chaining",
                r"pipeline.*chain",
            ],
            "Workflow Chains araçları birbirine zincirleyerek geliştirici iş akışını hızlandırır ve B2B retention'ı artırır.",
        ),
        (
            "Paylaşılabilir Takım Koleksiyonları",
            [
                r"(paylaşılabilir|shared).*(takım|ekip|team).*(koleksiyon|collection)",
                r"takım.*(koleksiyon|paylaş|sharing)",
                r"team.*(workspace|collection|share)",
            ],
            "Paylaşılabilir Takım Koleksiyonları takım içi entegrasyonu sağlar ve B2B koltuk başı (per-seat) upsell için birincil değerdir.",
        ),
        (
            "AI Destekli Akıllı Ayrıştırıcı",
            [
                r"akıllı.*(ayrıştır|router|yönlendir)",
                r"smart.*(router|parser|selector)",
                r"ai.*(araç.*öner|tool.*suggest)",
            ],
            "AI destekli Akıllı Ayrıştırıcı kullanıcının girdisine göre doğru stüdyoyu önererek tek çatı altındaki değeri güçlendirir.",
        ),
    ]

    # Core Developer Studio Tools
    CORE_STUDIO_PATTERNS = [
        r"\bjson\b",
        r"\bjwt\b",
        r"\bregex\b",
        r"\bcurl\b",
        r"\bapi\b.*(client|test|mock|studio)",
        r"\bcron\b",
        r"\bmermaid\b",
        r"(encode|decode|base64|url.*encode|hash|md5|sha)",
        r"(diff|formatter|validator)",
    ]

    @classmethod
    def evaluate(cls, proposal: str) -> dict[str, Any]:
        """Evaluate a feature proposal against the 5-filter framework."""
        proposal_clean = (proposal or "").strip()
        if not proposal_clean:
            return {
                "verdict": "❌",
                "feature": "Boş Öneri",
                "filters": "Girdi geçersiz (boş veya tanımsız).",
                "decision": "Reddet",
                "rationale": "Değerlendirilecek somut bir özellik veya araç önerisi belirtilmedi.",
                "passed": False,
                "exit_code": 1,
            }

        p_lower = proposal_clean.lower()

        # Step 1: Check Blacklist (Hard Stop)
        for category_name, patterns, reason in cls.BLACKLIST_CATEGORIES:
            for pat in patterns:
                if re.search(pat, p_lower):
                    return {
                        "verdict": "❌",
                        "feature": proposal_clean,
                        "filters": "Filtre 3 (Çekirdek Dışı), Filtre 4 (Risk/Güvenlik), Filtre 5 (Destek Yükü) KALDI. Kalıcı Kara Liste eşleşmesi!",
                        "decision": "Reddet",
                        "rationale": f"{category_name} kalıcı kara listededir. Gerekçe: {reason}",
                        "passed": False,
                        "exit_code": 1,
                    }

        # Step 2: Check Retention / B2B Upsell Exceptions
        for exception_name, patterns, reason in cls.RETENTION_EXCEPTIONS:
            for pat in patterns:
                if re.search(pat, p_lower):
                    return {
                        "verdict": "✅",
                        "feature": proposal_clean,
                        "filters": "Filtre 1-5 GEÇTİ. B2B / Çekirdek Diferansiyasyon istisnası kapsamındadır.",
                        "decision": "Ekle",
                        "rationale": f"{exception_name} istisnası: {reason}",
                        "passed": True,
                        "exit_code": 0,
                    }

        # Step 3: Check Core Studio alignment
        is_core = any(re.search(pat, p_lower) for pat in cls.CORE_STUDIO_PATTERNS)
        if is_core:
            return {
                "verdict": "⚠️",
                "feature": proposal_clean,
                "filters": "Filtre 3 (Çekirdek) GEÇTİ, ancak Filtre 1 (Ödeme Testi) ve Filtre 2 (Genel İhtiyaç) kanıtı aranmalı.",
                "decision": "Bonus modül olarak arkaya at / Backlog",
                "rationale": "Geliştirici stüdyoları çekirdeği ile uyumlu, ancak tek başına ücretli abonelik veya B2B değer artışı sağlayıp sağlamadığı kullanıcı talebiyle doğrulanmalı.",
                "passed": False,
                "exit_code": 2,
            }

        # Step 4: Default skeptical rejection for generic / unclear ideas
        return {
            "verdict": "❌",
            "feature": proposal_clean,
            "filters": "Filtre 1 (Ödeme Testi), Filtre 2 (Genel İhtiyaç), Filtre 3 (Çekirdek İlişkisi) KALDI.",
            "decision": "Reddet",
            "rationale": "Öneri geliştirici stüdyoları çekirdeğiyle uyuşmuyor ve SaaS ödeme gerekçesi (WTP) yetersiz. Feature bloat riski nedeniyle reddedildi.",
            "passed": False,
            "exit_code": 1,
        }

    @classmethod
    def format_response(cls, result: dict[str, Any]) -> str:
        """Format evaluation result into the exact markdown template specified in SKILL.md."""
        return (
            f"{result['verdict']} [{result['feature']}]\n\n"
            f"Filtre sonuçları: {result['filters']}\n"
            f"Karar: {result['decision']}\n"
            f"Gerekçe: {result['rationale']}"
        )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="ZenDev Feature Gatekeeper 5-Filter Evaluation Tool"
    )
    parser.add_argument("proposal", nargs="?", default="", help="Feature or tool proposal text")
    parser.add_argument("--json", action="store_true", help="Output results in JSON format")
    args = parser.parse_args(argv)

    if not args.proposal or not args.proposal.strip():
        result = GatekeeperEvaluator.evaluate("")
        if args.json:
            print(json.dumps(result, ensure_ascii=False, indent=2))
        else:
            print(GatekeeperEvaluator.format_response(result))
        return result["exit_code"]

    result = GatekeeperEvaluator.evaluate(args.proposal)
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(GatekeeperEvaluator.format_response(result))

    return result["exit_code"]


if __name__ == "__main__":
    sys.exit(main())
