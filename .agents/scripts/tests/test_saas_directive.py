#!/usr/bin/env python3
"""Automated verification suite for ZenDev SaaS Transformation Directive (R1 - R4)."""

import os
import re
import subprocess
import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
AGENTS_DIR = REPO_ROOT / ".agents"
RULES_DIR = AGENTS_DIR / "rules"
MEMORY_DIR = AGENTS_DIR / "memory"
SKILLS_DIR = AGENTS_DIR / "skills"
SCRIPTS_DIR = AGENTS_DIR / "scripts"
USER_HOME = Path(os.path.expanduser("~"))
GLOBAL_RULES_DIR = USER_HOME / ".gemini" / "config" / "rules"
GLOBAL_SKILLS_DIR = USER_HOME / ".gemini" / "config" / "skills"


class TestZenDevSaaSDirective(unittest.TestCase):
    """Deep verification of the ZenDev SaaS Transformation Directive integration."""

    def test_r1_project_rule_and_global_rule(self):
        """Verify .agents/rules/zendev-saas-directive.md and global copy."""
        project_rule = RULES_DIR / "zendev-saas-directive.md"
        self.assertTrue(project_rule.is_file(), f"Missing rule file: {project_rule}")
        content = project_rule.read_text(encoding="utf-8")

        # Check frontmatter
        self.assertTrue(content.startswith("---\n"))
        self.assertIn("name: zendev-saas-directive", content)
        self.assertIn("priority: P0", content)
        self.assertIn("trigger: always_on", content)

        # Check the 5 core principles
        self.assertIn("1. İlke: Ürün Konumlandırması", content)
        self.assertIn("2. İlke: Kaldırılacak / Ayrıştırılacak Modüller", content)
        self.assertIn("3. İlke: Table Stakes SaaS Altyapısı", content)
        self.assertIn("4. İlke: Diferansiyasyon ve Rekabet Kalkanı", content)
        self.assertIn("5. İlke: Ödeme Testi", content)

        # Check specific key entities
        self.assertIn("Port Killer", content)
        self.assertIn("System Optimizer", content)
        self.assertIn("Sessiz Otonom Güncelleyici", content)
        self.assertIn("Temp Mail", content)
        self.assertIn("Cloud Sync", content)
        self.assertIn("Team Auth", content)
        self.assertIn("Workflow Chains", content)
        self.assertIn("Paylaşılabilir Takım Koleksiyonları", content)
        self.assertIn("AI Destekli Akıllı Ayrıştırıcı", content)

        # Check global copy in ~/.gemini/config/rules
        global_rule = GLOBAL_RULES_DIR / "zendev-saas-directive.md"
        self.assertTrue(global_rule.is_file(), f"Missing global rule: {global_rule}")
        global_content = global_rule.read_text(encoding="utf-8")
        self.assertIn("name: zendev-saas-directive", global_content)
        self.assertIn("1. İlke: Ürün Konumlandırması", global_content)

    def test_r1_multi_assistant_files_in_root(self):
        """Verify AGENTS.md, GEMINI.md, CLAUDE.md, .cursorrules in repo root."""
        root_files = ["AGENTS.md", "GEMINI.md", "CLAUDE.md", ".cursorrules"]
        for fname in root_files:
            target = REPO_ROOT / fname
            self.assertTrue(target.is_file(), f"Missing root assistant file: {fname}")
            content = target.read_text(encoding="utf-8")
            self.assertIn("zendev-saas-directive", content.lower())
            self.assertIn("port killer", content.lower())
            self.assertIn("system optimizer", content.lower())
            self.assertIn("cloud sync", content.lower())
            self.assertIn("workflow chains", content.lower())

    def test_r2_memory_integration(self):
        """Verify MEMORY.md and zendev-saas-directive.md memory topic."""
        memory_index = MEMORY_DIR / "MEMORY.md"
        self.assertTrue(memory_index.is_file())
        mem_text = memory_index.read_text(encoding="utf-8")
        self.assertIn("zendev-saas-directive.md", mem_text)

        # Pattern check for AG Kit memory index
        entry_pattern = re.compile(r"^- \[(user|feedback|project|reference)\] .+ → ([A-Za-z0-9._-]+\.md)$")
        has_directive_entry = False
        for line in mem_text.splitlines():
            line = line.strip()
            if line.startswith("- ["):
                self.assertIsNotNone(entry_pattern.fullmatch(line), f"Invalid memory entry: {line}")
                if "zendev-saas-directive.md" in line:
                    has_directive_entry = True
                    self.assertTrue(line.startswith("- [project]"))
        self.assertTrue(has_directive_entry, "Missing directive entry in MEMORY.md")

        # Check topic file
        topic_file = MEMORY_DIR / "zendev-saas-directive.md"
        self.assertTrue(topic_file.is_file())
        topic_text = topic_file.read_text(encoding="utf-8")
        self.assertIn("type: project", topic_text)
        self.assertIn("5 Temel İlke ve Yol Haritası", topic_text)
        self.assertIn("Ürün Konumlandırması", topic_text)
        self.assertIn("Kaldırılacak / Ayrıştırılacak Modüller", topic_text)
        self.assertIn("Table Stakes SaaS Altyapısı", topic_text)
        self.assertIn("Diferansiyasyon Sütunları", topic_text)
        self.assertIn("Ödeme Testi", topic_text)

    def test_r2_yapilacaklar_roadmap(self):
        """Verify YAPILACAKLAR.md in repo root."""
        roadmap = REPO_ROOT / "YAPILACAKLAR.md"
        self.assertTrue(roadmap.is_file(), "Missing YAPILACAKLAR.md in repo root")
        rm_text = roadmap.read_text(encoding="utf-8")

        # Check priority phases
        self.assertIn("Faz 1 — Modül Temizliği", rm_text)
        self.assertIn("Faz 2 — Table Stakes SaaS Altyapısı", rm_text)
        self.assertIn("Faz 3 — Diferansiyasyon", rm_text)
        self.assertIn("Faz 4 — Güvenlik, Uyumluluk", rm_text)

        # Check deprecated modules
        self.assertIn("Port Killer", rm_text)
        self.assertIn("System Optimizer", rm_text)
        self.assertIn("Sessiz Otonom Güncelleyici", rm_text)
        self.assertIn("Temp Mail", rm_text)

        # Check table stakes
        self.assertIn("Cloud Sync Motoru", rm_text)
        self.assertIn("Team Auth", rm_text)
        self.assertIn("Stripe / Paddle", rm_text)

        # Check differentiation
        self.assertIn("Workflow Chains", rm_text)
        self.assertIn("Paylaşılabilir Takım Koleksiyonları", rm_text)
        self.assertIn("AI Destekli Akıllı Ayrıştırıcı", rm_text)

    def test_r3_skills_synchronization(self):
        """Verify zendev and zendev-feature-gatekeeper skills."""
        # zendev skill
        zendev_skill = SKILLS_DIR / "zendev" / "SKILL.md"
        self.assertTrue(zendev_skill.is_file())
        zs_text = zendev_skill.read_text(encoding="utf-8")
        self.assertIn("zendev-saas-directive.md", zs_text)
        self.assertIn("Tauri v2", zs_text)
        self.assertIn("Sessiz Otonom Güncelleyici Uyarısı", zs_text)
        self.assertIn("Özellik ve Araç Kabul Kuralı", zs_text)
        self.assertIn("zendev-feature-gatekeeper", zs_text)

        # gatekeeper skill in workspace
        gk_skill = SKILLS_DIR / "zendev-feature-gatekeeper" / "SKILL.md"
        self.assertTrue(gk_skill.is_file())
        gk_text = gk_skill.read_text(encoding="utf-8")
        self.assertIn("zendev-saas-directive.md", gk_text)
        self.assertIn("Kullanıcı Onayı İstemeyen Sessiz Arka Plan İşlemleri", gk_text)
        self.assertIn("Filtre 1 — Ödeme Testi", gk_text)
        self.assertIn("Kalıcı kara liste", gk_text)
        self.assertIn("Workflow Chains", gk_text)
        self.assertIn("AI destekli Akıllı Ayrıştırıcı", gk_text)

        # gatekeeper skill in global config
        global_gk_skill = GLOBAL_SKILLS_DIR / "zendev-feature-gatekeeper" / "SKILL.md"
        self.assertTrue(global_gk_skill.is_file())
        ggk_text = global_gk_skill.read_text(encoding="utf-8")
        self.assertIn("zendev-saas-directive.md", ggk_text)

    def test_r4_ag_kit_structural_validation(self):
        """Verify that validate_kit.py passes cleanly with 0 errors and 0 warnings."""
        validate_script = SCRIPTS_DIR / "validate_kit.py"
        self.assertTrue(validate_script.is_file())
        result = subprocess.run(
            [sys.executable, str(validate_script)],
            capture_output=True,
            text=True,
            encoding="utf-8",
            cwd=str(REPO_ROOT),
        )
        self.assertEqual(0, result.returncode, f"validate_kit.py failed:\n{result.stdout}\n{result.stderr}")
        self.assertIn("Summary: 0 error(s), 0 warning(s)", result.stdout)
        self.assertIn("[PASS] Toolkit is structurally valid.", result.stdout)


if __name__ == "__main__":
    unittest.main()
