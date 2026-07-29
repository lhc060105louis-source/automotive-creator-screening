# Complete KOL Project Packaging Design

## Goal

Expand this repository from a static KOL scoring demonstration into a complete, reproducible KOL creator-screening project while excluding generated files and duplicate copies.

## Canonical Sources

The desktop collaboration project in `.worktrees/kol-complete-cloud/KOL平台完整交付包` is the canonical application source because it extends the earlier `KOL出海筛选平台` with collaboration workflows, secure credential storage, offline-first synchronization, Supabase support, desktop launchers, packaging scripts, and a broader test suite.

The existing repository root remains the standalone static demonstration. Its seven delivered artifacts have already been hash-verified against the original static delivery package.

## Repository Layout

```text
.
├── index.html, src/, tools/, data/, docs/   # Existing static demonstration
├── desktop-app/                             # Canonical desktop collaboration application
│   ├── 01_KOL合作管理平台.html through 07_评估模型说明文稿.docx
│   │                                        # Numbered delivery assets required by desktop packaging tests
│   ├── README.txt                           # Desktop-specific delivery and credential guidance
│   ├── app/                                 # FastAPI server, frontend modules, collectors, sync layer
│   ├── packaging/                           # macOS and Windows build definitions
│   ├── supabase/                            # Database schema and row-level security policy
│   ├── tests/                               # Automated test suite
│   ├── examples/                            # Desktop-app sample CSV
│   ├── demo-screenshots/                    # Product screenshots used in delivery documentation
│   ├── requirements.txt
│   ├── pytest.ini
│   └── VERIFICATION.md
├── examples/
│   └── real_kols_uk_de_800.csv              # Larger KOL dataset retained from the earlier project
└── docs/
    ├── model-building.pdf                   # KOL model-building material
    ├── ui-integration.docx                  # KOL UI integration material
    ├── ui-summary.docx                      # KOL UI summary material
    └── project-test-report.pdf              # Earlier-project test report
```

## Inclusion Rules

Include source code, static assets required by the application, dependency manifests, tests, build scripts, Supabase configuration, sample datasets, screenshots, and business documentation.

Exclude virtual environments, build directories, packaged executables, caches, Python bytecode, local SQLite databases, temporary PDF-rendering assets, and repeated source variants. The numbered delivery assets and `README.txt` are retained inside `desktop-app/` because its packaging definition and automated tests require a self-contained delivery root; several assets also contain desktop-specific architecture and delivery guidance.

## README Requirements

Rewrite the root English README to distinguish the two supported product forms:

- The root static scoring demonstration, run through a local HTTP server.
- The full desktop collaboration application, run with Python 3.11+ and `python -m app.launcher` from `desktop-app/`.

The README must document the core functionality, project layout, optional external integrations, test command, packaging commands, and explicit handling of secrets.

## Validation

Before publishing, verify:

- No excluded generated directories or local databases are staged.
- The desktop app imports successfully and its test suite is run using its dependency environment when available.
- Required static JavaScript syntax remains valid.
- The repository tree includes all agreed project sections.
- No credential-like values appear in staged text files.

## Non-Goals

This packaging change does not alter application behavior, publish binaries, include local database data, or merge earlier-source variants that are superseded by the canonical desktop application.
