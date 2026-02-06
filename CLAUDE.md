# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal Trips Explorer — a static, single-page web app that visualizes travel trip data on an interactive map, zoomable timeline, and collapsible sidebar. No build system, bundler, or package manager; open `index.html` directly in a browser or serve it with any static file server.

## Running Locally

```
# Any static server works, e.g.:
python -m http.server 8000
# Then open http://localhost:8000
```

There are no build, lint, or test commands.

## Architecture

The entire app is three files plus one SVG asset:

- **index.html** — Shell with header, timeline bar, sidebar, map container, photo overlay, and CDN script/style tags.
- **script.js** — All application logic in a single file (no modules).
- **styles.css** — All styling.
- **icon-arrow-accordion.svg** — Accordion toggle arrow used in the sidebar.

### Data Flow

1. **CSV fetch** — On load, PapaParse fetches a published Google Sheets CSV (hardcoded URL in `script.js`). Each row becomes a trip event with date, lat/lng, summary, description, review, rating, photos, and event type.
2. **Initialization** — After parsing, three subsystems initialize in order: `initTimeline()`, `initSidebar()`, `initMap()`, then `fitMapToBounds()`.
3. **Cross-view linking** — `focusTrip(id)` highlights a sidebar event, pans/zooms the map, and opens the marker popup.

### Key Subsystems

- **Timeline** (`initTimeline`): D3.js renders a zoomable SVG timeline. Events are grouped into 5 color-coded rows by category (Travel/Hotel/Food/Sights/Walk). Font Awesome unicode glyphs render as SVG text elements. D3 zoom handles pan/zoom with adaptive tick granularity.
- **Map** (`initMap`): Leaflet with Esri World Topo tiles. Markers use `Leaflet.awesome-markers` with Font Awesome icons, clustered via `leaflet.markercluster`. Hover opens popup; click calls `focusTrip`.
- **Sidebar** (`initSidebar`): D3-built collapsible hierarchy: Year > Day > Events. Each event shows an icon, summary, and optional photo carousel. Photos are Google Drive links converted to thumbnails via `convertGoogleDriveUrl`.
- **Photo Overlay**: Full-screen lightbox with prev/next navigation. Uses Google Drive thumbnail URLs at 800px width.

### Event Type System

Event types (`iconMapping`, `colorMapping`, `rows` at top of `script.js`) define the icon, marker color, and timeline row for each category. To add a new event type, update all three mappings plus `unicodeByIcon`.

### External Dependencies (all CDN)

Leaflet 1.7.1, leaflet.markercluster 1.5.3, Leaflet.awesome-markers 2.0.2, D3.js v7, PapaParse 5.3.0, Font Awesome 5.15.4, heic2any 0.0.3, Google Fonts (PT Sans Narrow).

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
