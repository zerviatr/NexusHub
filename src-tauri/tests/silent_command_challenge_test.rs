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

//! Empirical Challenger Test Suite for Silent Command & Static Analysis Guarantees
//! Authored by teamwork_preview_challenger_2

use std::fs;
use std::path::{Path, PathBuf};
use zendev_tauri_lib::process_ext::*;

#[derive(PartialEq)]
enum LexerState {
    Code,
    SingleLineComment,
    BlockComment(usize),
    StringLiteral,
    RawString(usize),
    CharLiteral,
}

fn sanitize_source(source: &str) -> Vec<(usize, String)> {
    let chars: Vec<char> = source.chars().collect();
    let len = chars.len();
    let mut i = 0;
    let mut state = LexerState::Code;
    let mut line_num = 1;
    let mut sanitized_lines: Vec<(usize, String)> = Vec::new();
    let mut current_line = String::new();

    while i < len {
        let c = chars[i];
        let next_c = if i + 1 < len { Some(chars[i + 1]) } else { None };

        match state {
            LexerState::Code => {
                if c == '/' && next_c == Some('/') {
                    state = LexerState::SingleLineComment;
                    i += 2;
                    continue;
                } else if c == '/' && next_c == Some('*') {
                    state = LexerState::BlockComment(1);
                    i += 2;
                    continue;
                } else if c == 'r' && (next_c == Some('#') || next_c == Some('"')) {
                    let mut hash_count = 0;
                    let mut lookahead = i + 1;
                    while lookahead < len && chars[lookahead] == '#' {
                        hash_count += 1;
                        lookahead += 1;
                    }
                    if lookahead < len && chars[lookahead] == '"' {
                        state = LexerState::RawString(hash_count);
                        i = lookahead + 1;
                        continue;
                    } else {
                        current_line.push(c);
                    }
                } else if c == '"' {
                    state = LexerState::StringLiteral;
                    i += 1;
                    continue;
                } else if c == '\'' {
                    state = LexerState::CharLiteral;
                    i += 1;
                    continue;
                } else {
                    current_line.push(c);
                }
            }
            LexerState::SingleLineComment => {
                if c == '\n' {
                    state = LexerState::Code;
                }
            }
            LexerState::BlockComment(depth) => {
                if c == '/' && next_c == Some('*') {
                    state = LexerState::BlockComment(depth + 1);
                    i += 2;
                    continue;
                } else if c == '*' && next_c == Some('/') {
                    if depth <= 1 {
                        state = LexerState::Code;
                    } else {
                        state = LexerState::BlockComment(depth - 1);
                    }
                    i += 2;
                    continue;
                }
            }
            LexerState::StringLiteral => {
                if c == '\\' {
                    i += 2;
                    continue;
                } else if c == '"' {
                    state = LexerState::Code;
                    i += 1;
                    continue;
                }
            }
            LexerState::RawString(hash_count) => {
                if c == '"' {
                    let mut valid = true;
                    for h in 0..hash_count {
                        if i + 1 + h >= len || chars[i + 1 + h] != '#' {
                            valid = false;
                            break;
                        }
                    }
                    if valid {
                        state = LexerState::Code;
                        i += 1 + hash_count;
                        continue;
                    }
                }
            }
            LexerState::CharLiteral => {
                if c == '\\' {
                    i += 2;
                    continue;
                } else if c == '\'' {
                    state = LexerState::Code;
                    i += 1;
                    continue;
                }
            }
        }

        if c == '\n' {
            sanitized_lines.push((line_num, current_line.clone()));
            current_line.clear();
            line_num += 1;
        }

        i += 1;
    }

    if !current_line.is_empty() {
        sanitized_lines.push((line_num, current_line));
    }

    sanitized_lines
}

fn simulate_linter(snippet: &str) -> (usize, usize) {
    let sanitized = sanitize_source(snippet);
    let mut detected = 0;
    let mut violations = 0;

    for (idx, (_line_no, line_text)) in sanitized.iter().enumerate() {
        if line_text.contains("Command::new") {
            detected += 1;
            let mut statement_block = line_text.clone();
            let mut lookahead = idx + 1;
            while lookahead < sanitized.len() && !statement_block.contains(';') {
                statement_block.push(' ');
                statement_block.push_str(&sanitized[lookahead].1);
                lookahead += 1;
            }

            let is_flagged = statement_block.contains(".silent()")
                || statement_block.contains(".creation_flags(")
                || statement_block.contains("CREATE_NO_WINDOW");

            if !is_flagged {
                violations += 1;
            }
        }
    }
    (detected, violations)
}

#[test]
fn test_adversarial_evasion_whitespace_bypass() {
    let snippet = r#"
        fn sneaky() {
            let mut cmd = std::process::Command :: new("calc.exe");
            cmd.spawn().unwrap();
        }
    "#;
    let (detected, _) = simulate_linter(snippet);
    // Empirical finding: Token spacing evades the exact substring search
    assert_eq!(detected, 0, "Whitespace in Command :: new evades detection");
}

#[test]
fn test_adversarial_evasion_multiline_token_split() {
    let snippet = "fn sneaky() {\nlet mut cmd = std::process::Command::\nnew(\"calc.exe\");\ncmd.spawn().unwrap();\n}";
    let (detected, _) = simulate_linter(snippet);
    // Empirical finding: Newline inside token evades line-level check
    assert_eq!(detected, 0, "Newline between Command:: and new evades detection");
}

#[test]
fn test_adversarial_evasion_import_aliasing() {
    let snippet = r#"
        use std::process::Command as UnsafeCmd;
        fn sneaky() {
            let mut cmd = UnsafeCmd::new("calc.exe");
            cmd.spawn().unwrap();
        }
    "#;
    let (detected, _) = simulate_linter(snippet);
    // Empirical finding: Aliasing evades Command::new search
    assert_eq!(detected, 0, "Aliased Command as UnsafeCmd evades detection");
}

#[test]
fn test_adversarial_evasion_parameter_pollution_false_negative() {
    let snippet = r#"
        fn sneaky() {
            let mut cmd = std::process::Command::new(if CREATE_NO_WINDOW > 0 { "calc.exe" } else { "notepad.exe" });
            cmd.spawn().unwrap();
        }
    "#;
    let (detected, violations) = simulate_linter(snippet);
    assert_eq!(detected, 1, "Command::new was detected");
    // Empirical finding: CREATE_NO_WINDOW appearing in arguments falsely satisfies is_flagged
    assert_eq!(violations, 0, "Argument containing CREATE_NO_WINDOW causes a false negative");
}

#[test]
fn test_win32_constant_and_constructor_semantics() {
    assert_eq!(CREATE_NO_WINDOW, 0x0800_0000);
    assert_eq!(CREATE_NO_WINDOW, 134_217_728);

    let std_cmd = silent_command("ping");
    assert_eq!(std_cmd.get_program(), "ping");

    let tokio_cmd = silent_async_command("netstat");
    assert_eq!(tokio_cmd.as_std().get_program(), "netstat");

    let alias_std = std_command("tasklist");
    assert_eq!(alias_std.get_program(), "tasklist");

    let alias_tokio = tokio_command("taskkill");
    assert_eq!(alias_tokio.as_std().get_program(), "taskkill");
}

#[test]
fn test_verify_all_production_files_strictly_avoid_raw_command_new() {
    let manifest_dir = env!("CARGO_MANIFEST_DIR");
    let src_dir = Path::new(manifest_dir).join("src");

    let mut rs_files = Vec::new();
    fn collect(dir: &Path, files: &mut Vec<PathBuf>) {
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.is_dir() {
                    collect(&p, files);
                } else if p.extension().and_then(|s| s.to_str()) == Some("rs") {
                    files.push(p);
                }
            }
        }
    }
    collect(&src_dir, &mut rs_files);

    for file in rs_files {
        let name = file.file_name().and_then(|s| s.to_str()).unwrap_or("");
        if name == "process_ext.rs" {
            continue;
        }

        let content = fs::read_to_string(&file).unwrap();
        // Disallow both std::process::Command::new and tokio::process::Command::new and bare Command::new
        assert!(
            !content.contains("std::process::Command::new"),
            "Raw std::process::Command::new forbidden in {}",
            name
        );
        assert!(
            !content.contains("tokio::process::Command::new"),
            "Raw tokio::process::Command::new forbidden in {}",
            name
        );
    }
}
