# CLASH

## Why

Market research docs disagree. Same question, different numbers. CLASH finds conflicts and explains why.

## What

Upload docs. Ask question. Get conflicts with source, confidence, explanation, recommendation. Export memo.

**Flow:**
```
Upload → Question → AI Extract → Find Conflicts → Show Results → Export
```

## How

**Setup:**
1. `npm install`
2. Create `.env.local`: `GEMINI_API_KEY=your_key`
3. `npm run dev`

Runs at `http://localhost:3000`

## Info Flow

```mermaid
flowchart TD
    A[User uploads PDFs] --> B[User enters question]
    B --> C[Convert files to Base64<br/>parallel processing]
    C --> D[Single Gemini API call<br/>with all docs + question + schema]
    D --> E[AI processes in one pass:<br/>Extract answers, Normalize units,<br/>Detect conflicts >10%, Explain differences,<br/>Assign confidence per source]
    E --> F[Structured JSON Response<br/>conflicts, explanation, recommendation]
    F --> G[Display Results<br/>Conflicts list + Sidebar insights]
    G --> H[Export Memo<br/>Download investment memo]
```

**Extraction/Cleaning:**
- AI extracts answers from all docs in one pass
- AI normalizes units per prompt instruction
- AI groups conflicts and flags >10% differences per prompt
- AI assigns confidence (High/Medium/Low) per source reliability

**Presentation:**
- Conflicts list: value, source, confidence badge, context (with page numbers)
- Sidebar: explanation (why conflicts exist), recommendation (which to trust)
- Export: investment memo with all data points and sources
