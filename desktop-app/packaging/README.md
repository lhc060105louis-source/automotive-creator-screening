# Native desktop packaging

Build each artifact on its target operating system. Cross-building macOS on Windows or Windows on macOS is not supported. The shared PyInstaller spec bundles Python, the local web UI, FastAPI/uvicorn, YouTube discovery, keyring backends, and the tray runtime, so end users do not install Python separately.

## Prerequisites

- Both platforms: Python 3.11 or 3.12, internet access to install `requirements.txt`, and enough space for a clean `.build/` virtual environment.
- macOS: Xcode Command Line Tools (`codesign`, `xcrun`, `hdiutil`). Public releases require an Apple Developer ID; notarization uses a `notarytool` keychain profile.
- Windows: 64-bit Python with `py` launcher, PowerShell, and Inno Setup 6 (`ISCC.exe`). Public releases should use an organization code-signing certificate after the installer is built.

Build scripts recreate `.build/` and `dist/<platform>/`; they do not read or delete the application's platformdirs user-data directory or OS credential-store entry.

## macOS build

Run on macOS from the project root:

```bash
bash packaging/macos/build.sh
bash packaging/macos/build.sh --smoke
```

Release output: `dist/macos/KOL合作管理平台.dmg`.

- Without `APPLE_SIGN_IDENTITY`, the script produces an unsigned internal `.app` and DMG. Gatekeeper warnings are expected; distribute only through a trusted internal channel.
- Set `APPLE_SIGN_IDENTITY="Developer ID Application: ..."` to sign with hardened runtime and the bundled entitlements.
- Optionally set `APPLE_NOTARY_PROFILE` to a previously created `xcrun notarytool store-credentials` profile. The script submits, waits, and staples before creating the DMG.
- `--smoke` builds the native `.app`, launches it without a separately installed Python, verifies the process remains alive, then stops it. Run the non-smoke command afterward to create the DMG.

## Windows build

Run on Windows from the project root:

```powershell
powershell -ExecutionPolicy Bypass -File packaging/windows/build.ps1
powershell -ExecutionPolicy Bypass -File packaging/windows/build.ps1 -Smoke
```

Release output: `dist/windows/KOL合作管理平台-Setup.exe`.

- Set `ISCC` when Inno Setup is not at its default location.
- `-Smoke` builds and starts the native executable without a separately installed Python, verifies it remains alive, and stops it. Run the non-smoke command afterward to compile the installer.
- The Inno installer uses `PrivilegesRequired=lowest`, installs beneath `%LOCALAPPDATA%\Programs`, and creates a Start Menu shortcut plus an optional Desktop shortcut.
- Upgrade and uninstall preserve the platformdirs database/log directory and the Windows Credential Manager entry. Complete removal is an explicit manual operator action.
- Unsigned internal installers may trigger SmartScreen. Production installers should be signed and verified on a clean Windows machine.

## Release verification

```bash
.venv/bin/python -m pytest tests/test_packaging_manifest.py tests/test_integrated_acceptance.py -v
.venv/bin/python -m pytest -v
```

Before distribution, run the native smoke command on a clean machine, then install the generated artifact and verify one-click launch, browser opening, tray reopen/exit, Key status without secret display, filtered export, upgrade preservation, and uninstall preservation. Automated tests use mocked YouTube discovery and do not require live network access; they do not replace native Gatekeeper, notarization, SmartScreen, shortcut, or installer checks.
