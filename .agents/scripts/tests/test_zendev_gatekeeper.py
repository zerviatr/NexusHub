#!/usr/bin/env python3
"""Integration and Verification Tests for ZenDev Feature Gatekeeper.

Verifies:
1. Workspace skill file existence, directory structure, and valid YAML frontmatter.
2. Global ~/.gemini/config/skills skill file existence and validity.
3. System memory integration in MEMORY.md, zendev-feature-gatekeeper.md, and project-conventions.md.
   Strict validation against AG Kit entry_pattern regex schema.
4. Cross-references in quick-reference.md (workspace & global) and zendev/SKILL.md.
5. Intelligent routing integration in request-routing.md and intelligent-routing/SKILL.md.
6. Executable gatekeeper.py CLI script execution (both class API and CLI subprocess).
7. Evaluation scenarios from original task:
   - "port temizleme veya yeni bir swiss-army knife aracı ekleyelim mi?" -> ❌ Reddet
   - "sessiz arka plan otomatik güncelleyicisi ekleyelim mi?" -> ❌ Reddet
   - "Workflow Chains" -> ✅ Ekle
8. Edge cases:
   - Hybrid attack: Blacklisted function disguised within core developer studio
   - Boundary: Empty or whitespace-only proposals
   - Multilingual: English and Turkish keyword variants
   - JSON output mode (--json)
"""
from __future__ import annotations

import importlib.util
import json
import re
import subprocess
import sys
import unittest
from pathlib import Path


WORKSPACE_ROOT = Path(r"c:\Users\futbo\Desktop\AI Projeleri\NexusHub")
GLOBAL_CONFIG_ROOT = Path(r"C:\Users\futbo\.gemini\config")

WORKSPACE_SKILL = WORKSPACE_ROOT / ".agents/skills/zendev-feature-gatekeeper/SKILL.md"
GLOBAL_SKILL = GLOBAL_CONFIG_ROOT / "skills/zendev-feature-gatekeeper/SKILL.md"
GATEKEEPER_SCRIPT = WORKSPACE_ROOT / ".agents/skills/zendev-feature-gatekeeper/scripts/gatekeeper.py"
GLOBAL_GATEKEEPER_SCRIPT = GLOBAL_CONFIG_ROOT / "skills/zendev-feature-gatekeeper/scripts/gatekeeper.py"
MEMORY_INDEX = WORKSPACE_ROOT / ".agents/memory/MEMORY.md"
MEMORY_TOPIC = WORKSPACE_ROOT / ".agents/memory/zendev-feature-gatekeeper.md"
PROJECT_CONVENTIONS = WORKSPACE_ROOT / ".agents/memory/project-conventions.md"
WORKSPACE_QUICK_REF = WORKSPACE_ROOT / ".agents/rules/quick-reference.md"
GLOBAL_QUICK_REF = GLOBAL_CONFIG_ROOT / "rules/quick-reference.md"
ZENDEV_SKILL = WORKSPACE_ROOT / ".agents/skills/zendev/SKILL.md"
REQUEST_ROUTING = WORKSPACE_ROOT / ".agents/rules/request-routing.md"
INTELLIGENT_ROUTING = WORKSPACE_ROOT / ".agents/skills/intelligent-routing/SKILL.md"


def parse_frontmatter(text: str) -> dict[str, str]:
    """Parse basic YAML frontmatter from markdown file text."""
    normalized = text.replace("\r\n", "\n").lstrip("\ufeff")
    if not normalized.startswith("---\n"):
        return {}
    end_idx = normalized.find("\n---\n", 4)
    if end_idx < 0:
        return {}
    raw = normalized[4:end_idx]
    data = {}
    for line in raw.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        match = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", line)
        if match:
            k, v = match.groups()
            data[k] = v.strip().strip('"\'')
    return data


# Load the actual gatekeeper script module dynamically
def load_gatekeeper_evaluator():
    spec = importlib.util.spec_from_file_location("gatekeeper_cli", GATEKEEPER_SCRIPT)
    assert spec and spec.loader, f"Failed to load spec from {GATEKEEPER_SCRIPT}"
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.GatekeeperEvaluator


class TestZenDevFeatureGatekeeper(unittest.TestCase):
    """Test suite verifying all acceptance criteria for zendev-feature-gatekeeper integration."""

    @classmethod
    def setUpClass(cls):
        cls.Evaluator = load_gatekeeper_evaluator()

    def test_r1_workspace_skill_file(self):
        """Verify workspace skill exists, has scripts, and satisfies YAML frontmatter contract."""
        self.assertTrue(WORKSPACE_SKILL.exists(), f"Missing file: {WORKSPACE_SKILL}")
        content = WORKSPACE_SKILL.read_text(encoding="utf-8")
        fm = parse_frontmatter(content)
        self.assertEqual("zendev-feature-gatekeeper", fm.get("name"))
        self.assertTrue(len(fm.get("description", "")) > 20)
        self.assertIn("when_to_use", fm)
        self.assertIn("allowed-tools", fm)
        self.assertIn("version", fm)
        self.assertIn("Filtre 1 — Ödeme Testi", content)
        self.assertIn("Filtre 2 — Kişisel İhtiyaç mı, Genel İhtiyaç mı?", content)
        self.assertIn("Filtre 3 — Çekirdekle İlişki Testi", content)
        self.assertIn("Filtre 4 — Risk ve Güven Testi", content)
        self.assertIn("Filtre 5 — Bakım Maliyeti Testi", content)
        self.assertIn("Kalıcı kara liste", content)
        self.assertIn("Workflow Chains", content)
        self.assertIn("Paylaşılabilir Takım Koleksiyonları", content)
        self.assertIn("AI destekli Akıllı Ayrıştırıcı", content)

    def test_r1_global_skill_file(self):
        """Verify global skill exists in ~/.gemini/config/skills."""
        self.assertTrue(GLOBAL_SKILL.exists(), f"Missing file: {GLOBAL_SKILL}")
        content = GLOBAL_SKILL.read_text(encoding="utf-8")
        fm = parse_frontmatter(content)
        self.assertEqual("zendev-feature-gatekeeper", fm.get("name"))
        self.assertTrue(len(fm.get("description", "")) > 20)
        self.assertTrue(GLOBAL_GATEKEEPER_SCRIPT.exists(), f"Missing global script: {GLOBAL_GATEKEEPER_SCRIPT}")

    def test_r2_system_memory_integration(self):
        """Verify memory index matches AG Kit entry_pattern and durable policy is recorded."""
        self.assertTrue(MEMORY_INDEX.exists(), f"Missing file: {MEMORY_INDEX}")
        mem_text = MEMORY_INDEX.read_text(encoding="utf-8")
        self.assertIn("zendev-feature-gatekeeper", mem_text)
        self.assertIn("Ödeme Testi", mem_text)
        self.assertIn("Kişisel vs Genel İhtiyaç", mem_text)
        self.assertIn("Çekirdekle İlişki", mem_text)
        self.assertIn("Risk/Güven", mem_text)
        self.assertIn("Bakım Maliyeti", mem_text)

        # AG Kit Memory Index Schema Check:
        # Every entry must match: ^- \[(user|feedback|project|reference)\] .+ → ([A-Za-z0-9._-]+\.md)$
        entry_pattern = re.compile(r"^- \[(user|feedback|project|reference)\] .+ → ([A-Za-z0-9._-]+\.md)$")
        matching_entries = []
        for line in mem_text.splitlines():
            line = line.strip()
            if line.startswith("- ["):
                self.assertIsNotNone(
                    entry_pattern.fullmatch(line),
                    f"Line violates AG Kit memory index schema: {line}"
                )
                if "zendev-feature-gatekeeper" in line:
                    matching_entries.append(line)

        self.assertTrue(len(matching_entries) > 0, "Gatekeeper entry missing from MEMORY.md")
        self.assertTrue(
            matching_entries[0].startswith("- [project]"),
            f"Gatekeeper entry must use valid [project] tag: {matching_entries[0]}"
        )

        self.assertTrue(MEMORY_TOPIC.exists(), f"Missing file: {MEMORY_TOPIC}")
        topic_text = MEMORY_TOPIC.read_text(encoding="utf-8")
        self.assertIn("ZenDev Feature Gatekeeper Protocol", topic_text)
        self.assertIn("Filtre 1 — Ödeme Testi", topic_text)

        self.assertTrue(PROJECT_CONVENTIONS.exists(), f"Missing file: {PROJECT_CONVENTIONS}")
        conv_text = PROJECT_CONVENTIONS.read_text(encoding="utf-8")
        self.assertIn("zendev-feature-gatekeeper", conv_text)

    def test_r2_quick_reference_cross_references(self):
        """Verify quick-reference files in workspace and global config."""
        self.assertTrue(WORKSPACE_QUICK_REF.exists(), f"Missing file: {WORKSPACE_QUICK_REF}")
        wq_text = WORKSPACE_QUICK_REF.read_text(encoding="utf-8")
        self.assertIn("zendev-feature-gatekeeper", wq_text)
        self.assertIn("Ödeme Testi", wq_text)

        self.assertTrue(GLOBAL_QUICK_REF.exists(), f"Missing file: {GLOBAL_QUICK_REF}")
        gq_text = GLOBAL_QUICK_REF.read_text(encoding="utf-8")
        self.assertIn("zendev-feature-gatekeeper", gq_text)

    def test_r2_zendev_skill_cross_reference(self):
        """Verify zendev/SKILL.md has direct cross reference and mandatory gatekeeper rule."""
        self.assertTrue(ZENDEV_SKILL.exists(), f"Missing file: {ZENDEV_SKILL}")
        zs_text = ZENDEV_SKILL.read_text(encoding="utf-8")
        self.assertIn("zendev-feature-gatekeeper", zs_text)
        self.assertIn("Özellik ve Araç Kabul Kuralı", zs_text)
        self.assertIn("Filtre 1 — Ödeme Testi", zs_text)
        self.assertIn("Kalıcı Kara Liste", zs_text)
        self.assertIn("0. **Gatekeeper Değerlendirmesi:**", zs_text)

    def test_r2_agent_routing_integration(self):
        """Verify request routing rules and intelligent routing matrix include gatekeeper."""
        self.assertTrue(REQUEST_ROUTING.exists(), f"Missing file: {REQUEST_ROUTING}")
        rr_text = REQUEST_ROUTING.read_text(encoding="utf-8")
        self.assertIn("zendev-feature-gatekeeper", rr_text)

        self.assertTrue(INTELLIGENT_ROUTING.exists(), f"Missing file: {INTELLIGENT_ROUTING}")
        ir_text = INTELLIGENT_ROUTING.read_text(encoding="utf-8")
        self.assertIn("zendev-feature-gatekeeper", ir_text)

    def test_r3_gatekeeper_evaluation_scenarios(self):
        """Verify gatekeeper evaluation on test cases specified in the task."""
        # Case A1: "port temizleme aracı ekleyelim mi?"
        res_port = self.Evaluator.evaluate("port temizleme aracı ekleyelim mi?")
        self.assertEqual("❌", res_port["verdict"])
        self.assertEqual("Reddet", res_port["decision"])
        self.assertIn("kara liste", res_port["rationale"].lower())
        self.assertFalse(res_port["passed"])
        self.assertEqual(1, res_port["exit_code"])

        # Case A2: "yeni bir swiss-army knife aracı ekleyelim mi?"
        res_swiss = self.Evaluator.evaluate("yeni bir swiss-army knife aracı ekleyelim mi?")
        self.assertEqual("❌", res_swiss["verdict"])
        self.assertEqual("Reddet", res_swiss["decision"])
        self.assertFalse(res_swiss["passed"])
        self.assertEqual(1, res_swiss["exit_code"])

        # Case B: Kullanıcı onaysız arka plan güncelleyici
        res_silent = self.Evaluator.evaluate("sessiz arka plan otomatik güncelleyicisi ekleyelim mi?")
        self.assertEqual("❌", res_silent["verdict"])
        self.assertEqual("Reddet", res_silent["decision"])
        self.assertFalse(res_silent["passed"])

        # Case C: Workflow Chains (Retention Exception)
        res_chain = self.Evaluator.evaluate("Workflow Chains — araçları birbirine zincirleme özelliği ekleyelim mi?")
        self.assertEqual("✅", res_chain["verdict"])
        self.assertEqual("Ekle", res_chain["decision"])
        self.assertTrue(res_chain["passed"])
        self.assertEqual(0, res_chain["exit_code"])

        # Verify output format template
        formatted = self.Evaluator.format_response(res_port)
        self.assertIn("❌ [port temizleme aracı ekleyelim mi?]", formatted)
        self.assertIn("Filtre sonuçları:", formatted)
        self.assertIn("Karar: Reddet", formatted)
        self.assertIn("Gerekçe:", formatted)

    def test_r3_edge_cases_and_hybrid_attacks(self):
        """Probe edge cases: hybrid Trojan tools, empty inputs, multilingual variants."""
        # Edge Case 1: Hybrid / Trojan tool (Core dev tool mixed with blacklisted action)
        res_hybrid = self.Evaluator.evaluate("API Client with built-in port kill & DNS flush feature")
        self.assertEqual("❌", res_hybrid["verdict"])
        self.assertEqual("Reddet", res_hybrid["decision"])
        self.assertIn("kara liste", res_hybrid["rationale"].lower())

        # Edge Case 2: Empty or whitespace input
        res_empty = self.Evaluator.evaluate("   ")
        self.assertEqual("❌", res_empty["verdict"])
        self.assertEqual("Reddet", res_empty["decision"])
        self.assertIn("boş veya tanımsız", res_empty["filters"])

        # Edge Case 3: Other retention exceptions (Paylaşılabilir Takım Koleksiyonları & AI Ayrıştırıcı)
        res_team = self.Evaluator.evaluate("Paylaşılabilir Takım Koleksiyonları (team workspace sharing)")
        self.assertEqual("✅", res_team["verdict"])
        self.assertEqual("Ekle", res_team["decision"])

        res_ai = self.Evaluator.evaluate("AI Destekli Akıllı Ayrıştırıcı (smart router)")
        self.assertEqual("✅", res_ai["verdict"])
        self.assertEqual("Ekle", res_ai["decision"])

        # Edge Case 4: Temporary mail abuse risk
        res_tempmail = self.Evaluator.evaluate("Disposable temp mail generator tool")
        self.assertEqual("❌", res_tempmail["verdict"])
        self.assertEqual("Reddet", res_tempmail["decision"])

        # Edge Case 5: Trojan disguise - Port termination smuggled behind Workflow Chains
        res_trojan_chain = self.Evaluator.evaluate("Workflow Chains ve açık portları sonlandırma aracı ekleyelim mi?")
        self.assertEqual("❌", res_trojan_chain["verdict"])
        self.assertEqual("Reddet", res_trojan_chain["decision"])
        self.assertIn("kara liste", res_trojan_chain["rationale"].lower())

        # Edge Case 6: Trojan disguise - Port termination smuggled behind JSON formatter
        res_trojan_json = self.Evaluator.evaluate("JSON formatter ve açık portları sonlandırıcı ekleyelim mi?")
        self.assertEqual("❌", res_trojan_json["verdict"])
        self.assertEqual("Reddet", res_trojan_json["decision"])

        # Edge Case 7: Trojan disguise - Process manager smuggled behind Regex studio
        res_trojan_regex = self.Evaluator.evaluate("Regex stüdyosu ve process manager ekleyelim mi?")
        self.assertEqual("❌", res_trojan_regex["verdict"])
        self.assertEqual("Reddet", res_trojan_regex["decision"])

        # Edge Case 8: Trojan disguise - Memory/RAM cleaner smuggled behind Base64 decoder
        res_trojan_ram = self.Evaluator.evaluate("Base64 decoder ve bellek/RAM temizleyici ekleyelim mi?")
        self.assertEqual("❌", res_trojan_ram["verdict"])
        self.assertEqual("Reddet", res_trojan_ram["decision"])

        # Edge Case 9: Trojan disguise - Silent auto download smuggled behind API client
        res_trojan_silent = self.Evaluator.evaluate("API client için arkaplanda sessizce otomatik indirme yapalım mı?")
        self.assertEqual("❌", res_trojan_silent["verdict"])
        self.assertEqual("Reddet", res_trojan_silent["decision"])

        # Edge Case 10: Trojan disguise - Disposable email smuggled behind API test
        res_trojan_email = self.Evaluator.evaluate("API test stüdyosu ve tek kullanımlık e-posta servisi ekleyelim mi?")
        self.assertEqual("❌", res_trojan_email["verdict"])
        self.assertEqual("Reddet", res_trojan_email["decision"])

        # Edge Case 11: Turkish uppercase normalization
        res_upper = self.Evaluator.evaluate("AÇIK PORTLARI SONLANDIRMA ARACI EKLEYELİM Mİ?")
        self.assertEqual("❌", res_upper["verdict"])
        self.assertEqual("Reddet", res_upper["decision"])

        # Edge Case 12: Trojan disguise - Port close smuggled behind Workflow Chains
        res_trojan_close = self.Evaluator.evaluate("Workflow Chains ve close port özelliği ekleyelim mi?")
        self.assertEqual("❌", res_trojan_close["verdict"])
        self.assertEqual("Reddet", res_trojan_close["decision"])

        # Edge Case 13: Trojan disguise - End task smuggled behind Workflow Chains
        res_trojan_end = self.Evaluator.evaluate("Workflow Chains ve end task özelliği ekleyelim mi?")
        self.assertEqual("❌", res_trojan_end["verdict"])
        self.assertEqual("Reddet", res_trojan_end["decision"])

        # Edge Case 14: Trojan disguise - Stop process smuggled behind Workflow Chains
        res_trojan_stop = self.Evaluator.evaluate("Workflow Chains ve stop process aracı ekleyelim mi?")
        self.assertEqual("❌", res_trojan_stop["verdict"])
        self.assertEqual("Reddet", res_trojan_stop["decision"])

        # Edge Case 15: Trojan disguise - Hosts file editor smuggled behind Workflow Chains
        res_trojan_hosts = self.Evaluator.evaluate("Workflow Chains ve hosts dosyası düzenleyici ekleyelim mi?")
        self.assertEqual("❌", res_trojan_hosts["verdict"])
        self.assertEqual("Reddet", res_trojan_hosts["decision"])

        # Edge Case 16: Trojan disguise - Unapproved update smuggled behind Workflow Chains
        res_trojan_unapproved = self.Evaluator.evaluate("Workflow Chains ve onaysız güncelleme ekleyelim mi?")
        self.assertEqual("❌", res_trojan_unapproved["verdict"])
        self.assertEqual("Reddet", res_trojan_unapproved["decision"])

        # Edge Case 17: Trojan disguise - 10 minute mail smuggled behind Workflow Chains
        res_trojan_10min = self.Evaluator.evaluate("Workflow Chains ve 10 minute mail servisi ekleyelim mi?")
        self.assertEqual("❌", res_trojan_10min["verdict"])
        self.assertEqual("Reddet", res_trojan_10min["decision"])

        # Edge Case 18: Trojan disguise - Trash mail smuggled behind Workflow Chains
        res_trojan_trash = self.Evaluator.evaluate("Workflow Chains ve trash mail servisi ekleyelim mi?")
        self.assertEqual("❌", res_trojan_trash["verdict"])
        self.assertEqual("Reddet", res_trojan_trash["decision"])

        # Edge Case 19: Trojan disguise - OS-native calculator smuggled behind Workflow Chains
        res_trojan_calc = self.Evaluator.evaluate("Workflow Chains ve hesap makinesi stüdyosu ekleyelim mi?")
        self.assertEqual("❌", res_trojan_calc["verdict"])
        self.assertEqual("Reddet", res_trojan_calc["decision"])

        # Edge Case 20: Trojan disguise - OS-native clipboard tool smuggled behind Workflow Chains
        res_trojan_clip = self.Evaluator.evaluate("Workflow Chains ve clipboard aracı ekleyelim mi?")
        self.assertEqual("❌", res_trojan_clip["verdict"])
        self.assertEqual("Reddet", res_trojan_clip["decision"])

        # Edge Case 21: Precision check - Copy to clipboard button in core tool must NOT be falsely blacklisted
        res_copy_button = self.Evaluator.evaluate("JSON formatter için panoya kopyalama butonu ekleyelim mi?")
        self.assertNotEqual("❌", res_copy_button["verdict"])

    def test_r3_cli_subprocess_execution(self):
        """Verify the gatekeeper CLI executable runs cleanly via subprocess."""
        cmd = [
            sys.executable,
            str(GATEKEEPER_SCRIPT),
            "port temizleme aracı ekleyelim mi?"
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
        self.assertEqual(1, proc.returncode)
        self.assertIn("❌", proc.stdout)
        self.assertIn("Karar: Reddet", proc.stdout)

        # JSON mode
        cmd_json = [
            sys.executable,
            str(GATEKEEPER_SCRIPT),
            "--json",
            "Workflow Chains özelliği ekleyelim mi?"
        ]
        proc_json = subprocess.run(cmd_json, capture_output=True, text=True, encoding="utf-8")
        self.assertEqual(0, proc_json.returncode)
        parsed = json.loads(proc_json.stdout)
        self.assertEqual("✅", parsed["verdict"])
        self.assertEqual("Ekle", parsed["decision"])
        self.assertTrue(parsed["passed"])


if __name__ == "__main__":
    unittest.main()
