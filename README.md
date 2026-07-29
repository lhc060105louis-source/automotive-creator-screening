# Automotive Creator Screening

An automotive KOL (content creator) screening project for the United Kingdom, France, and Germany. The repository includes two complementary product forms:

- A browser-based static demonstration for KOL management and standalone scoring.
- A full, offline-first desktop collaboration application with local storage, team synchronization, automated data collection, and native packaging definitions.

## Static Demonstration

The repository root contains a self-contained HTML demonstration with KOL management, commercial value scoring, partnership risk scoring, Excel imports, and optional browser-side integrations.

Start a local server from the repository root:

```bash
python3 -m http.server 8080
```

Open <http://localhost:8080> in a browser. Use a local HTTP server rather than opening the HTML file directly so browser security restrictions do not block imports.

The main entry point is `index.html`. The standalone scoring tools are available in `tools/`.

## Desktop Collaboration Application

`desktop-app/` is the canonical full application. It launches a local FastAPI service and opens a browser-based management interface; data remains usable offline in local SQLite storage and may synchronize with Supabase when configured.

Features include:

- CSV/XLSX import and Excel export
- YouTube, Reddit, and TikTok creator data collection
- KOL search, scoring evidence, completeness indicators, and comparison of up to four creators
- Shortlists, contracts, execution workflows, and post-campaign reviews
- Local-first synchronization, conflict handling, and optional Supabase team sharing
- Credential storage through macOS Keychain or Windows Credential Manager

### Development Setup

Python 3.11 or later is required. From the repository root:

```bash
cd desktop-app
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m app.launcher
```

On Windows PowerShell, use:

```powershell
cd desktop-app
py -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python -m app.launcher
```

## Project Structure

```text
.
├── index.html                              # Static KOL management demonstration
├── src/kol-platform-core.js                # Documented scoring and integration logic
├── tools/                                  # Standalone commercial-value and risk tools
├── data/                                   # 57-creator evaluation workbook
├── desktop-app/
│   ├── app/                                # FastAPI application, frontend modules, collectors, sync layer
│   ├── tests/                              # Automated test suite
│   ├── packaging/                          # macOS and Windows packaging definitions
│   ├── supabase/                           # Schema and row-level security policy
│   ├── examples/                           # Desktop application sample data
│   └── demo-screenshots/                   # Delivery screenshots
├── examples/real_kols_uk_de_800.csv        # Larger UK and Germany creator dataset
└── docs/                                   # Architecture, model, UI, and project documentation
```

## Data and Documentation

- `data/BYD_Xpeng_KOL_evaluation_data.xlsx`: evaluation data for 57 European creators.
- `examples/real_kols_uk_de_800.csv`: larger example creator dataset for the earlier screening workflow.
- `docs/architecture.html`: technical architecture for the static demonstration.
- `docs/evaluation-model-guide.docx`: scoring-model guide.
- `docs/model-building.pdf`: KOL model-building material.
- `docs/ui-integration.docx` and `docs/ui-summary.docx`: KOL UI delivery material.
- `docs/project-test-report.pdf`: project description and test report for the earlier platform.

## Testing

Run the static demonstration syntax check from the repository root:

```bash
node --check src/kol-platform-core.js
```

Run the desktop application test suite after creating its virtual environment:

```bash
cd desktop-app
.venv/bin/python -m pytest
```

The test suite uses isolated local data and mocked external collector behavior. It does not require live YouTube, Reddit, TikTok, or Supabase credentials.

## Packaging

Build each native artifact on its target operating system from `desktop-app/`:

```bash
# macOS
bash packaging/macos/build.sh

# Windows PowerShell
powershell -ExecutionPolicy Bypass -File packaging/windows/build.ps1
```

See [desktop-app/packaging/README.md](desktop-app/packaging/README.md) for signing, smoke-test, notarization, and installer requirements. Generated build directories and installers are intentionally excluded from version control.

## Optional Integrations

- **YouTube Data API v3:** channel and video enrichment.
- **Reddit and TikTok collectors:** creator discovery and signal collection.
- **Supabase:** optional team synchronization. Apply `desktop-app/supabase/schema.sql` and `desktop-app/supabase/rls.sql` before enabling it.

## Security

Do not commit API keys, Supabase keys, access tokens, or service-role credentials. The desktop application stores configured secrets through the operating system credential manager and does not display their plaintext values in the UI. The static demonstration uses browser `localStorage` for optional configuration; clear browser storage when sharing a workstation.
