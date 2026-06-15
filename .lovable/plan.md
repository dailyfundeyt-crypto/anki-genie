# Spanish Vocab → Anki CSV Generator

A single-page app (English UI) that turns pasted Spanish text or uploaded images into a 2-column Anki CSV (`Spanish;German`).

## User flow

1. User lands on `/` — a chat-style input.
2. Inputs supported:
   - Paste Spanish text into a textarea
   - Upload one or more images (JPG/PNG, vision OCR + extraction in one model call)
   - Upload a `.txt` file (read client-side, content prefilled into textarea)
3. Click **Generate** → calls Lovable AI (`google/gemini-3-flash-preview`, multimodal) with a system prompt that returns structured JSON `{ cards: [{ spanish, german }] }`.
4. Result shown as an editable table (inline edit, delete row, add row).
5. Buttons: **Download CSV** (`vocab.csv`, `;`-separated, Anki-ready) and **Save to history**.
6. **History** panel (localStorage): list of past sets with name + date, click to reload into the table.

## Tech / structure

- TanStack Start, existing template.
- Server route `src/routes/api/extract-vocab.ts` (POST): accepts `{ text, images: base64[] }`, calls Lovable AI Gateway with multimodal `content` blocks, uses AI SDK `streamText` + `Output.object` (Zod schema for cards), returns JSON. Keeps `LOVABLE_API_KEY` server-side.
- Home route `src/routes/index.tsx`: composer (textarea + image/file drop), results table, history sidebar.
- Components: `VocabComposer`, `VocabTable`, `HistoryList`.
- `src/lib/csv.ts`: builds Anki CSV (`;` delimiter, quotes when needed, BOM for Excel-compat).
- `src/lib/history.ts`: localStorage CRUD (`anki-sets` key, `{ id, name, createdAt, cards }`).
- AI Elements not needed (no chat thread); use shadcn `Textarea`, `Button`, `Card`, `Table`, `Input`.

## System prompt (sent server-side)

Condensed version of the user's "Spanisch-Vokabel-Architekt" role, instructing: extract every meaningful Spanish vocab item from the input (text + image OCR), provide accurate German translation, infinitive for verbs, singular for nouns with article (`el/la`), no duplicates, return only JSON matching the schema.

## Out of scope (per user choice)

- No wortfamilien / opposites / similar words
- No Lückentext game, no quiz
- No auth, no Cloud DB
- CSV stays 2 columns (Spanish; German)

## Errors

Surface 429 (rate limit) and 402 (credits) from gateway as toast messages; keep input intact on failure.
