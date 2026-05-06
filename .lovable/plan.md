## Idestrim Pitch Deck Generator

A complete feature that turns any idea (new or existing) into an editable, downloadable, watermarked pitch deck powered by Lovable AI.

### 1. Database (Supabase migration)

New table `pitch_decks`:
- `id`, `user_id`, `idea_id` (nullable FK to media_uploads), `title`
- `category`, `target_audience`, `monetization`, `website_url`
- `image_url`, `video_url`
- `sections` (JSONB) — array of `{ key, title, bullets[] }`
- `is_public` (bool, default false), `share_token` (text, nullable)
- `created_at`, `updated_at`
- RLS: owner full CRUD; public SELECT only when `is_public = true`

### 2. Edge Function: `generate-pitch-deck`
- Auth-required (validates JWT via `auth.getClaims`)
- Input: `{ title, description, category, audience?, monetization?, website?, ideaId? }`
- Calls Lovable AI Gateway (`google/gemini-3-flash-preview`) with **tool-calling** for structured JSON output
- Returns 10 sections: Title, Problem, Solution, Market Opportunity, How It Works, Business Model, Competitive Advantage, Traction, Vision, Call to Action — each with bullets
- Handles 429 / 402 errors and surfaces them

### 3. Frontend Components
- `src/components/pitch/PitchDeckDialog.tsx` — generation form (minimal fields), AtomLoader during AI call
- `src/components/pitch/PitchDeckEditor.tsx` — slide-style card preview, inline-editable title + bullets per section, save button
- `src/components/pitch/PitchDeckCard.tsx` — list item for profile tab
- `src/utils/pitchDeckPdf.ts` — jsPDF generator: one slide per page, IDESTRIM diagonal low-opacity watermark, clean typography, cover slide w/ logo

### 4. Entry Points
- **Upload page** (`src/pages/Upload.tsx`): add "Generate Pitch Deck" button — opens dialog prefilled with current upload data; saves deck linked to the new media after upload
- **Idea detail** (`src/pages/IdeaDetail.tsx`) and Slides page action overlay: "Create Pitch Deck" button → opens dialog prefilled from the idea
- **FloatingActionHub**: quick "New Pitch Deck" entry (standalone)

### 5. Pitch Decks Page & Profile Tab
- New route `/pitch-decks/:id` — full editor + Download PDF + Share toggle
- New profile tab "Pitch Decks" listing the user's decks (view / edit / download / share-link copy)

### 6. PDF Export
- Library: `jspdf` (already common; will add if missing)
- Layout: 16:9 landscape, brand-safe palette, large section title, bullets, page number
- Watermark: diagonal "IDESTRIM" text, ~8% opacity, centered, repeated subtly

### 7. UI/UX
- Card-based slide preview, smooth transitions (existing motion utilities)
- Mobile responsive
- AtomLoader during AI generation and PDF export

### 8. Future-ready
- `is_public` + `share_token` already in schema for investor sharing
- Sections stored as structured JSON → trivially exportable to PPTX later
- `idea_id` link enables future similarity integration

### Out of scope for v1
- PPTX export (schema ready, no UI)
- Real-time collaboration

---

Shall I proceed with this implementation?
