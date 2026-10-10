(function attachPlotTwistCore(root, factory) {
  const core = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = core;
  }

  root.PlotTwistCore = core;
})(typeof globalThis !== "undefined" ? globalThis : this, function createPlotTwistCore() {
  "use strict";

  const DAY_MS = 24 * 60 * 60 * 1000;
  const ROTATION_EPOCH = "2026-01-01";

  function pad(value, length) {
    return String(value).padStart(length, "0");
  }

  function toDateKey(input) {
    const date = input instanceof Date ? input : new Date(input || Date.now());

    if (Number.isNaN(date.getTime())) {
      throw new TypeError("A valid date is required.");
    }

    return `${date.getFullYear()}-${pad(date.getMonth() + 1, 2)}-${pad(date.getDate(), 2)}`;
  }

  function dateKeyToUtc(dateKey) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      throw new TypeError(`Invalid date key: ${dateKey}`);
    }

    const [year, month, day] = dateKey.split("-").map(Number);
    const value = Date.UTC(year, month - 1, day);
    const check = new Date(value);

    if (
      check.getUTCFullYear() !== year ||
      check.getUTCMonth() !== month - 1 ||
      check.getUTCDate() !== day
    ) {
      throw new TypeError(`Invalid calendar date: ${dateKey}`);
    }

    return value;
  }

  function daysBetween(firstKey, secondKey) {
    return Math.round((dateKeyToUtc(secondKey) - dateKeyToUtc(firstKey)) / DAY_MS);
  }

  function dailyCaseIndex(dateInput, caseCount) {
    if (!Number.isInteger(caseCount) || caseCount < 1) {
      throw new RangeError("caseCount must be a positive integer.");
    }

    const key = typeof dateInput === "string" ? dateInput : toDateKey(dateInput);
    const offset = daysBetween(ROTATION_EPOCH, key);
    return ((offset % caseCount) + caseCount) % caseCount;
  }

  function getReleasedCases(cases, dateInput) {
    if (!Array.isArray(cases) || cases.length === 0) {
      throw new TypeError("At least one case is required.");
    }

    const dateKey = typeof dateInput === "string" ? dateInput : toDateKey(dateInput || new Date());
    dateKeyToUtc(dateKey);
    return cases.filter((caseFile) => !caseFile.releaseDate || caseFile.releaseDate <= dateKey);
  }

  function getDailyCase(cases, dateInput) {
    const dateKey = typeof dateInput === "string" ? dateInput : toDateKey(dateInput || new Date());
    const releasedCases = getReleasedCases(cases, dateKey);

    if (releasedCases.length === 0) {
      throw new RangeError(`No case is available on ${dateKey}.`);
    }

    const releasedToday = releasedCases.filter((caseFile) => caseFile.releaseDate === dateKey);
    if (releasedToday.length > 0) {
      return releasedToday.reduce((latest, caseFile) => (
        caseFile.caseNumber > latest.caseNumber ? caseFile : latest
      ));
    }

    return releasedCases[dailyCaseIndex(dateKey, releasedCases.length)];
  }

  function formatCaseNumber(value) {
    return `CASE ${pad(value, 3)}`;
  }

  function formatTimer(totalSeconds) {
    const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${pad(minutes, 2)}:${pad(seconds, 2)}`;
  }

  function calculateScore(round) {
    const elapsedSeconds = Math.max(0, Math.floor(Number(round.elapsedSeconds) || 0));
    const revealedClues = Math.max(0, Math.floor(Number(round.revealedClues) || 0));
    const hintsUsed = Math.max(0, Math.floor(Number(round.hintsUsed) || 0));
    const wrongAttempts = Math.max(0, Math.floor(Number(round.wrongAttempts) || 0));
    const solved = round.solved !== false;

    if (!solved) {
      return {
        score: 0,
        base: 1000,
        speedBonus: 0,
        timePenalty: 0,
        cluePenalty: 0,
        hintPenalty: 0,
        mistakePenalty: 0
      };
    }

    const speedBonus = elapsedSeconds <= 60 ? 75 : elapsedSeconds <= 90 ? 35 : 0;
    const timePenalty = Math.min(elapsedSeconds, 240) * 2;
    const cluePenalty = Math.max(0, revealedClues - 2) * 40;
    const hintPenalty = hintsUsed * 150;
    const mistakePenalty = wrongAttempts * 100;
    const score = Math.max(
      100,
      1000 + speedBonus - timePenalty - cluePenalty - hintPenalty - mistakePenalty
    );

    return {
      score,
      base: 1000,
      speedBonus,
      timePenalty,
      cluePenalty,
      hintPenalty,
      mistakePenalty
    };
  }

  function scoreRank(score) {
    if (score >= 900) return { label: "Master Sleuth", stamp: "EXCEPTIONAL" };
    if (score >= 725) return { label: "Sharp Eye", stamp: "SOLVED CLEAN" };
    if (score >= 525) return { label: "Case Closer", stamp: "CASE CLOSED" };
    return { label: "Persistent Gumshoe", stamp: "TRUTH FOUND" };
  }

  function computeStreak(dateKeys, referenceDateKey) {
    const dates = Array.from(new Set((dateKeys || []).filter(Boolean))).sort();

    if (dates.length === 0) {
      return { current: 0, best: 0 };
    }

    let best = 1;
    let run = 1;

    for (let index = 1; index < dates.length; index += 1) {
      if (daysBetween(dates[index - 1], dates[index]) === 1) {
        run += 1;
        best = Math.max(best, run);
      } else {
        run = 1;
      }
    }

    const reference = referenceDateKey || toDateKey(new Date());
    const latest = dates[dates.length - 1];
    const age = daysBetween(latest, reference);
    let current = age === 0 || age === 1 ? 1 : 0;

    if (current > 0) {
      for (let index = dates.length - 1; index > 0; index -= 1) {
        if (daysBetween(dates[index - 1], dates[index]) !== 1) break;
        current += 1;
      }
    }

    return { current, best };
  }

  function summarizeCaseHistory(cases, caseHistory) {
    const activeIds = new Set((Array.isArray(cases) ? cases : []).map((caseFile) => caseFile && caseFile.id));
    const records = caseHistory && typeof caseHistory === "object" ? caseHistory : {};
    const solvedEntries = Object.entries(records)
      .filter(([caseId, entry]) => activeIds.has(caseId) && entry && entry.solved)
      .map(([, entry]) => entry);

    return {
      solvedCount: solvedEntries.length,
      bestScore: solvedEntries.reduce((best, entry) => Math.max(best, Number(entry.bestScore) || 0), 0)
    };
  }

  function createShareText(result) {
    const total = Math.max(1, Math.floor(Number(result.totalClues) || 5));
    const revealed = Math.min(total, Math.max(0, Math.floor(Number(result.revealedClues) || 0)));
    const clueGrid = Array.from({ length: total }, (_, index) => index < revealed ? "🟥" : "⬜").join("");
    const hints = Math.max(0, Math.floor(Number(result.hintsUsed) || 0));
    const attempts = Math.max(1, Math.floor(Number(result.attempts) || 1));
    const streak = Math.max(0, Math.floor(Number(result.streak) || 0));
    const lines = [
      `PLOT TWIST · ${formatCaseNumber(result.caseNumber)}`,
      `${formatTimer(result.elapsedSeconds)} · ${Math.max(0, Math.floor(Number(result.score) || 0))} pts`,
      clueGrid,
      `🎯 ${attempts}  ·  💡 ${hints}  ·  🔥 ${streak}`
    ];

    if (result.url) lines.push(String(result.url));
    return lines.join("\n");
  }

  function validateCaseData(cases) {
    const errors = [];
    const ids = new Set();
    const numbers = new Set();
    const titles = new Set();
    const difficulties = new Set(["Gentle", "Measured", "Sharp"]);
    const isText = (value) => typeof value === "string" && value.trim().length > 0;
    const requireTextFields = (value, fields, label) => {
      fields.forEach((field) => {
        if (!value || !isText(value[field])) errors.push(`${label}: missing ${field}.`);
      });
    };

    if (!Array.isArray(cases) || cases.length === 0) {
      return ["Case data must be a non-empty array."];
    }

    cases.forEach((caseFile, index) => {
      const label = caseFile && caseFile.id ? caseFile.id : `index ${index}`;

      if (!caseFile || typeof caseFile !== "object") {
        errors.push(`Case at index ${index} is not an object.`);
        return;
      }

      requireTextFields(
        caseFile,
        ["id", "title", "subtitle", "location", "incident", "difficulty", "fileMark", "question"],
        label
      );

      if (isText(caseFile.id) && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(caseFile.id)) {
        errors.push(`${label}: id must be a lowercase slug.`);
      }
      if (!Number.isInteger(caseFile.caseNumber) || caseFile.caseNumber < 1) {
        errors.push(`${label}: caseNumber must be a positive integer.`);
      }
      if (isText(caseFile.difficulty) && !difficulties.has(caseFile.difficulty)) {
        errors.push(`${label}: unsupported difficulty ${caseFile.difficulty}.`);
      }

      const normalizedTitle = isText(caseFile.title) ? caseFile.title.trim().toLocaleLowerCase() : "";
      if (ids.has(caseFile.id)) errors.push(`${label}: duplicate id.`);
      if (numbers.has(caseFile.caseNumber)) errors.push(`${label}: duplicate case number.`);
      if (normalizedTitle && titles.has(normalizedTitle)) errors.push(`${label}: duplicate title.`);
      ids.add(caseFile.id);
      numbers.add(caseFile.caseNumber);
      if (normalizedTitle) titles.add(normalizedTitle);

      if (caseFile.releaseDate) {
        try {
          dateKeyToUtc(caseFile.releaseDate);
        } catch (error) {
          errors.push(`${label}: releaseDate must be a valid YYYY-MM-DD date.`);
        }
      }

      if (!Array.isArray(caseFile.brief) || caseFile.brief.length !== 2 || !caseFile.brief.every(isText)) {
        errors.push(`${label}: exactly two brief paragraphs are required.`);
      }

      if (!Array.isArray(caseFile.suspects) || caseFile.suspects.length !== 3) {
        errors.push(`${label}: exactly three suspects are required.`);
      }
      const suspectIds = new Set();
      const suspects = Array.isArray(caseFile.suspects) ? caseFile.suspects : [];
      suspects.forEach((suspect, suspectIndex) => {
        const suspectLabel = `${label}: suspect ${suspectIndex + 1}`;
        requireTextFields(suspect, ["id", "name", "role", "initials", "statement"], suspectLabel);
        if (suspectIds.has(suspect && suspect.id)) errors.push(`${suspectLabel}: duplicate id.`);
        suspectIds.add(suspect && suspect.id);
      });

      if (!Array.isArray(caseFile.theories) || caseFile.theories.length !== 3) {
        errors.push(`${label}: exactly three theories are required.`);
      }
      const theoryIds = new Set();
      const theories = Array.isArray(caseFile.theories) ? caseFile.theories : [];
      theories.forEach((theory, theoryIndex) => {
        const theoryLabel = `${label}: theory ${theoryIndex + 1}`;
        requireTextFields(theory, ["id", "label"], theoryLabel);
        if (theoryIds.has(theory && theory.id)) errors.push(`${theoryLabel}: duplicate id.`);
        theoryIds.add(theory && theory.id);
      });

      if (!Array.isArray(caseFile.clues) || caseFile.clues.length !== 5) {
        errors.push(`${label}: exactly five clues are required.`);
      }
      const clues = Array.isArray(caseFile.clues) ? caseFile.clues : [];
      clues.forEach((clue, clueIndex) => {
        requireTextFields(clue, ["glyph", "tag", "title", "text"], `${label}: clue ${clueIndex + 1}`);
      });

      if (!Array.isArray(caseFile.hints) || caseFile.hints.length !== 2 || !caseFile.hints.every(isText)) {
        errors.push(`${label}: exactly two hints are required.`);
      }

      if (!caseFile.solution || typeof caseFile.solution !== "object") {
        errors.push(`${label}: missing solution.`);
        return;
      }

      requireTextFields(
        caseFile.solution,
        ["culpritId", "theoryId", "title", "explanation"],
        `${label}: solution`
      );
      if (
        !Array.isArray(caseFile.solution.proof) ||
        caseFile.solution.proof.length !== 3 ||
        !caseFile.solution.proof.every(isText)
      ) {
        errors.push(`${label}: solution must include exactly three proof points.`);
      }
      if (!suspectIds.has(caseFile.solution.culpritId)) {
        errors.push(`${label}: solution culprit is not a suspect.`);
      }
      if (!theoryIds.has(caseFile.solution.theoryId)) {
        errors.push(`${label}: solution theory is not an option.`);
      }
    });

    return errors;
  }

  return {
    ROTATION_EPOCH,
    toDateKey,
    daysBetween,
    dailyCaseIndex,
    getReleasedCases,
    getDailyCase,
    formatCaseNumber,
    formatTimer,
    calculateScore,
    scoreRank,
    computeStreak,
    summarizeCaseHistory,
    createShareText,
    validateCaseData
  };
});
