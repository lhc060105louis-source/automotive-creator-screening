# Automotive Creator Screening

A KOL (content creator) partnership screening and evaluation platform for automotive brands operating in the European market, with support for the United Kingdom, France, and Germany.

The platform provides KOL profile management, commercial value scoring, partnership risk assessment, YouTube data imports, and optional cloud synchronization for teams. It is a static front-end application and requires no build step.

## Quick Start

Start a local HTTP server from the project directory:

```bash
python3 -m http.server 8080
```

Then open <http://localhost:8080> in your browser.

> Opening the HTML files directly is not recommended. A local HTTP server avoids browser security restrictions associated with local files.

## Project Structure

```text
.
├── index.html                              # KOL partnership management platform
├── src/
│   └── kol-platform-core.js                # Documented scoring, data, and integration logic
├── tools/
│   ├── commercial-value-model.html         # Commercial value scoring tool
│   └── risk-assessment-model.html          # Risk assessment tool
├── data/
│   └── BYD_Xpeng_KOL_evaluation_data.xlsx  # Sample data for 57 European KOLs
└── docs/
    ├── architecture.html                   # Technical architecture diagram
    └── evaluation-model-guide.docx          # Evaluation model guide
```

## Optional Configuration

The following integrations can be configured in **System Settings**:

- **YouTube Data API v3 key:** Automatically retrieves channel and video data.
- **Supabase URL and key:** Synchronizes KOL data across team members.
- **Consumer sentiment API:** Retrieves voice-of-customer data. The platform uses demonstration data when this integration is not configured.

Configuration values are stored in the current browser's `localStorage`. Never hard-code real credentials in the source code or commit them to Git.

## Scoring Models

### Commercial Value

The commercial value score consists of seven dimensions:

| Dimension | Weight |
| --- | ---: |
| Audience fit | 20% |
| Content expertise | 15% |
| Engagement quality | 15% |
| Voice-of-customer value | 15% |
| Commercial efficiency | 15% |
| Brand fit | 10% |
| Execution readiness | 10% |

### Partnership Risk

The risk score consists of eight dimensions:

| Dimension | Weight |
| --- | ---: |
| Negative public sentiment | 20% |
| Advertising compliance | 15% |
| Competitor conflicts | 15% |
| Fraudulent traffic | 15% |
| Data privacy | 10% |
| Underage audiences | 10% |
| Technical claims | 10% |
| Execution risk | 5% |

## Technology

- HTML, CSS, and vanilla JavaScript
- SheetJS for Excel imports
- YouTube Data API v3 for channel data
- Supabase REST API for optional cloud synchronization
- Browser `localStorage` for default local persistence

External fonts, icons, and SheetJS are loaded from CDNs, so an internet connection is required on first use.
