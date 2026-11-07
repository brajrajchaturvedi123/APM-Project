# Care Management Workbench — HiLabs APM case (2026–27)

A clickable demo of a case-management workbench for health-plan nurse case managers.
It tells the nurse who needs her first and why, shows one picture of the member she can trust,
and drafts the paperwork for her to sign.

**Open `index.html` in a browser.** It is one self-contained file with no build step or server.
It also works on GitHub Pages (Settings → Pages → deploy from the `main` branch, root folder).

## What to try
1. **Today queue**: five members ranked by clinical acuity, deadline, preventable event and reachability. Hover a score; change the weights in *How ranking works*; drag a row (you're asked why).
2. **Member view (Walter)**: every fact carries a source chip that opens the raw record, conflicts sit side by side, inferred facts are labelled, and missing data has a *Request* button.
3. **Outreach (Walter or Tanya)**: play the scripted call, watch the note fill in, confirm, add your assessment, then sign. Tasks are created.
4. **Darnell**: confirm the duplicate-record merge; 3 ED visits become 7.
5. **Design notes** (top bar or `N`): why each element sits where it does.

## Repository layout
| Path | What it is |
|---|---|
| `index.html` | The demo (CSS, JS and data inlined) |
| `src/` | The same code as separate files: `styles.css`, `app1.js` (core + queue), `app2.js` (member, outreach, tasks, tour), `data.js` (synthetic patients) |
| `docs/WORKBENCH_SPEC.md` | Product and interaction spec the demo implements |
| `docs/PROMPTS.md` | Phase-by-phase build prompts |

## Data
All people, member IDs, phone numbers (555-01xx), facilities and the plan are **fictional**; no real PHI.
`data.js` holds the 5 synthetic patients across 11 datasets (185 records, 22 planted data imperfections) from the case annex.
The two scripted calls (Walter, Tanya) are illustrative dialogue and are not part of the annex.
