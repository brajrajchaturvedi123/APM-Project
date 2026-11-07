# Antigravity: setup and the exact messages to paste

## Setup (2 minutes)
1. Make an empty folder, e.g. `workbench-demo/`, and put **`WORKBENCH_SPEC.md`** and **`data.js`** in it.
2. In Antigravity, use **Open Folder** on that folder.
3. Agent settings: **Planning** mode for Phases 1–3 (Fast mode tends to cut corners on multi-file work); **Fast** mode for Phase 4 and bug fixes. Use the strongest model you have quota for in Phase 1. The design system and core helpers are set there, and every later phase builds on them.
4. **Start a new conversation for each phase.** The spec file is the memory, so each phase starts small instead of dragging the whole previous chat along. That's the biggest quota saver after the pre-built data.
5. To check a phase, double-click `index.html` and open it in Chrome. Nothing to install.

---

## Phase 1: shell + work queue  (new conversation, Planning mode)

```
You are building a clickable demo of a healthcare product. Everything you need is in this folder.

1. Read WORKBENCH_SPEC.md in full.
2. Read ONLY lines 1–54 of data.js (the schema). Do not open line 55; it is one huge line of data.
3. Build PHASE 1 exactly as section 14 describes: index.html, css/styles.css, js/core.js, js/queue.js, plus one-line stubs for js/member.js, js/outreach.js, js/tour.js.

Rules (from section 0): vanilla HTML/CSS/JS only, classic <script> tags, must work from file:// with no server, no npm, no frameworks. Never edit data.js. Never invent member data; read it from window.WB. Implementation plan: 10 bullets max. Do not open the browser to test. Do not paste code into chat. Final message: 5 lines max (files written, what to click, known gaps).

Put real care into core.js and styles.css: the design tokens and shared components (SourceChip, AgeBadge, ClockChip, StatusPill, InferredBadge, DraftTag, Flag, Drawer, Modal, Toast, Evidence drawer) are reused by every later phase.
```

---

## Phase 2: member view + merge  (new conversation, Planning mode)

```
Continue the demo in this folder. Phase 1 is done.

1. Read WORKBENCH_SPEC.md sections 0, 3, 4, 5, 6, 9, 10 and 14.
2. Read ONLY lines 1–54 of data.js.
3. Skim js/core.js just enough to reuse its helpers and components. Do not rewrite it.
4. Build PHASE 2: write js/member.js (Screen 2 + the merge modal). If queue.js or core.js need small changes for the merge state, make minimal edits only.

Same rules as before: vanilla JS, no browser testing, plan of 10 bullets or fewer, final message of 5 lines or fewer, never invent member data.
```

---

## Phase 3: outreach, sign, tasks, tour  (new conversation, Planning mode)

```
Continue the demo in this folder. Phases 1 and 2 are done.

1. Read WORKBENCH_SPEC.md sections 0, 4, 5, 6, 11, 12, 13 and 14.
2. Read ONLY lines 1–54 of data.js.
3. Skim js/core.js for its helpers and state shape. Do not rewrite existing files.
4. Build PHASE 3: write js/outreach.js (Screen 3, the sign flow and the Tasks screen) and js/tour.js (guided tour, keyboard shortcuts, Reset). Make minimal edits elsewhere only if needed, e.g. marking queue rows done after signing.

Same rules: vanilla JS, no browser testing, plan of 10 bullets or fewer, final message of 5 lines or fewer, never invent member data. Scripted calls exist only for P1 and P4; never generate clinical judgment text.
```

---

## Phase 4: polish  (only if quota remains; Fast mode)

```
Polish pass on the demo in this folder (WORKBENCH_SPEC.md section 14, Phase 4). Check the layout at 1280px wide, visible focus states, empty states, consistent spacing, and that every coloured state also has a word. Smallest edits possible; no refactors; no new features. Final message of 5 lines or fewer.
```

---

## Bug fix template  (Fast mode, same or new conversation)

```
Bug in the demo: I clicked [exactly what] on [which screen / member] → [what happened] → expected [what should happen].
Fix it with the smallest possible edit. Don't refactor, don't touch other features, don't open the browser. One-line summary when done.
```

## If the quota runs out mid-phase  (new conversation later)

```
New session; the demo files already exist in this folder. Read WORKBENCH_SPEC.md sections 0 and 14 and list the js/ folder. Phase [N] was interrupted. What works: [ … ]. What's missing: [ … ].
Finish only the missing parts of Phase [N], editing existing files in place. Plan of 10 bullets or fewer; final message of 5 lines or fewer.
```

---

## Sharing it with HiLabs
It's a static folder, so any static host works. The quickest is Netlify Drop (drag the folder onto app.netlify.com/drop, get a public link). GitHub Pages works too. Put the link on the deck's design slides: "Click through the working demo: [link]".
