# Atlas 3D

**Transform any 2D map into an explorable 3D world.**

Atlas 3D is a local-first creative tool. Drop in a satellite image, blueprint, floor plan or
hand-drawn map — the app analyzes it in your browser, builds terrain, streets, architecture and
atmosphere around it, and hands you the camera plus an AI co-designer. No accounts, no cloud, no
external database: everything lives in IndexedDB and localStorage on your machine.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

Optional — full natural-language control via a local model:

```bash
ollama run kimi-k2.6:cloud
```

Without Ollama, a built-in offline interpreter still handles the common commands
(“sunset lighting”, “make it mountainous with rivers”, “japanese architecture”,
“make all roads 25% wider”, “how many buildings are there?” …). The endpoint and model
are configurable in **Settings**.

## What's inside

- **Studio workspace** — resizable/collapsible panels, command palette (`Ctrl K`),
  full keyboard shortcut map (`?`), dark & light themes, autosave, undo/redo timeline.
- **Viewport** — orbit / walk (WASD + gravity + jump) / fly cameras, cinematic fly-through,
  infinite grid, orientation gizmo, camera bookmarks, fullscreen, screenshot export,
  FPS/draw-call/triangle monitoring with automatic quality degradation.
- **Procedural engine** — seeded simplex/ridged heightfields, river carving, six terrain styles,
  grid/radial/organic road networks, six architectural styles with emissive night windows,
  instanced vegetation, water, fog, weather particles (rain/snow/fireflies/embers).
- **Map analysis** — uploaded images are downsampled and classified (water / vegetation /
  roads / buildings) in a Web Worker, then guide the generator.
- **AI assistant** — streams from local Ollama with a structured command protocol
  (` ```atlas ` JSON blocks), prompt history, favorites, and 19 curated templates.
- **Minimap** — live top-down render with the camera frustum; click to teleport.
- **Export** — GLB, OBJ (instancing baked out), PNG stills, and portable `.atlas3d`
  project files that rebuild the identical world on another desktop.

## Architecture

```
src/
  app/            Next.js App Router pages (landing, /studio)
  components/     ui primitives · landing · workspace panels
  three/          R3F scene: terrain, buildings, roads, vegetation, sky, cameras
  lib/            noise, rng, worldgen pipeline, event bus, minimap renderer
  services/       IndexedDB, Ollama client, offline interpreter, exporters, share
  stores/         Zustand: project (undo/redo), UI layout, chat
  hooks/          shortcuts, autosave
  workers/        map classification worker
  config/         design constants, presets, templates, action registry
  types/          strict shared types
```

World state is a small serializable description; the heavy `GeneratedWorld` is derived
deterministically from it (and cached), so undo, autosave, sharing and thumbnails all
operate on kilobytes.

## Scripts

| Command          | Purpose                       |
| ---------------- | ----------------------------- |
| `npm run dev`    | Development server            |
| `npm run build`  | Production build (type-safe)  |
| `npm run start`  | Serve the production build    |
| `npm run lint`   | ESLint                        |
| `npm run format` | Prettier                      |
