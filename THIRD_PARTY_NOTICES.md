# Third-party materials

## Phone model

Smartphone — smallbigsquare. License: CC0.

- Source: https://poly.pizza/m/4DRZmTs3jq
- Download: https://static.poly.pizza/68a8586b-e540-431c-b42e-e3c6bc691e11.glb
- Local copy: `frontend/src/assets/phone.glb`

The downloaded model is unmodified. Its orientation and a live screen overlay are applied at runtime.

## Montserrat

Copyright 2024 The Montserrat.Git Project Authors. Licensed under the SIL Open Font License, Version 1.1.

- Font: `frontend/src/assets/fonts/Montserrat-Variable.ttf`
- Full license: `frontend/src/assets/fonts/OFL-Montserrat.txt`

## shadcn/ui

Dashboard components in `frontend/src/components/ui` were installed from the official shadcn/ui registry and adapted for WABuddy. Licensed under MIT; the upstream license is included in `frontend/src/components/ui/LICENSE.md`.

## Three.js

MIT License

Copyright © 2010-2025 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

Other dependencies retain their licenses in their installed distributions. Versions are recorded in `package-lock.json`, `requirements.lock.txt` and `pyproject.toml`.


## Workspace design references (October 2026)

The non-WhatsApp workspace adapts existing interface patterns, with WABuddy-specific
content and styling. It is a local UI preview; no agent execution is implied.

- **shadcn/ui and Sat Naing's shadcn-admin**: dashboard panels, navigation,
  chat-list/conversation composition, task-table toolbar and profile patterns.
  https://github.com/satnaing/shadcn-admin (MIT, Copyright 2024 Sat Naing).
  Reference files: `src/features/dashboard/index.tsx`,
  `src/features/dashboard/components/overview.tsx` (dashboard composition and
  bar chart adapted from the locally inspected clone),
  `src/features/chats/index.tsx`, `src/features/tasks/index.tsx`.
  License retained in `frontend/src/components/ui/shadcn-admin-LICENSE.txt`.
- **React Flow / xyflow**: the actual canvas engine, dotted Background, Controls,
  draggable/selectable nodes, Handles and animated smooth-step edges are reused
  from `@xyflow/react`, not a hand-drawn canvas implementation.
  https://github.com/xyflow/xyflow (MIT).
  `frontend/src/components/ui/base-node.tsx` is imported from the official registry:
  https://ui.reactflow.dev/registry/base-node.json
  https://reactflow.dev/ui/components/base-node
  License retained in `frontend/src/components/ui/xyflow-LICENSE.txt`.
- **Langflow**: white dotted editor, connected role cards and adjacent inspector
  as visual reference. The active board in `core-workspace.tsx` reuses React Flow
  Background, Controls, Handles and the official BaseNode component.
  Locally inspected reference: `src/frontend/src/pages/FlowPage/components/
  PageComponent/MemoizedComponents.tsx` in the Langflow clone.
  No Langflow runtime or branding is included.
  https://github.com/langflow-ai/langflow
  https://docs.langflow.org/concepts-overview
- **Sim**: workflow / inspector / run-history organization as a conceptual reference.
  https://github.com/simstudioai/sim
- **Recharts**: BarChart, PieChart, Tooltip and responsive chart primitives.
  https://github.com/recharts/recharts (MIT; license in installed dependency).
- **User-supplied EventForge and NexaOps images**: coordinator / agent / plan layout
  and library / document / assistant layout references respectively. The images
  themselves are not redistributed in the application.

React Flow attribution is retained on the canvas. Third-party component licenses
remain applicable. UI mock results and report downloads are explicitly sample data.


## Conversational UI components

- **Prompt Kit** by ibelick: `prompt-input.tsx` (adapted to the existing button and
  native textarea) and `text-shimmer.tsx`, copied from
  https://github.com/ibelick/prompt-kit/tree/main/components/prompt-kit.
  Upstream package declares MIT. Source attribution is retained in each file.
- **ElevenLabs UI**: `matrix.tsx`, `voice-button.tsx`, and `live-waveform.tsx`
  copied from https://github.com/elevenlabs/ui/tree/main/apps/www/registry/elevenlabs-ui/ui.
  Imports are adapted to local components. The Matrix uses upstream pulse/loader
  frame sequences, rendered as SVG. MIT license and copyright notice retained in
  `frontend/src/components/ui/elevenlabs-LICENSE.txt`.
- **assistant-ui**: conversation and tool-approval organization reviewed as a UX
  reference: https://github.com/assistant-ui/assistant-ui. No runtime copied.

The local conversation is explicitly a UI preview. Browser speech recognition
provides optional dictation, not an AI voice agent. Attachments display names only.

### Prompt Kit MIT permission notice

Source: ibelick/prompt-kit; MIT declared in upstream package.json.
Attribution: ibelick and Prompt Kit contributors.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


## Chat and agent motion (October 2026)

- **Magic UI**: `border-beam.tsx` and `shine-border.tsx` copied from
  `apps/www/registry/magicui` in https://github.com/magicuidesign/magicui.
  MIT license retained in `frontend/src/components/ui/magicui-LICENSE.txt`.
  WABuddy supplies green colors, scoped shine keyframes, and reduced-motion guards.
- **React Flow animated SVG edges**: `HandoffEdge` adapts the documented BaseEdge /
  animateMotion pattern to smooth-step paths, with packets enabled only for active
  handoffs. https://reactflow.dev/examples/edges/animating-edges
  Existing xyflow MIT license is retained. Replay is display-only.
- **Uiverse / Galaxy** was reviewed for loaders and microinteractions:
  https://github.com/uiverse-io/galaxy and https://uiverse.io/loaders.
  No Uiverse source is included in this change.


## Ambient background, scroll reveals, and activity chart

- Magic UI `particles.tsx` and `blur-fade.tsx` copied from the official registry
  (MIT; existing magicui-LICENSE.txt). Adaptations cap canvas pixel ratio, avoid
  duplicate particle initialization, and respect reduced motion. Particle drawing
  unmounts while the document is hidden and on the WhatsApp page.
- Dashboard chart adapted from shadcn/ui `chart-area-interactive`:
  https://ui.shadcn.com/r/styles/new-york-v4/chart-area-interactive.json
  Gradient areas, grid, range selection and tooltip composition retained;
  WABuddy uses its existing fictional dashboard-data series, a bar view and a
  handling breakdown. Existing shadcn MIT license applies.
- Popup structure remains shadcn/ui + Radix Dialog (focus trap, Escape and portal).
  WABuddy styles backdrop blur, layering, surface, header, and close control.

### React Bits Dot Grid
- Source: https://github.com/DavidHDev/react-bits/tree/main/src/ts-default/Backgrounds/DotGrid
- Component: DotGrid.tsx and DotGrid.css copied without animation-engine changes; configured through public props for the WABuddy backdrop.
- License: MIT + Commons Clause, retained in frontend/src/components/ui/react-bits-LICENSE.md. Used as part of this application.
- Replaces the prior Magic UI drifting particles in the workspace.

### Additional dashboard and dialog components
- Magic UI NumberTicker: https://magicui.design/docs/components/number-ticker — upstream component with reduced-motion support; MIT notice retained.
- Magic UI ShineBorder reused on Buddy action buttons with a multicolor palette.
- Inbox chart adapted from shadcn/ui chart-bar-label-custom: https://ui.shadcn.com/r/styles/new-york-v4/chart-bar-label-custom.json (MIT).
- Dashboard composes shadcn cards/charts, Magic UI BlurFade/NumberTicker and the existing ElevenLabs Matrix.
- Dialog entrance/exit follows https://www.radix-ui.com/primitives/docs/guides/animation and shadcn zoom/fade transitions. Parent remains mounted for the exit phase.

### Bloub / Grok-style SVG avatar
- https://github.com/jeremy-prt/bloub (MIT, Jérémy Perret).
- Framework-free src/bot engine copied to frontend/src/vendor/bloub without animation changes. LICENSE retained there.
- React SVG renderer adapted from BloubBot.vue; WABuddy green palette. Existing idle/thinking/orbit/wide/notify/wink states map to UI states. Unofficial recreation; no x.ai affiliation.

### Attachments and additional dashboard motion
- react-dropzone: https://github.com/react-dropzone/react-dropzone (MIT), local file selection/drag-drop; no uploads are performed by this preview.
- lottie-web: https://github.com/airbnb/lottie-web (MIT), loaded lazily for the drop overlay.
- Sparkles animation: Google Animated Noto Emoji, CC BY 4.0, unchanged artwork. Source https://fonts.gstatic.com/s/e/notoemoji/latest/2728/lottie.json ; collection https://googlefonts.github.io/noto-emoji-animation/ ; license https://creativecommons.org/licenses/by/4.0/ . The animated artwork is used in the attachment overlay.
- Upload composition reference: https://ui.aceternity.com/components/file-upload (file-card and drag-zone pattern); interaction animation uses the existing Motion/Magic UI spring pattern.
- Magic UI AnimatedBeam and AnimatedList copied from official registry; AnimatedList receives reduced-motion support. Bento layout references https://magicui.design/docs/components/bento-grid . MIT notice retained in components/ui/magicui-LICENSE.txt.
- Empty composer layout references the user-supplied Lovable screenshot; existing Prompt Kit composer retained.
