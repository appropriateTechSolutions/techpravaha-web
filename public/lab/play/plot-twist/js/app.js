(function runPlotTwist() {
  "use strict";

  const data = window.PlotTwistData;
  const core = window.PlotTwistCore;

  if (!data || !core) {
    document.body.innerHTML = "<p class=\"noscript-note\">The case files could not be loaded. Please refresh the page.</p>";
    return;
  }

  const dataErrors = core.validateCaseData(data.cases);
  if (dataErrors.length > 0) {
    console.error("Invalid Plot Twist case data:", dataErrors);
    document.body.innerHTML = "<p class=\"noscript-note\">A case file is damaged. Please check the console for details.</p>";
    return;
  }

  const STORAGE_KEY = "plot-twist-history-v1";
  let todayKey = core.toDateKey(new Date());
  let dailyCase = core.getDailyCase(data.cases, todayKey);
  const elements = collectElements();
  const history = loadHistory();
  const state = {
    caseFile: dailyCase,
    mode: "daily",
    revealedClues: 0,
    hintsUsed: 0,
    wrongAttempts: 0,
    elapsedSeconds: 0,
    startedAt: null,
    timerId: null,
    solved: false,
    result: null
  };
  let toastTimer = null;

  bindEvents();
  renderCase(dailyCase, "daily");
  refreshHistoryUI();

  function collectElements() {
    const ids = [
      "brand-home", "daily-button", "archive-button", "header-streak", "case-mode-label",
      "case-date-label", "case-title", "case-subtitle", "case-number", "case-difficulty",
      "case-timer", "restart-button", "case-file-mark", "case-location", "case-incident",
      "case-brief", "case-question", "clue-count", "clue-total", "meter-fill",
      "reveal-clue-button", "hint-button", "hint-notes", "evidence-dots", "clue-board",
      "clue-placeholder", "verdict-form", "suspect-list", "theory-list", "verdict-note",
      "verdict-button", "previous-best", "result-sheet", "result-stamp", "result-title",
      "result-lede", "result-explanation", "proof-list", "result-score", "result-rank",
      "score-breakdown", "share-button", "replay-button", "archive-dialog",
      "archive-close-button", "archive-solved", "archive-streak", "archive-best",
      "archive-list", "toast"
    ];

    return ids.reduce((map, id) => {
      map[id] = document.getElementById(id);
      return map;
    }, {});
  }

  function bindEvents() {
    elements["reveal-clue-button"].addEventListener("click", revealNextClue);
    elements["hint-button"].addEventListener("click", revealHint);
    elements["verdict-form"].addEventListener("change", handleDeductionChange);
    elements["verdict-form"].addEventListener("submit", fileVerdict);
    elements["restart-button"].addEventListener("click", restartRound);
    elements["replay-button"].addEventListener("click", restartRound);
    elements["share-button"].addEventListener("click", shareResult);
    elements["daily-button"].addEventListener("click", openDailyCase);
    elements["brand-home"].addEventListener("click", (event) => {
      event.preventDefault();
      openDailyCase();
    });
    elements["archive-button"].addEventListener("click", openArchive);
    elements["archive-close-button"].addEventListener("click", closeArchive);
    elements["archive-dialog"].addEventListener("click", (event) => {
      if (event.target === elements["archive-dialog"]) closeArchive();
    });
    elements["archive-list"].addEventListener("click", selectArchiveCase);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) return;
      if (refreshDailyBoundary()) return;
      if (state.startedAt && !state.solved) updateTimer();
    });
    window.addEventListener("focus", refreshDailyBoundary);
    window.addEventListener("beforeunload", stopTimer);
  }

  function renderCase(caseFile, mode) {
    stopTimer();
    state.caseFile = caseFile;
    state.mode = mode;
    state.revealedClues = 0;
    state.hintsUsed = 0;
    state.wrongAttempts = 0;
    state.elapsedSeconds = 0;
    state.startedAt = null;
    state.solved = false;
    state.result = null;

    elements["case-mode-label"].textContent = mode === "daily" ? "Today’s dossier" : "Archive practice";
    elements["case-date-label"].textContent = mode === "daily"
      ? formatTodayLabel()
      : `File ${String(caseFile.caseNumber).padStart(3, "0")}`;
    elements["case-title"].textContent = caseFile.title;
    elements["case-subtitle"].textContent = caseFile.subtitle;
    elements["case-number"].textContent = core.formatCaseNumber(caseFile.caseNumber);
    elements["case-difficulty"].textContent = caseFile.difficulty;
    elements["case-timer"].textContent = "00:00";
    elements["case-file-mark"].textContent = caseFile.fileMark;
    elements["case-location"].textContent = caseFile.location;
    elements["case-incident"].textContent = caseFile.incident;
    elements["case-question"].textContent = caseFile.question;
    elements["clue-total"].textContent = String(caseFile.clues.length);
    elements["case-brief"].replaceChildren(...caseFile.brief.map((paragraph) => {
      const node = document.createElement("p");
      node.textContent = paragraph;
      return node;
    }));

    elements["hint-notes"].replaceChildren();
    renderEvidenceDots();
    resetClueBoard();
    renderSuspects();
    renderTheories();
    elements["result-sheet"].hidden = true;
    elements["verdict-form"].reset();
    setFormDisabled(false);
    elements["verdict-note"].classList.remove("is-warning");
    elements["verdict-note"].textContent = "Reveal at least two clues before filing a verdict.";
    elements["verdict-button"].disabled = true;
    elements["reveal-clue-button"].disabled = false;
    setRevealButtonLabel("Reveal first clue");
    elements["hint-button"].disabled = false;
    elements["hint-button"].innerHTML = "Need a nudge? <span>−150 pts</span>";
    elements["meter-fill"].style.width = "0%";
    elements["clue-count"].textContent = "0";

    const previous = history.cases[caseFile.id];
    elements["previous-best"].hidden = !previous || !previous.bestScore;
    if (previous && previous.bestScore) {
      elements["previous-best"].textContent = `Previously closed · best ${previous.bestScore} pts in ${core.formatTimer(previous.bestTime)}`;
    }

    elements["daily-button"].classList.toggle("is-active", mode === "daily");
    elements["daily-button"].toggleAttribute("aria-current", mode === "daily");
    elements["archive-button"].classList.toggle("is-active", mode === "archive");
    elements["archive-button"].toggleAttribute("aria-current", mode === "archive");
    renderArchiveList();
  }

  function formatTodayLabel() {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short"
    }).format(new Date());
  }

  function resetClueBoard() {
    elements["clue-board"].replaceChildren();
    const placeholder = document.createElement("div");
    placeholder.className = "clue-placeholder";
    placeholder.id = "clue-placeholder";
    placeholder.innerHTML = [
      "<span class=\"placeholder-mark\" aria-hidden=\"true\">?</span>",
      "<p><strong>The file is still sealed.</strong><br>Reveal evidence when you are ready to start the clock.</p>"
    ].join("");
    elements["clue-board"].appendChild(placeholder);
    elements["clue-placeholder"] = placeholder;
  }

  function renderEvidenceDots() {
    const nodes = state.caseFile.clues.map((clue, index) => {
      const dot = document.createElement("span");
      dot.className = "evidence-dot";
      dot.textContent = String(index + 1).padStart(2, "0");
      dot.setAttribute("aria-label", `Clue ${index + 1}: sealed`);
      return dot;
    });
    elements["evidence-dots"].replaceChildren(...nodes);
  }

  function renderSuspects() {
    const nodes = state.caseFile.suspects.map((suspect) => {
      const label = document.createElement("label");
      label.className = "choice-card";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "suspect";
      input.value = suspect.id;

      const inner = document.createElement("span");
      inner.className = "choice-card__inner";

      const initials = document.createElement("span");
      initials.className = "suspect-initials";
      initials.setAttribute("aria-hidden", "true");
      initials.textContent = suspect.initials;

      const identity = document.createElement("span");
      const name = document.createElement("strong");
      name.className = "suspect-name";
      name.textContent = suspect.name;
      const role = document.createElement("small");
      role.className = "suspect-role";
      role.textContent = suspect.role;
      identity.append(name, role);

      const statement = document.createElement("span");
      statement.className = "suspect-statement";
      statement.textContent = `“${suspect.statement}”`;

      inner.append(initials, identity, statement);
      label.append(input, inner);
      return label;
    });
    elements["suspect-list"].replaceChildren(...nodes);
  }

  function renderTheories() {
    const nodes = state.caseFile.theories.map((theory) => {
      const label = document.createElement("label");
      label.className = "choice-card";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "theory";
      input.value = theory.id;

      const inner = document.createElement("span");
      inner.className = "choice-card__inner";
      inner.textContent = theory.label;

      label.append(input, inner);
      return label;
    });
    elements["theory-list"].replaceChildren(...nodes);
  }

  function revealNextClue() {
    if (state.solved || state.revealedClues >= state.caseFile.clues.length) return;

    startTimer();
    if (elements["clue-placeholder"] && elements["clue-placeholder"].isConnected) {
      elements["clue-placeholder"].remove();
    }

    const clueIndex = state.revealedClues;
    const clue = state.caseFile.clues[clueIndex];
    elements["clue-board"].appendChild(createClueCard(clue, clueIndex));
    state.revealedClues += 1;

    const dots = elements["evidence-dots"].children;
    if (dots[clueIndex]) {
      dots[clueIndex].classList.add("is-revealed");
      dots[clueIndex].setAttribute("aria-label", `Clue ${clueIndex + 1}: revealed`);
    }

    updateProgress();
    updateVerdictState();

    if (state.revealedClues >= state.caseFile.clues.length) {
      elements["reveal-clue-button"].disabled = true;
      setRevealButtonLabel("All evidence revealed");
    } else {
      setRevealButtonLabel(`Reveal clue ${state.revealedClues + 1}`);
    }
  }

  function createClueCard(clue, index) {
    const article = document.createElement("article");
    article.className = "clue-card";
    article.setAttribute("aria-label", `Clue ${index + 1}: ${clue.title}`);

    const head = document.createElement("header");
    head.className = "clue-card__head";
    const glyph = document.createElement("span");
    glyph.className = "clue-card__glyph";
    glyph.setAttribute("aria-hidden", "true");
    glyph.textContent = clue.glyph;
    const meta = document.createElement("span");
    meta.className = "clue-card__meta";
    const tag = document.createElement("span");
    tag.textContent = `${String(index + 1).padStart(2, "0")} / ${clue.tag}`;
    const title = document.createElement("h3");
    title.textContent = clue.title;
    meta.append(tag, title);
    head.append(glyph, meta);

    const text = document.createElement("p");
    text.textContent = clue.text;
    article.append(head, text);
    return article;
  }

  function updateProgress() {
    const percent = (state.revealedClues / state.caseFile.clues.length) * 100;
    elements["clue-count"].textContent = String(state.revealedClues);
    elements["meter-fill"].style.width = `${percent}%`;
  }

  function setRevealButtonLabel(label) {
    const labelNode = elements["reveal-clue-button"].querySelector("span");
    if (labelNode) labelNode.textContent = label;
  }

  function revealHint() {
    if (state.solved || state.hintsUsed >= state.caseFile.hints.length) return;
    startTimer();

    const note = document.createElement("p");
    note.className = "hint-note";
    note.textContent = state.caseFile.hints[state.hintsUsed];
    elements["hint-notes"].appendChild(note);
    state.hintsUsed += 1;

    if (state.hintsUsed >= state.caseFile.hints.length) {
      elements["hint-button"].disabled = true;
      elements["hint-button"].textContent = "No more hints in this file";
    } else {
      elements["hint-button"].innerHTML = `Another nudge? <span>−150 pts</span>`;
    }

    showToast("Hint added to the file · 150 point cost");
  }

  function handleDeductionChange() {
    if (!state.solved) startTimer();
    updateVerdictState();
  }

  function updateVerdictState() {
    if (state.solved) return;
    const hasSuspect = Boolean(elements["verdict-form"].querySelector("input[name='suspect']:checked"));
    const hasTheory = Boolean(elements["verdict-form"].querySelector("input[name='theory']:checked"));
    const enoughClues = state.revealedClues >= 2;
    elements["verdict-button"].disabled = !(hasSuspect && hasTheory && enoughClues);
    elements["verdict-note"].classList.remove("is-warning");

    if (!enoughClues) {
      elements["verdict-note"].textContent = `Reveal ${2 - state.revealedClues} more clue${state.revealedClues === 1 ? "" : "s"} before filing a verdict.`;
    } else if (!hasSuspect || !hasTheory) {
      elements["verdict-note"].textContent = "Choose both a suspect and a method to complete your deduction.";
    } else {
      elements["verdict-note"].textContent = "Your report is complete. File it when you are certain.";
    }
  }

  function fileVerdict(event) {
    event.preventDefault();
    if (state.solved) return;

    const suspect = elements["verdict-form"].querySelector("input[name='suspect']:checked");
    const theory = elements["verdict-form"].querySelector("input[name='theory']:checked");

    if (state.revealedClues < 2 || !suspect || !theory) {
      updateVerdictState();
      warnVerdictNote();
      return;
    }

    startTimer();
    const suspectCorrect = suspect.value === state.caseFile.solution.culpritId;
    const theoryCorrect = theory.value === state.caseFile.solution.theoryId;

    if (suspectCorrect && theoryCorrect) {
      closeCase();
      return;
    }

    state.wrongAttempts += 1;
    if (!suspectCorrect && !theoryCorrect) {
      elements["verdict-note"].textContent = "Theory rejected. Both the suspect and method leave evidence unexplained.";
    } else if (!suspectCorrect) {
      elements["verdict-note"].textContent = "The method has promise, but your suspect does not fit every trace.";
    } else {
      elements["verdict-note"].textContent = "Your suspect fits. Reconstruct how the scene was manipulated.";
    }
    warnVerdictNote();
    showToast("Theory rejected · 100 point refiling cost");
  }

  function warnVerdictNote() {
    elements["verdict-note"].classList.remove("is-warning");
    void elements["verdict-note"].offsetWidth;
    elements["verdict-note"].classList.add("is-warning");
  }

  function closeCase() {
    updateTimer();
    stopTimer();
    state.solved = true;
    state.result = core.calculateScore({
      elapsedSeconds: state.elapsedSeconds,
      revealedClues: state.revealedClues,
      hintsUsed: state.hintsUsed,
      wrongAttempts: state.wrongAttempts,
      solved: true
    });

    const rank = core.scoreRank(state.result.score);
    recordSolve();
    setFormDisabled(true);
    elements["verdict-button"].disabled = true;
    elements["reveal-clue-button"].disabled = true;
    elements["hint-button"].disabled = true;

    elements["result-stamp"].textContent = rank.stamp;
    elements["result-lede"].textContent = state.caseFile.solution.title;
    elements["result-explanation"].textContent = state.caseFile.solution.explanation;
    elements["proof-list"].replaceChildren(...state.caseFile.solution.proof.map((item) => {
      const node = document.createElement("li");
      node.textContent = item;
      return node;
    }));
    elements["result-score"].textContent = String(state.result.score);
    elements["result-rank"].textContent = rank.label;
    renderScoreBreakdown();
    elements["result-sheet"].hidden = false;
    elements["verdict-note"].classList.remove("is-warning");
    elements["verdict-note"].textContent = "Verdict accepted. The final report has been unsealed below.";
    refreshHistoryUI();

    window.setTimeout(() => {
      elements["result-sheet"].scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
      elements["result-title"].setAttribute("tabindex", "-1");
      elements["result-title"].focus({ preventScroll: true });
    }, prefersReducedMotion() ? 0 : 180);
  }

  function renderScoreBreakdown() {
    const rows = [
      ["Base file", "+1000"],
      ["Speed", state.result.speedBonus ? `+${state.result.speedBonus}` : "—"],
      ["Elapsed", state.result.timePenalty ? `−${state.result.timePenalty}` : "—"],
      ["Evidence", state.result.cluePenalty ? `−${state.result.cluePenalty}` : "—"],
      ["Hints", state.result.hintPenalty ? `−${state.result.hintPenalty}` : "—"],
      ["Refiling", state.result.mistakePenalty ? `−${state.result.mistakePenalty}` : "—"]
    ];

    elements["score-breakdown"].replaceChildren(...rows.map(([term, value]) => {
      const row = document.createElement("div");
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = term;
      dd.textContent = value;
      row.append(dt, dd);
      return row;
    }));
  }

  function recordSolve() {
    const existing = history.cases[state.caseFile.id] || {
      solved: false,
      solveCount: 0,
      bestScore: 0,
      bestTime: null
    };
    existing.solved = true;
    existing.solveCount += 1;
    existing.bestScore = Math.max(existing.bestScore || 0, state.result.score);
    existing.bestTime = existing.bestTime == null
      ? state.elapsedSeconds
      : Math.min(existing.bestTime, state.elapsedSeconds);
    existing.lastScore = state.result.score;
    existing.lastSolvedAt = new Date().toISOString();
    history.cases[state.caseFile.id] = existing;

    if (state.mode === "daily" && !history.dailyDates.includes(todayKey)) {
      history.dailyDates.push(todayKey);
      history.dailyDates.sort();
    }

    saveHistory();
  }

  function setFormDisabled(disabled) {
    elements["verdict-form"].querySelectorAll("input").forEach((input) => {
      input.disabled = disabled;
    });
  }

  function startTimer() {
    if (state.startedAt || state.solved) return;
    state.startedAt = Date.now() - state.elapsedSeconds * 1000;
    state.timerId = window.setInterval(updateTimer, 1000);
  }

  function updateTimer() {
    if (!state.startedAt || state.solved) return;
    state.elapsedSeconds = Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000));
    elements["case-timer"].textContent = core.formatTimer(state.elapsedSeconds);
  }

  function stopTimer() {
    if (state.timerId) window.clearInterval(state.timerId);
    state.timerId = null;
  }

  function restartRound() {
    const hadProgress = state.revealedClues > 0 || state.hintsUsed > 0 || state.wrongAttempts > 0;
    renderCase(state.caseFile, state.mode);
    if (hadProgress) showToast("Fresh report opened · history preserved");
    document.getElementById("main-content").scrollIntoView({ behavior: "auto", block: "start" });
    elements["reveal-clue-button"].focus({ preventScroll: true });
  }

  function refreshDailyBoundary() {
    const currentKey = core.toDateKey(new Date());
    if (currentKey === todayKey) return false;

    todayKey = currentKey;
    dailyCase = core.getDailyCase(data.cases, todayKey);
    refreshHistoryUI();

    if (state.mode === "daily") {
      renderCase(dailyCase, "daily");
      showToast("A new daily dossier has arrived");
    } else {
      renderArchiveList();
    }
    return true;
  }

  function openDailyCase() {
    if (state.caseFile.id !== dailyCase.id || state.mode !== "daily") {
      renderCase(dailyCase, "daily");
      showToast("Today’s dossier restored");
    }
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }

  function openArchive() {
    renderArchiveList();
    refreshHistoryUI();
    const dialog = elements["archive-dialog"];
    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
    const currentCase = elements["archive-list"].querySelector(".archive-case.is-current");
    if (currentCase) currentCase.scrollIntoView({ block: "center", behavior: "auto" });
  }

  function closeArchive() {
    const dialog = elements["archive-dialog"];
    if (typeof dialog.close === "function" && dialog.open) {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
    }
  }

  function renderArchiveList() {
    const nodes = core.getReleasedCases(data.cases, todayKey).map((caseFile) => {
      const button = document.createElement("button");
      const solved = Boolean(history.cases[caseFile.id] && history.cases[caseFile.id].solved);
      button.type = "button";
      button.className = "archive-case";
      button.dataset.caseId = caseFile.id;
      button.classList.toggle("is-current", caseFile.id === state.caseFile.id);
      if (caseFile.id === state.caseFile.id) button.setAttribute("aria-current", "true");

      const number = document.createElement("span");
      number.className = "archive-case__number";
      number.textContent = String(caseFile.caseNumber).padStart(2, "0");

      const copy = document.createElement("span");
      copy.className = "archive-case__copy";
      const title = document.createElement("strong");
      title.textContent = caseFile.title;
      const meta = document.createElement("small");
      meta.textContent = `${caseFile.difficulty} · ${caseFile.fileMark}`;
      copy.append(title, meta);

      const status = document.createElement("span");
      status.className = "archive-case__status";
      status.classList.toggle("is-solved", solved);
      status.textContent = solved ? "Closed" : "Open";

      button.append(number, copy, status);
      return button;
    });
    elements["archive-list"].replaceChildren(...nodes);
  }

  function selectArchiveCase(event) {
    const button = event.target.closest("[data-case-id]");
    if (!button) return;
    const caseFile = core.getReleasedCases(data.cases, todayKey)
      .find((item) => item.id === button.dataset.caseId);
    if (!caseFile) return;
    closeArchive();
    renderCase(caseFile, caseFile.id === dailyCase.id ? "daily" : "archive");
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    showToast(caseFile.id === dailyCase.id ? "Today’s case opened" : "Archive file opened · practice mode");
  }

  function refreshHistoryUI() {
    const streak = core.computeStreak(history.dailyDates, todayKey);
    const releasedCases = core.getReleasedCases(data.cases, todayKey);
    const summary = core.summarizeCaseHistory(releasedCases, history.cases);
    elements["header-streak"].textContent = String(streak.current);
    elements["archive-solved"].textContent = `${summary.solvedCount}/${releasedCases.length}`;
    elements["archive-streak"].textContent = String(streak.current);
    elements["archive-best"].textContent = summary.bestScore ? String(summary.bestScore) : "—";
    renderArchiveList();
  }

  async function shareResult() {
    if (!state.solved || !state.result) return;
    const streak = core.computeStreak(history.dailyDates, todayKey);
    const shareText = core.createShareText({
      caseNumber: state.caseFile.caseNumber,
      elapsedSeconds: state.elapsedSeconds,
      score: state.result.score,
      revealedClues: state.revealedClues,
      totalClues: state.caseFile.clues.length,
      hintsUsed: state.hintsUsed,
      attempts: state.wrongAttempts + 1,
      streak: streak.current,
      url: location.protocol === "http:" || location.protocol === "https:" ? location.href.split("#")[0] : ""
    });

    try {
      await copyText(shareText);
      elements["share-button"].querySelector("span").textContent = "✓";
      showToast("Spoiler-free result copied");
      window.setTimeout(() => {
        const icon = elements["share-button"].querySelector("span");
        if (icon) icon.textContent = "↗";
      }, 1800);
    } catch (error) {
      window.prompt("Copy your spoiler-free result:", shareText);
      showToast("Result prepared for manual copy");
    }
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("Copy command was rejected.");
  }

  function loadHistory() {
    const empty = { version: 1, dailyDates: [], cases: {} };
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!parsed || parsed.version !== 1) return empty;
      return {
        version: 1,
        dailyDates: Array.isArray(parsed.dailyDates) ? parsed.dailyDates.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)) : [],
        cases: parsed.cases && typeof parsed.cases === "object" ? parsed.cases : {}
      };
    } catch (error) {
      return empty;
    }
  }

  function saveHistory() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      showToast("Case solved · private history unavailable in this browser");
    }
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => {
      elements.toast.classList.remove("is-visible");
    }, 2600);
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
})();
