This directory contains vendored desktop CLI dependencies that Rome Desktop can package into the app bundle.

Current policy:
- `win32-x64/` is checked in with pinned MSYS2 binaries for `ssh` and `ssh-keygen`, plus required DLLs and license files.
- macOS is not vendored here. The build falls back to local system binaries on macOS instead of redistributing Apple-provided `/usr/bin` binaries in-repo.

The desktop build prefers vendored binaries first and only falls back to system discovery when a vendored binary is unavailable for the current platform.
