# Plot Twist case desk

The JSON files in this folder are the editable source of truth for every mystery. `js/data.js` is generated from them so the game can still run directly from `index.html` without a server or build step.

## Add one case

1. Copy `_template.json` to a descriptive file such as `case-029-painted-door.json`.
2. Give it the next uninterrupted `caseNumber`, a unique lowercase slug `id`, and the intended Monday `releaseDate` in `YYYY-MM-DD` format.
3. Write one fair solution with exactly three suspects, three methods, five progressive clues, two hints, and three proof points.
4. From the repository root, run:

   ```sh
   npm run cases:build
   npm run verify
   ```

5. Play the case from the archive and confirm that the first two clues invite deduction without giving away the complete answer.

Do not edit `js/data.js` by hand. `npm run cases:check` fails whenever that generated bundle is stale or any source file breaks the case schema.

## Weekly automation

A safe weekly release should be a draft-and-review workflow:

1. A scheduled task creates one new JSON case from `_template.json` with the following Monday as its `releaseDate`.
2. It runs `npm run cases:build` and `npm run verify`.
3. It opens the new archive case for a visual smoke test.
4. A person checks the deduction for fairness, tone, and originality before publishing.

The game ignores a future-dated case until release day, then makes it that day's dossier. This prevents an early deployment from changing the case that players are already solving. The automated checks reject duplicate IDs, titles, or case numbers; gaps in numbering; invalid release dates; missing copy; unsupported difficulty labels; incorrect clue counts; and solutions that point outside the listed suspects or methods. Human review remains important because a structurally valid mystery can still be too obvious, ambiguous, or simply not fun.

## Editorial checklist

- One culprit and one method must explain every decisive clue.
- The solution cannot depend on information revealed only in the explanation.
- Each wrong method should remain plausible until evidence rules it out.
- Clues should progress from scene-setting to contradiction to decisive reconstruction.
- Suspects need credible access and motives without relying on stereotypes.
- Keep the incident non-graphic, family-safe, and solvable in a few minutes.
- Read every suspect statement and explanation aloud once; concise cases play better.
