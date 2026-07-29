# Complete KOL Project Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a reproducible full KOL creator-screening project, including the canonical desktop application and selected unique datasets and business documentation.

**Architecture:** Keep the existing root static demonstration as a browser-only product. Add the canonical desktop collaboration application as `desktop-app/`, then add only the earlier project's unique dataset and test report to `examples/` and `docs/`. Do not carry virtual environments, local database files, caches, packaged applications, or duplicate source variants.

**Tech Stack:** HTML, CSS, vanilla JavaScript, Python 3.11+, FastAPI, SQLite for local runtime storage, Supabase SQL, pytest, PyInstaller packaging definitions.

## Global Constraints

- Canonical source: `/Users/haochongluo/Desktop/凯捷实习/.worktrees/kol-complete-cloud/KOL平台完整交付包`.
- Retain the existing static demonstration at repository root unchanged.
- Exclude `.venv`, `.build`, `dist`, `.pytest_cache`, `__pycache__`, `*.pyc`, `*.db`, and temporary rendering files.
- Do not commit credentials, API keys, access tokens, or service-role keys.
- Include only business documents that are not copies of files already in `docs/`.

---

### Task 1: Prepare the repository inclusion boundary

**Files:**
- Modify: `.gitignore`
- Create: `desktop-app/` directory tree
- Create: `examples/` directory

**Interfaces:**
- Consumes: the inclusion and exclusion rules in `docs/superpowers/specs/2026-07-29-complete-kol-project-packaging-design.md`.
- Produces: a repository tree that can receive canonical source without generated content.

- [ ] **Step 1: Check that no generated source paths are in the staging area**

Run:

```bash
git diff --cached --name-only | rg '(^|/)(\.venv|\.build|dist|\.pytest_cache|__pycache__)(/|$)|\.pyc$|\.db$'
```

Expected: no output.

- [ ] **Step 2: Add project-local exclusions to `.gitignore`**

Add these lines if not already present:

```gitignore
desktop-app/.venv/
desktop-app/.build/
desktop-app/dist/
desktop-app/.pytest_cache/
desktop-app/**/__pycache__/
desktop-app/**/*.pyc
desktop-app/**/*.db
```

- [ ] **Step 3: Verify the ignore rules match generated paths**

Run:

```bash
git check-ignore -v desktop-app/.venv/bin/python desktop-app/.build/macos/output desktop-app/data/kol_platform.db
```

Expected: one matching ignore rule per path.

### Task 2: Add the canonical desktop collaboration application

**Files:**
- Create: `desktop-app/app/`
- Create: `desktop-app/tests/`
- Create: `desktop-app/packaging/`
- Create: `desktop-app/supabase/`
- Create: `desktop-app/examples/sample_kols.csv`
- Create: `desktop-app/demo-screenshots/`
- Create: `desktop-app/requirements.txt`
- Create: `desktop-app/pytest.ini`
- Create: `desktop-app/VERIFICATION.md`

**Interfaces:**
- Consumes: canonical source under `.worktrees/kol-complete-cloud/KOL平台完整交付包`.
- Produces: `desktop-app.app.launcher` as the Python module entry point and a test suite under `desktop-app/tests/`.

- [ ] **Step 1: Copy only the canonical source sections**

Run:

```bash
mkdir -p desktop-app
cp -R ../.worktrees/kol-complete-cloud/KOL平台完整交付包/app desktop-app/
cp -R ../.worktrees/kol-complete-cloud/KOL平台完整交付包/tests desktop-app/
cp -R ../.worktrees/kol-complete-cloud/KOL平台完整交付包/packaging desktop-app/
cp -R ../.worktrees/kol-complete-cloud/KOL平台完整交付包/supabase desktop-app/
cp -R ../.worktrees/kol-complete-cloud/KOL平台完整交付包/examples desktop-app/
cp -R ../.worktrees/kol-complete-cloud/KOL平台完整交付包/demo-screenshots desktop-app/
cp ../.worktrees/kol-complete-cloud/KOL平台完整交付包/requirements.txt ../.worktrees/kol-complete-cloud/KOL平台完整交付包/pytest.ini ../.worktrees/kol-complete-cloud/KOL平台完整交付包/VERIFICATION.md desktop-app/
```

- [ ] **Step 2: Verify excluded paths were not copied**

Run:

```bash
find desktop-app -type f \( -path '*/.venv/*' -o -path '*/.build/*' -o -path '*/dist/*' -o -path '*/.pytest_cache/*' -o -path '*/__pycache__/*' -o -name '*.pyc' -o -name '*.db' \)
```

Expected: no output.

- [ ] **Step 3: Verify canonical files are byte-for-byte equal**

Run:

```bash
diff -qr --exclude='.venv' --exclude='.build' --exclude='dist' --exclude='.pytest_cache' --exclude='__pycache__' --exclude='*.pyc' --exclude='*.db' ../.worktrees/kol-complete-cloud/KOL平台完整交付包/app desktop-app/app
```

Expected: no output.

### Task 3: Add unique data and business documentation

**Files:**
- Create: `examples/real_kols_uk_de_800.csv`
- Create: `docs/model-building.pdf`
- Create: `docs/ui-integration.docx`
- Create: `docs/ui-summary.docx`
- Create: `docs/project-test-report.pdf`

**Interfaces:**
- Consumes: the earlier platform's non-duplicate dataset and report, plus the KOL business documents in `OverSeas-publish/KOL业务/`.
- Produces: reproducible examples and project collateral referenced by the root README.

- [ ] **Step 1: Copy the selected non-duplicate artifacts**

Run:

```bash
mkdir -p examples
cp ../KOL出海筛选平台/examples/real_kols_uk_de_800.csv examples/
cp '../OverSeas-publish/KOL业务/KOL业务组 模型构建.pdf' docs/model-building.pdf
cp '../OverSeas-publish/KOL业务/KOL项目UI整合.docx' docs/ui-integration.docx
cp '../OverSeas-publish/KOL业务/KOL项目UI汇总2.docx' docs/ui-summary.docx
cp ../KOL出海筛选平台/output/pdf/KOL出海筛选平台_项目说明与测试报告.pdf docs/project-test-report.pdf
```

- [ ] **Step 2: Verify that the artifacts are not empty and retain their source hashes**

Run:

```bash
shasum -a 256 ../KOL出海筛选平台/examples/real_kols_uk_de_800.csv examples/real_kols_uk_de_800.csv
shasum -a 256 '../OverSeas-publish/KOL业务/KOL业务组 模型构建.pdf' docs/model-building.pdf
```

Expected: each source/destination pair has identical hashes.

### Task 4: Rewrite the root README for the complete repository

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: root static demonstration paths and `desktop-app/app/launcher.py`.
- Produces: clear installation, launch, test, packaging, documentation, data, and security guidance for both product forms.

- [ ] **Step 1: Replace the README with the two-product overview**

Document these exact commands:

```bash
# static demonstration
python3 -m http.server 8080

# desktop application
cd desktop-app
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m app.launcher

# tests
.venv/bin/python -m pytest
```

Include the root static files, `desktop-app/`, `examples/`, and `docs/` in the project tree. State that secrets are stored through the native credential manager and must not be committed.

- [ ] **Step 2: Validate Markdown and required sections**

Run:

```bash
rg -n '^## (Static Demonstration|Desktop Collaboration Application|Project Structure|Testing|Packaging|Security)' README.md
git diff --check -- README.md
```

Expected: all six headings are present and the whitespace check returns no output.

### Task 5: Validate, commit, and publish the curated repository

**Files:**
- Modify: all files selected by Tasks 1–4

**Interfaces:**
- Consumes: the complete staged repository tree.
- Produces: one Git commit on `main` and a corresponding `origin/main` push.

- [ ] **Step 1: Scan staged text for credential-like values**

Run:

```bash
git diff --cached -- . ':!*.pdf' ':!*.docx' ':!*.xlsx' | rg -n '(AIza[0-9A-Za-z_-]{30,}|sk-[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,})'
```

Expected: no output.

- [ ] **Step 2: Run source checks**

Run:

```bash
node --check src/kol-platform-core.js
python3 -m compileall -q desktop-app/app
python3 -m pytest -q desktop-app/tests
```

Expected: JavaScript syntax succeeds, Python compilation succeeds, and the test suite reports zero failures. If the current interpreter lacks required packages, create `desktop-app/.venv`, install `desktop-app/requirements.txt`, and rerun pytest with that virtual environment.

- [ ] **Step 3: Confirm staged scope and commit**

Run:

```bash
git status -sb
git diff --cached --stat
git add .gitignore README.md desktop-app examples docs
git commit -m 'Add complete KOL collaboration platform'
```

- [ ] **Step 4: Push and verify the remote commit**

Run:

```bash
git push origin main
git ls-remote origin refs/heads/main
git rev-parse HEAD
```

Expected: the remote and local commit hashes match.
