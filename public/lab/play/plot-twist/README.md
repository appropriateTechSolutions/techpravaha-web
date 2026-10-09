# Plot Twist

Plot Twist is a dependency-free, one-minute daily mystery game. Open a case file, reveal only the evidence you need, identify the culprit and method, then share a spoiler-free result.

## Play it

The app uses classic browser scripts, so it works when `index.html` is opened directly from the filesystem. Double-click `index.html`, or drag it into a browser.

For local HTTP serving, run this from the `plot-twist` folder:

```sh
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

No install, build step, network request, external font, or third-party dependency is required.

## Included

- Twenty-eight handcrafted cases with suspects, methods, progressive clues, hints, and full explanations
- Deterministic daily rotation from a fixed date epoch
- Timer and score model with speed bonus plus clue, hint, and incorrect-verdict costs
- Local best scores, solve history, and daily streaks using `localStorage`
- Archive practice mode and full case replay
- Spoiler-free result copy with Clipboard API and legacy/manual fallbacks
- Responsive keyboard-accessible interface with visible focus and reduced-motion support

## Test it

The reusable case/score/date/share logic is covered with Node's built-in test runner:

```sh
node --test tests/game.test.cjs
```

You can also syntax-check every script without installing anything:

```sh
node --check js/data.js
node --check js/game.js
node --check js/app.js
```

## Add a weekly case

Case source files live in `cases/`; `js/data.js` is a generated browser bundle. Start from `cases/_template.json`, then run these commands from the repository root:

```sh
npm run cases:build
npm run verify
```

The builder validates the full collection before updating the bundle. See [`cases/README.md`](cases/README.md) for the editorial checklist and recommended human-reviewed weekly automation.

## Project map

```text
plot-twist/
├── cases/              Editable JSON case files and authoring guide
├── index.html          Semantic game shell and archive dialog
├── scripts/
│   └── build-cases.cjs Validates sources and generates the browser bundle
├── styles.css          Analog noir case-file design system
├── js/
│   ├── app.js          UI state, persistence, timer, and interactions
│   ├── data.js         Generated case bundle
│   └── game.js         Pure reusable game logic
└── tests/
    └── game.test.cjs   Node tests for data and game logic
```

Solve history is private to the current browser and can be cleared by removing the `plot-twist-history-v1` local-storage entry.
