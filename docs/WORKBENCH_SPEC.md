# Care Management Workbench: build spec for a clickable demo

You are building a **clickable, high-fidelity demo website** of a product called the **Care Management Workbench**. It is part of a product-manager hiring case for HiLabs, a US healthcare-data company. The people evaluating it will click through it for 3–5 minutes. It has to feel like real software a nurse would use on a Monday morning: calm, dense, fast, trustworthy. It must not feel like a marketing page or an AI toy.

All patient content already exists in `data.js` (`window.WB`). **Your job is the interface, not the content.**

---

## 0. How to work (read first; the owner is on a limited quota)

1. **Stack:** plain HTML + CSS + vanilla JavaScript (ES2020). No npm, no build step, no frameworks, no JS from a CDN, no `type="module"`. The only external resource allowed is the Google Fonts stylesheet link.
2. **It must run by double-clicking `index.html`** (file://). Load every script with a classic `<script src="…">` tag, in this order: `data.js`, `js/core.js`, `js/queue.js`, `js/member.js`, `js/outreach.js`, `js/tour.js`. No `fetch`, no server.
3. **`data.js` already exists. Never edit it, regenerate it, or paste its contents.** Read **only lines 1–54** (the schema comment). Line 55 is one very long line of data; don't open it.
4. **Never invent member data.** Names, numbers, dates, meds, phone numbers and clinical text all come from `window.WB`. You may write UI copy (labels, buttons, empty states); prefer the copy in this spec.
5. **Build only the phase you are asked for** (section 14). Write each new file once, completely. When fixing something later, edit only the lines that change; never rewrite a whole file to change a few lines.
6. Keep your implementation plan to **10 bullets or fewer**. Skip the walkthrough document. Don't paste code into chat. End each phase with a summary of **5 lines or fewer**: files written, what to click to check it, known gaps.
7. **Don't open the browser to test.** The owner tests by opening `index.html`. Use the browser only if asked.
8. When a detail is unclear, take the simpler option and note it in one line. Don't stop to ask.

File plan (final):
```
index.html
data.js            (given; read-only)
css/styles.css
js/core.js         state, router, helpers, shared components, drawer/modal/toast, top bar, welcome modal, design notes
js/queue.js        Screen 1: Today (work queue) + ranking drawer
js/member.js       Screen 2: Member view + merge modal
js/outreach.js     Screen 3: Outreach and documentation + sign flow + Tasks screen
js/tour.js         Guided tour + keyboard shortcuts
```
Each screen file registers itself, e.g. `WBApp.screens.queue = { render(root, params) {…} }`.

---

## 1. The situation (why this exists)

A US health plan (fictional: **Evergreen Health Plan**) employs **nurse case managers**. They phone members after hospital stays, during chronic illness or in crises, and coordinate care: medications, appointments, rides, benefits. They don't treat patients; they coordinate and coach.

Today a case manager opens **6–7 systems per member**: claims portal, authorization system, pharmacy file, health-information-exchange (HIE) portal, old notes, her own spreadsheet. The data is messy (lists conflict), late (claims arrive weeks after care) and scattered. She re-types the same facts into a 40-field assessment. By 3 pm she has had two real conversations. Her clinical judgment, the most valuable thing she brings, barely gets used.

**The product vision, in one line:** *Tell the nurse who needs her first and why, show her one picture of the member she can trust, and draft the paperwork for her to sign.*

The evaluators are scoring:
- an information hierarchy that follows the nurse's workflow;
- how data **freshness, conflicts and confidence** are shown;
- how the **next best action** works;
- **AI with a human in the loop**: what is automated and what the nurse confirms.

The demo has to make each of those **visible and clickable**.

---

## 2. The user: Maria (design every pixel for her)

Use `WB.persona`. In short:
- **Maria R., RN.** 20 years in ICU, now a telephonic case manager. **48 active cases**, 6 new hospital alerts since Friday.
- Judged on: contact within 2 business days of discharge, follow-up visits within 7 days, readmissions, audit-ready notes.
- Her edge: she notices when a medication list doesn't add up, and she hears when a caregiver isn't coping.
- She reads fast, distrusts black boxes, and hates re-typing. Her ask: **"Tell me who needs me today and why, and let me trust what I see."**

Design consequences: show reasons, not scores alone; show sources on everything; no fluff, no illustrations, no emoji; information-dense but calm; every important action reachable in one click.

**Demo date and time:** the app is frozen at **Mon 9 Nov 2026, 8:00 AM** (`WB.meta.asOf`). All "days left" and "N days ago" values are computed from that date, never from the real clock.

---

## 3. The five members (all fictional; full data in `WB.patients`)

| Rank | Member | Scenario | What the demo must reveal |
|---|---|---|---|
| 1 (4.85) | **Walter Brennan**, 74, MA-HMO | Heart-failure discharge Fri 6 Nov | New HF drug (sacubitril/valsartan) blocked by a prior auth due today; lisinopril (ACE inhibitor, must not combine) still shipped by mail; diuretic dose mismatch 40 vs 80 mg; K 5.3, creatinine 2.1. Wife **Joan** answers the landline. |
| 2 (3.85) | **Tanya Brooks**, 38, Medicaid | Psychiatric discharge to a shelter | Lithium never dispensed; 7-day follow-up window closes Wed 11 Nov but visit booked day 8; phone dead; a friend's number exists only in a social-worker note; substance-use data restricted (42 CFR Part 2). |
| 3 (3.65) | **Eleanor Whitfield**, 82, dual-eligible | Dementia, caregiver strain | Care hours cut 20 → 10 a week, appeal closes Sat 14 Nov; daughter **Susan** at breaking point (ZBI-4 13/16), number only in call-center notes, not authorized yet; fall 30 Oct; risky meds. |
| 4 (2.95) | **Darnell Whitaker**, 47, ACA | Unreachable frequent ED user | **Two member records** (M-20103 / M-20193, 0.93 match). Merged = 7 ED visits in 85 days. Plan phone dead; ED registration has a working number; prefers text. |
| 5 (2.90) | **Carlos Mendez**, 66, MA-PPO | Diabetic who "stopped refills" | Looks like non-adherence; actually a cash fill + a cost problem. Language on file English, but he self-reported Spanish, evenings. A1c 7.8 → 9.6. |

Scripted demo calls exist **only for Walter (P1) and Tanya (P4)**.

---

## 4. Product principles (non-negotiable; these are what's being graded)

1. **Trust layer.** Every member fact shows a **source chip** (feed + date). Clicking any chip opens the **Evidence drawer** with the raw record. Claims are never labelled "latest".
2. **Conflicts sit side by side**, never silently resolved. Both values are shown, orange outline, the word "Conflict".
3. **Inferred is not known.** Inferred facts get a dashed **Inferred** badge, a confidence word (High / Medium / Low) and a "because …" line on hover or tap.
4. **Missing is a state.** Missing data shows as a dashed empty box with an action ("Request"), never as a blank.
5. **At most 3 attention flags per member.** No alert walls.
6. **AI drafts; Maria decides.** Generated text carries a small **"Draft"** tag. Nothing changes the member record or files a note until Maria confirms and signs (`WB.aiBoundary`).
7. **Every next step is a verb + channel + time** ("Call landline, ask for Joan · now").
8. **Restricted data** shows as a locked row, with the rule and the consent state. Never show its contents.
9. **Colour never carries meaning alone**: every coloured state also has a word.

---

## 5. Visual design system

Match the case deck: warm paper, ink, one blue, one orange. Desktop only: design for **1440 × 900**, must not break at 1280. No mobile layout.

```css
:root{
  --paper:#F5F3EE;      /* app background */
  --surface:#FDFCF9;    /* cards, tables */
  --surface-2:#F0EDE6;  /* table headers, subtle fills */
  --line:#D8D3C8; --line-soft:#E4E0D7;
  --ink:#1B232B; --ink-2:#2E3740; --muted:#5E6772;
  --blue:#1F5FAD; --blue-tint:#E1EAF5;            /* actions, "from record", OK */
  --orange:#A84A14; --orange-text:#8A3C10; --orange-tint:#F6E3D5;  /* conflict, urgent, "from this call" */
  --amber:#8A6500; --amber-tint:#F4ECD6;          /* stale, gap */
  --topbar:#1B232B;
  --radius:8px; --shadow:0 1px 2px rgba(27,35,43,.06),0 4px 16px rgba(27,35,43,.06);
}
```
- **Fonts:** one Google Fonts link for `Source Serif 4` (600), `IBM Plex Sans` (400, 500, 600) and `IBM Plex Mono` (400, 500). Plex Sans for the UI; Source Serif 4 **only** for page titles and the member's name; Plex Mono for IDs, phone numbers, times and source chips.
- **Type scale:** 28 (page title, serif) / 18 (card titles) / 14 (body, tables) / 12 (chips, labels; uppercase section labels at 12px, letter-spacing .06em, `--muted`). Line height 1.45.
- **Spacing:** 4-px grid. Cards: `--surface`, 1px `--line` border, `--radius`, 16–20px padding. Use whitespace and hairlines, not heavy boxes.
- **Motion:** 150–200 ms ease-out. Re-sorting uses a FLIP animation. Nothing bounces.
- **Focus states** visible; buttons are real `<button>`s; keyboard usable.

**Shared components (build in `core.js`; reuse everywhere):**
- `SourceChip(source)` → mono 12px pill `PBM · 8 Nov`, 1px border, hover underline. Click opens the Evidence drawer.
- `AgeBadge(date)` → "today", "2 d", "6 wk", "8 mo". Older than 90 days: amber, text "stale".
- `ClockChip(clock)` → urgency `today` = solid orange; `soon` = orange outline; `week` = ink outline; `none` = grey text. Label on top line, `sub` below in muted.
- `StatusPill(status)` → `blocked` orange fill, white text; `conflict` orange outline with "Conflict ·" prefix when the label lacks it; `gap` amber tint; `ok` blue tint.
- `InferredBadge(confidence, because)` → dashed 1px border, "Inferred · Medium", tooltip = because.
- `DraftTag()` → tiny "Draft" label, dotted underline, muted. Means "AI wrote this; check it".
- `Flag(kind, text)` → small pill; kinds `late`, `missing`, `conflict`, `duplicate`, `unreachable`, `restricted` (lock glyph drawn in CSS or the text "Locked").
- **Drawer** (right, 480px, overlay with scrim), **Modal** (centred, 720px max), **Toast** (bottom-left, auto-hide 4 s, optional "Undo" link).
- **Evidence drawer:** title = record id + feed; table of every field in the raw record (camelCase keys → "Title case" labels); if the record has `impRef`, show an amber note "Planted imperfection IMP-xx" with `whatIsWrong` and `howTheProductShouldHandleIt` from `WB.imperfections`.

---

## 6. Shared logic (put in `core.js`)

```js
// Find the raw record behind a source chip.
function findRecord(p, ref){
  if (ref === 'riskDeadlines') return { table:'riskDeadlines', rows:p.raw.riskDeadlines };
  if (/^M-\d+$/.test(ref)) return { table:'eligibility', record:p.raw.eligibility.find(r=>r.memberID===ref) };
  const idKeys = {adt:'alertID',claims:'claimID',pharmacy:'rxID',contacts:'contactID',sdoh:'screenID',
                  labs:'labID',appointments:'apptID',auth:'authID',notes:'noteID'};
  for (const [t,k] of Object.entries(idKeys)) { const r = p.raw[t].find(x=>x[k]===ref); if (r) return {table:t, record:r}; }
  return null;
}
```
- **Dates:** parse `YYYY-MM-DD` and `YYYY-MM-DDTHH:MM` as local time. Display as `Mon 9 Nov` and `8:00 AM`. `daysFrom(asOf, date)` returns whole days; label 0 as "today", 1 as "tomorrow", negative as "N d ago".
- **Score:** `score = Σ weight × scores[k]` (keys `acuity`, `deadline`, `preventable`, `reach`). Recompute live when weights change; `p.score` is the precomputed default.
- **State** (one object, persisted to `localStorage` key `wb-demo-v1` inside try/catch):
  `{ weights, order:[ids]|null, overrides:[{who, from, to, reason, at}], merged:false|'rejected'|true, medAnswers:{P1:{rowIndex:option}}, goalsDone:{P1:[i]}, notes:{P1:{fieldKey:{value, origin, confirmed}}}, contactState:{P1:{rank:{fails, retired, confirmed}}}, signed:{P1:'08:42 AM'}, tasks:[{pid,title,due,owner,done}], requested:{P1:['Discharge summary']}, clockOffsetMin:0, welcomed:false }`
- **Router:** hash routes `#/queue` (default), `#/member/P1`, `#/outreach/P1`, `#/tasks`. On route change render into `<main id="app">` and scroll to top.
- **Tiny DOM helper** to keep the code short, e.g. `h('div',{class:'card', onclick:fn}, ...children)`.

---

## 7. App shell

- **Top bar** (56px, `--topbar`, light text):
  left: wordmark **Workbench**, then muted "Evergreen Health Plan · Care Management";
  centre: **search** (placeholder "Search member name or ID"). It matches the 5 members by name or any member ID; typing `M-20193` finds Darnell with the hint "Possible duplicate of M-20103";
  right: demo clock `Mon 9 Nov · 8:00 AM` (mono; advances by `clockOffsetMin`), buttons **Design notes** (toggle), **Tour**, **Reset demo**, then avatar "MR" + "Maria R., RN".
- **Left rail** (200px, `--surface`, hairline right border): **Today** (count of open rows), **Tasks** (count badge), then a "Recent" list of the last 3 members opened. Footer of the rail, small muted: `WB.meta.planNote`.
- **Welcome modal** (first visit only, or after Reset): title "You are Maria." The body is a compact persona card from `WB.persona` (role, background, caseload, judged on, her edge, her ask) plus one line: "It's Monday 9 Nov, 8:00 AM. Six alerts came in over the weekend." Buttons: **Take the 2-minute tour** (primary), **Explore on my own**. Small print: "Demo of the Care Management Workbench · HiLabs APM case · all data fictional."
- **Design notes** toggle: shows numbered dark circles (20px, white number) next to elements carrying `data-note="queue-1"` etc., plus a 320px panel on the right listing `WB.annotations[screen]`. On the outreach screen the panel also lists `WB.aiBoundary`; on the member view, the **planted imperfections** for that member (`WB.imperfections` filtered by `patientRef`): what is wrong → how the product handles it. This is how evaluators connect the site to the case write-up.

---

## 8. Screen 1: Today (work queue) — `#/queue`

**Purpose:** in 10 seconds Maria knows who to call first, why, by when, and how.

Layout, top to bottom:
1. **Header** (`data-tour="queue-header"`): "Good morning, Maria" (serif 28). Subline: "Mon 9 Nov · 48 active cases · 5 need you today". On the right, **How ranking works** (`data-tour="rank-settings"`) opens the Ranking drawer.
2. **Filter chips** (toggle, one at a time): `6 new alerts since Fri` · `3 clocks ≤ 2 days` (shows P1, P4) · `1 record to merge` (shows P3) · `All` (default). Counts come from `WB.meta.caseload`.
3. **Day plan strip:** a thin horizontal timeline from 8 AM to 7 PM, with a dot for each member's planned contact (`queue.nba.when`: "Now" = 8:00; "12:30"; "18:30"). Hovering a dot shows "12:30 · Call daughter Susan". Clicking it scrolls to the row. Members with no time are listed as "Anytime".
4. **Queue table** (the hero). Columns:
   - **#** — rank number, a drag handle (⋮⋮ in CSS) and a small score badge `4.85`. Hovering the score shows a popover with 4 horizontal bars (score × weight per factor) and `WB.meta.weightHelp`. `data-note="queue-1"`.
   - **Member** — `shortName, age` (bold) and `queue.subtitle` (muted); a small "ES" language tag for Carlos.
   - **Why now** — `queue.whyNow`, then a chip "N sources" that opens the Evidence drawer listing all of that member's `summary[].sources` as clickable chips. `data-note="queue-2"`.
   - **Clock** — `ClockChip(queue.clock)`. `data-note="queue-3"`.
   - **Next step** — primary button with `queue.nba.label` and `when` underneath ("Now", "12:30 PM", "6:30 PM"). `nba.note` is a tooltip on an ⓘ (draw it with CSS, not an emoji). `data-note="queue-4"`.
   - **Flags** — up to 2 `Flag` pills from `queue.flags`.
   - **⋯ menu** — *Skip for today* (asks for a reason), *Snooze until…* (time picker: 10 AM / 12 PM / 3 PM), *Reassign* (P2 shows "Suggested: Spanish-speaking case manager").
   Each row gets `data-tour="row-P1"` etc.; urgency `today`/`soon` rows get a 4px orange left border.
   - **Row click** (anywhere except controls) → `#/member/:id`.
   - **Next-step click** → `#/outreach/:id`. For P3 while not merged → open the **merge modal** (section 10).
   - **Drag to reorder** (HTML5 drag-and-drop) → on drop, a small modal: "Why move Tanya above Walter?" with reasons *Clinical judgment* · *Member asked for a time* · *Waiting on someone else* · *Other…* (text). Save it to `state.overrides`; toast "Logged — reorders tune the ranking rules." Manual order then wins over the score until **Reset order**.
   - **Done state:** after a member's note is signed, the row turns muted, shows "Done · note signed 8:42 AM", and moves to a **Done today** group at the bottom.
   - Footer row (muted, not clickable): "43 other active cases — nothing due today (not in demo data)".
5. **Ranking drawer:** title "How the queue is ranked". Four sliders (0–50, step 5) labelled with `WB.meta.weightLabels`, values shown as %, normalised to 100% with the total displayed. Rows re-sort live behind the drawer (FLIP). Below: `weightHelp`; **Reset weights**; then **Override log** (each entry: time, who moved, reason), empty state "No overrides yet."

---

## 9. Screen 2: Member view — `#/member/:id`

**Purpose:** what changed, what is unsafe, how sure we are, and what is missing, in one screen with receipts.

**Header band** (full width, `--surface`, hairline bottom):
- Left: name (serif 28) · `age sex` · product · member ID(s) (mono) · program · "Case day N" (from `caseOpened` to asOf) · PCP.
- Language: plain text, except P2, which shows an orange **Conflict** chip "Spanish (self-report, May) vs English (file)". The popover shows `language.conflict` and the rule "Newest self-report wins."
- P3 before the merge: both IDs plus a **Possible duplicate — review** button (opens the merge modal).
- Right: risk chip (`riskScore.label`: value + band; note as tooltip), **Start outreach** (primary → `#/outreach/:id`), **Add task**.

**Body:** 2 columns: main (≈ 2/3) and side (≈ 1/3), each a stack of cards.

Main column:
1. **Since last touch** (`data-tour="since-last-touch"`, `data-note="member-1"`): card title + `DraftTag` + muted "built from N sources". One line per `summary[]` item: the text, then its `SourceChip`s. Items with `inferred` get an `InferredBadge(confidence, because)` and a dashed underline on the text (`data-note="member-4"`). For P3 items with `requiresMerge` while not merged: show greyed text "3 ED visits on this record — 4 more sit on M-20193. Review the merge to see the full history."
2. **Needs your attention**: up to 3 cards from `attention[]`, each with a severity stripe (high = orange, medium = amber, low = grey) plus the word, title, detail and source chips.
3. **Medication check** (`data-tour="med-check"`, `data-note="member-3"`): a table with columns `Medication` | `meds.colA` | `meds.colB` (`data-note="member-2"`) | `Status` | `On the call`.
   - Cells show text plus `SourceChip`; cells with `inferred` get a dashed border and "assumed" in muted text.
   - Rows whose status kind is `conflict` or `blocked` get an orange left border.
   - **On the call:** a segmented control or select with `meds.callOptions`. Selections save to `state.medAnswers`. The header counts "2 of 5 confirmed".
4. **Timeline:** one chronological list (newest first) built from `raw`. The filter chips are the feed names. Default window: last 60 days, with a "Show all" link. Each item: date, a feed label pill (ADT / Claim / Pharmacy / Contact / Lab / Appt / Auth / Note / SDOH), a one-line title and a `SourceChip` to the record; where a received date exists, an amber "arrived N d later" (or "N h later") label.

   | table | date | title |
   |---|---|---|
   | adt | `eventDatetime` | `eventType — facility` · `dxOrReasonInAlert` · `disposition`; lag from `lagHrs` |
   | claims | `serviceDate` | `Claim: dxDescription (icd10)`; lag `lagDays` |
   | pharmacy | `fillOrRxDate` | `drug strengthSig — status` |
   | contacts | `contactDatetime` | `channel (direction): outcome` · `notes` |
   | labs | `collected` | `test result unit` (+ flag); lag `lagDays` |
   | appointments | `apptDate` (undated rows go in an "Not scheduled" group) | `providerSpecialty — type — status` |
   | auth | `requestDate` | `type: itemService — status` |
   | notes | `date` | `source (authorRole)` + first 90 characters of `noteText` |
   | sdoh | `date` | `domain: finding` |

Side column:

5. **Clocks**: `deadlines[]` sorted by due date: label, "today / tomorrow / in N d / N d ago", and kind (hard = orange text when ≤ 2 days).
6. **Data freshness** (`data-note="member-5"`): one row per `freshness[]` item: feed, `last` as an AgeBadge, and the state as a word plus a style (ok · partial · lag · late · conflict · missing) with `note` as muted text below. `missing` rows render as a dashed box with a **Request** button. Clicking it changes the row to "Requested 8:05 AM" and shows a toast "Request sent to Riverside General (demo)".
7. **People and permissions**: `careTeam[]` with the authorization state as a pill (authorized / not authorized / household). P4 adds a locked row from `restricted`: lock, "Substance-use history · 42 CFR Part 2 · Hidden — no consent on file", action "Ask for consent on the call".
8. **Social needs**: `sdoh[]` with AgeBadge. `stale` items get the tag "Re-ask on call"; `supersededBy` items are struck through, with "superseded by newer note".
9. **Labs**: compact list (test, value, flag word, trend in muted, chip; inferred badge where set).

---

## 10. Merge modal (Darnell, P3)

Title "Are these the same person?", with match score **0.93** and the label "needs your confirmation". Two columns (`merge.left` / `merge.right`), rows: name, DOB, PCP, phone, address, coverage, ED visits. Differences highlighted. Below, the evidence table (`merge.evidence`: field, verdict, why). Buttons: **Not the same person** · **Confirm merge** (primary).
- **Confirm:** set `state.merged = true`. The queue row's why-now becomes `merge.afterMerge.whyNow` and the ED count animates 3 → 7 in the queue row and member header. Unlock the `requiresMerge` summary text. The flag "Possible duplicate record" disappears. Toast "Merged M-20193 into M-20103 · reversible for 30 days" with **Undo**.
- **Reject:** set `merged = 'rejected'`; the flag becomes "Marked not a duplicate"; toast.

---

## 11. Screen 3: Outreach and documentation — `#/outreach/:id`

**Purpose:** reach the member through the path most likely to work, have the right conversation, and let the note write itself for Maria to review and sign.

Header strip: member name (serif), ClockChip, **Back to member**, and on the right the language note (P2: "Call in Spanish · interpreter line available").

Three columns: **Ways to reach** (320px) | **Call** (flexible) | **Note** (420px).

**Left — Ways to reach** (`data-note="outreach-1"`): cards from `contactPaths[]` sorted by rank.
- Status styles: `best` = blue border + "Best path"; `unconfirmed` = dashed border + "Unconfirmed — found by AI in [provenance]"; `limited` = grey + its `warning` text when present; `retired` = collapsed under "Retired (N)", struck through, with `lastOutcome` as the reason.
- Each card shows: label (mono for numbers), who, provenance, best time, last outcome, and action buttons from `actions` (`call` → selects this path for the call panel; `text` → SMS composer pre-filled with `textDraft` (P3) or a short neutral intro; `lookup` / `task` → toast).
- Every live card has a small **Log failed attempt** link. Two failures on a card → it retires automatically; toast "Retired after 2 failed attempts — won't be dialled again."
- P4 adds the locked Part 2 row at the bottom.

**Centre — Call:**
1. **Call goals** (`data-tour="call-goals"`, `data-note="outreach-2"`): `DraftTag` + checklist from `callGoals[]` (Spanish text stays as written). Goals tick themselves when the script covers them (`goal` index); Maria can tick them too.
2. **Call panel:** idle state shows a big **Start call · (555) 010-1101** for the selected path, with outcome buttons *No answer* · *Voicemail* · *Wrong number* · *Connected*.
   - **If `callScript` exists (P1, P4):** Start plays the script. A timer runs (mm:ss); lines appear one at a time every ~1.8 s as a transcript (speaker name in small caps; Maria's lines in `--ink-2`, member or caregiver lines in `--ink`); a muted caption "Simulated call · `callScriptNote`". When a line has `fills`, the matching note field on the right flashes and fills with origin **From this call — confirm**. When it has `confirmsPath`, that contact card switches to "Confirmed on call". Controls: **Pause**, **Skip to end**, **End call**. The call's minutes are added to `clockOffsetMin`.
   - **If no script:** *Connected* opens the note fields for manual entry; the other outcomes log an attempt (count it toward auto-retire) and show "Next best path: [next card]".
3. A muted footer card "**Where AI stops**" with three short lists from `WB.aiBoundary`.

**Right — Note** (`data-note="outreach-3"`):
- A progress bar "9 of 14 ready · 3 need you" (ready = record fields + confirmed call fields + non-empty Maria fields).
- Fields grouped by `section`. Each field shows its label, a value (inline-editable) and an **origin tag**:
  - `record` → blue tag "From record" + `SourceChip` (+ `InferredBadge` if inferred);
  - `call` (or filled by the script) → orange tag "From this call" + a **Confirm** button (confirmed = check + "Confirmed");
  - `empty` → muted "Waiting for the call";
  - `maria` → a highlighted empty textarea "For you: your clinical judgment". Next to it, a small link **Use demo text** inserts "[Demo] Written by Maria after the call." Never generate clinical judgment.
- **Draft note preview** (collapsible, `DraftTag`): a short paragraph assembled from the field values, in the order of the sections.
- **Review and sign** (`data-tour="sign"`): disabled until every call-origin field is confirmed and every `maria` field is non-empty; the disabled tooltip says what's missing. It opens a modal with three checklists:
  1. **Changes to the member record**: `recordChanges[]` plus any contact path confirmed on the call;
  2. **Tasks to create**: `tasksAfterCall[]` (title, due date, owner);
  3. **Note**: the preview.

  Buttons **Back** · **Sign and file**. On sign: save `signed[pid]` with the demo time, add the checked tasks to `state.tasks`, toast "Signed 8:42 AM · filed to case · 7 tasks created", and route to `#/queue` with the next member highlighted for 2 s.

**Tasks screen** (`#/tasks`): tasks grouped *Today* / *Tomorrow* / *This week* / *Later* by due date relative to asOf; checkbox to complete; member name links to the member view; the owner as a pill. Empty state: "No tasks yet. Sign a note to create some."

---

## 12. Guided tour and keyboard — `js/tour.js`

- **Tour:** steps from `WB.tour[]`. Each step navigates to `route`, waits for render, and spotlights `[data-tour=target]` (dark scrim with a cut-out via box-shadow, plus a card placed beside it: step title, text, "3 / 8", **Back** · **Next** · **End tour**). If a target is missing, centre the card. Start from the welcome modal or the top-bar **Tour** button.
- **Keyboard:** `j`/`k` move a focus ring through queue rows; `Enter` opens the member; `o` opens outreach for the focused or current member; `n` toggles design notes; `g q` goes to the queue; `?` shows a shortcuts modal. Ignore keys while typing in inputs.
- **Reset demo** (top bar): confirm dialog → clear `localStorage` key → reload → welcome modal.

---

## 13. Copy and tone

Short, plain and clinical. Dates like `Mon 9 Nov`; times like `8:00 AM`; phone numbers in mono. Sentence case everywhere. No "AI-powered", no exclamation marks, no emoji, no stock illustrations. Empty states say what to do next. The demo should read like a tool built by people who have sat next to nurses.

---

## 14. Build phases and acceptance checks

**Phase 1 — shell + Screen 1** (`index.html`, `css/styles.css`, `js/core.js`, `js/queue.js`; stub `member.js`, `outreach.js`, `tour.js` as one-line files that register empty screens)
- Opening `index.html` shows the welcome modal with Maria's persona; "Explore" closes it.
- The queue shows Walter, Tanya, Eleanor, Darnell, Carlos in that order, with scores 4.85 / 3.85 / 3.65 / 2.95 / 2.90.
- The score popover shows the factor bars. Moving a weight slider re-sorts rows with animation. Reset weights works.
- Dragging a row asks for a reason; the reason appears in the override log.
- Filter chips, day-plan strip, ⋯ menu, "N sources" → Evidence drawer with clickable chips → raw record table.
- The design-notes toggle shows markers 1–4 and the notes panel. State survives a reload; Reset clears it.

**Phase 2 — Screen 2 + merge** (`js/member.js`)
- All 5 members render without errors. Walter shows the inferred badge, 2 conflicts and 1 blocked med, and the missing discharge summary with a Request button.
- Carlos shows the language conflict. Tanya shows the locked Part 2 row and the superseded housing item.
- Every source chip opens the right raw record; imperfection notes show where `impRef` exists.
- The timeline lists the raw records with lag labels; the filters work.
- Darnell: the merge modal works from the header and from the queue; Confirm updates the queue and the member view; Undo restores.

**Phase 3 — Screen 3 + tasks + tour** (`js/outreach.js`, `js/tour.js`)
- Walter: the scripted call plays, fills the note fields and ticks goals. Confirming fields and filling the "For you" fields enables sign; signing creates the tasks and marks the queue row done.
- Tanya: the call confirms the friend's phone path. Retired paths are collapsed.
- Carlos, Eleanor, Darnell: manual outcome logging; auto-retire after 2 failures; Darnell's text composer is pre-filled.
- The tour runs all 8 steps across routes; keyboard shortcuts work; the tasks screen groups by due date.

**Phase 4 — polish (only if quota remains):** check at 1280 px, focus states, empty states, consistent spacing, and that every coloured state has a word.

---

## 15. The 3-minute demo the evaluator should have

1. Welcome: "You are Maria." Take the tour or explore.
2. Queue: Walter is first; hover the score; nudge the deadline weight and watch Tanya move; drag a row and give a reason.
3. Walter's member view: read "Since last touch" with receipts; click a chip to see the raw pharmacy record and the planted imperfection; see the conflicts and the missing discharge summary.
4. Outreach: start the call; watch Joan's answers fill the note; confirm; write the judgment; sign; 7 tasks appear; Walter shows "Done".
5. Back in the queue: Darnell. Confirm the merge, watch 3 become 7 ED visits, then text the number the ED had.
6. Toggle design notes on any screen to see why each element sits where it does.
