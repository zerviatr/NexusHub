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

//! Automated Static Analysis Test Suite
//! Validates that NO raw unflagged `Command::new` exists across `src-tauri/src/`
//! without `CREATE_NO_WINDOW` enforcement.

use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug)]
struct Violation {
    file: String,
    line: usize,
    snippet: String,
}

#[derive(PartialEq)]
enum LexerState {
    Code,
    SingleLineComment,
    BlockComment(usize),
    StringLiteral,
    RawString(usize),
    CharLiteral,
}

/// Sanitizes Rust source code by stripping comments and string literals while preserving newlines.
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
                    i += 2; // Skip escaped character
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

fn collect_rs_files(dir: &Path, files: &mut Vec<PathBuf>) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                collect_rs_files(&path, files);
            } else if path.extension().and_then(|s| s.to_str()) == Some("rs") {
                files.push(path);
            }
        }
    }
}

#[test]
fn test_no_raw_unflagged_command_new_in_src() {
    let manifest_dir = env!("CARGO_MANIFEST_DIR");
    let src_dir = Path::new(manifest_dir).join("src");
    assert!(src_dir.exists(), "src directory must exist at {:?}", src_dir);

    let mut rs_files = Vec::new();
    collect_rs_files(&src_dir, &mut rs_files);
    assert!(!rs_files.is_empty(), "Must find at least one Rust source file");

    let mut violations = Vec::new();

    for file in &rs_files {
        let filename = file.file_name().and_then(|s| s.to_str()).unwrap_or_default();
        // process_ext.rs is the authorized abstraction provider
        if filename == "process_ext.rs" {
            continue;
        }

        let content = fs::read_to_string(file).expect("Failed to read source file");
        let sanitized = sanitize_source(&content);

        for (idx, (line_no, line_text)) in sanitized.iter().enumerate() {
            if line_text.contains("Command::new") {
                // Multi-line statement check: inspect subsequent lines up to semicolon
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
                    violations.push(Violation {
                        file: file.strip_prefix(manifest_dir).unwrap_or(file).display().to_string(),
                        line: *line_no,
                        snippet: line_text.trim().to_string(),
                    });
                }
            }
        }
    }

    if !violations.is_empty() {
        let mut err_msg = format!(
            "\n[STATIC ANALYSIS FAILURE] Found {} unflagged raw Command::new call sites without CREATE_NO_WINDOW!\n",
            violations.len()
        );
        for v in &violations {
            err_msg.push_str(&format!("  -> {}:{} => {}\n", v.file, v.line, v.snippet));
        }
        err_msg.push_str(
            "\nFix: Use `crate::process_ext::std_command(\"...\")` or `crate::process_ext::tokio_command(\"...\")`,\n\
             or chain `.silent()` on the Command builder.\n"
        );
        panic!("{}", err_msg);
    }
}

#[test]
fn test_process_ext_module_contract() {
    let manifest_dir = env!("CARGO_MANIFEST_DIR");
    let process_ext_path = Path::new(manifest_dir).join("src").join("process_ext.rs");
    assert!(
        process_ext_path.exists(),
        "src-tauri/src/process_ext.rs must exist as the centralized command helper module"
    );

    let content = fs::read_to_string(&process_ext_path).expect("Failed to read process_ext.rs");
    assert!(
        content.contains("0x08000000") || content.contains("0x0800_0000"),
        "process_ext.rs must define CREATE_NO_WINDOW = 0x08000000"
    );
    assert!(
        content.contains("creation_flags"),
        "process_ext.rs must invoke creation_flags on Windows"
    );
    assert!(
        content.contains("std_command") && content.contains("tokio_command"),
        "process_ext.rs must expose std_command and tokio_command helpers"
    );
    assert!(
        content.contains("silent_command") && content.contains("silent_async_command"),
        "process_ext.rs must expose silent_command and silent_async_command helpers"
    );
}

#[test]
fn test_lexer_state_machine_self_verification() {
    // Verifies comments and strings are safely ignored without false positives
    let snippet = r##"
        // Command::new("calc.exe") - comment must be ignored
        /* Command::new("notepad.exe") - block comment must be ignored */
        let s = "Command::new(\"reg.exe\")";
        let raw = r#"Command::new("raw")"#;
        let c = 'x';
    "##;
    let sanitized = sanitize_source(snippet);
    for (_, line) in sanitized {
        assert!(!line.contains("Command::new"), "Sanitized line should have no Command::new");
    }
}
