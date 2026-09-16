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

//! Centralized Silent Command Builder & Subprocess Abstraction.
//!
//! Enforces `CREATE_NO_WINDOW` (0x08000000) on Windows across both
//! `std::process::Command` and `tokio::process::Command` to eliminate
//! intrusive console and cmd.exe window popups during background execution.
//!
//! On non-Windows platforms (Linux, macOS), all methods and constructors
//! compile as zero-overhead, inlined no-ops without compiler warnings.

use std::ffi::OsStr;

/// Win32 process creation flag to execute console binaries without an attached console window.
/// Corresponds to Win32 API constant `CREATE_NO_WINDOW = 0x08000000` (134,217,728).
pub const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// Extension trait providing windowless execution helpers for command builders.
pub trait SilentCommand {
    /// Configures the command in-place to execute without creating a visible console window on Windows.
    ///
    /// On Windows, sets `CREATE_NO_WINDOW` (0x08000000).
    /// On non-Windows platforms, this compiles as a zero-overhead no-op.
    fn silent(&mut self) -> &mut Self;

    /// Consuming variant for fluent builder chaining:
    ///
    /// ```rust,no_run
    /// use zendev_tauri_lib::process_ext::SilentCommand;
    /// let mut cmd = std::process::Command::new("ipconfig").into_silent();
    /// ```
    #[inline]
    fn into_silent(mut self) -> Self
    where
        Self: Sized,
    {
        self.silent();
        self
    }
}

impl SilentCommand for std::process::Command {
    #[inline]
    fn silent(&mut self) -> &mut Self {
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            self.creation_flags(CREATE_NO_WINDOW);
        }
        self
    }
}

impl SilentCommand for tokio::process::Command {
    #[inline]
    fn silent(&mut self) -> &mut Self {
        #[cfg(windows)]
        {
            self.creation_flags(CREATE_NO_WINDOW);
        }
        self
    }
}

/// Creates a new `std::process::Command` configured with `CREATE_NO_WINDOW` on Windows.
///
/// On non-Windows platforms, this compiles as standard `std::process::Command::new(program)`.
#[inline]
pub fn silent_command<S: AsRef<OsStr>>(program: S) -> std::process::Command {
    let mut cmd = std::process::Command::new(program);
    cmd.silent();
    cmd
}

/// Creates a new `tokio::process::Command` configured with `CREATE_NO_WINDOW` on Windows.
///
/// On non-Windows platforms, this compiles as standard `tokio::process::Command::new(program)`.
#[inline]
pub fn silent_async_command<S: AsRef<OsStr>>(program: S) -> tokio::process::Command {
    let mut cmd = tokio::process::Command::new(program);
    cmd.silent();
    cmd
}

/// Creates a new `std::process::Command` pre-configured with silent execution flags on Windows.
/// Drop-in alias for `silent_command`.
#[inline]
pub fn std_command<S: AsRef<OsStr>>(program: S) -> std::process::Command {
    silent_command(program)
}

/// Creates a new `tokio::process::Command` pre-configured with silent execution flags on Windows.
/// Drop-in alias for `silent_async_command`.
#[inline]
pub fn tokio_command<S: AsRef<OsStr>>(program: S) -> tokio::process::Command {
    silent_async_command(program)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_no_window_constant_value() {
        assert_eq!(CREATE_NO_WINDOW, 0x0800_0000);
        assert_eq!(CREATE_NO_WINDOW, 134_217_728);
    }

    #[test]
    fn test_silent_command_std_instantiation() {
        let mut cmd = silent_command("echo");
        cmd.arg("zen_test");
        assert_eq!(cmd.get_program(), "echo");
    }

    #[tokio::test]
    async fn test_silent_command_tokio_instantiation() {
        let mut cmd = silent_async_command("echo");
        cmd.arg("zen_async_test");
        assert_eq!(cmd.as_std().get_program(), "echo");
    }

    #[test]
    fn test_trait_into_silent() {
        let cmd = std::process::Command::new("ping").into_silent();
        assert_eq!(cmd.get_program(), "ping");
    }

    #[test]
    fn test_aliases_std_and_tokio_command() {
        let std_c = std_command("hostname");
        assert_eq!(std_c.get_program(), "hostname");

        let tokio_c = tokio_command("hostname");
        assert_eq!(tokio_c.as_std().get_program(), "hostname");
    }
}
