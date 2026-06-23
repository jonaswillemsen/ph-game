// Health Juxt — a daily "which is higher?" quiz for UK public health figures.
// Inspired by the Urban Stats Juxtastat quiz (https://urbanstats.org/quiz.html).

(function () {
  "use strict";

  const { METRICS, REGIONS, SOURCE } = window.PH_DATA;
  const METRIC_KEYS = Object.keys(METRICS);
  const QUESTIONS_PER_QUIZ = 5;
  const STORAGE_KEY = "healthjuxt.history.v1";

  // --- Deterministic RNG so everyone gets the same quiz on a given day -------

  // mulberry32: a small, fast, seedable PRNG.
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Hash a string into a 32-bit integer seed.
  function hashString(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function dayNumber(date) {
    // Days since the Unix epoch in UTC — stable, timezone-tolerant index.
    return Math.floor(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
        86400000
    );
  }

  function todayId() {
    const d = new Date();
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // --- Quiz generation -------------------------------------------------------

  // Build a deterministic quiz for a given day id (YYYY-MM-DD).
  function buildQuiz(dayId) {
    const rand = mulberry32(hashString("healthjuxt:" + dayId));
    const pick = (arr) => arr[Math.floor(rand() * arr.length)];

    const questions = [];
    const seen = new Set();
    let guard = 0;

    while (questions.length < QUESTIONS_PER_QUIZ && guard++ < 500) {
      const metricKey = pick(METRIC_KEYS);
      let a = Math.floor(rand() * REGIONS.length);
      let b = Math.floor(rand() * REGIONS.length);
      if (a === b) continue;

      const va = REGIONS[a].stats[metricKey];
      const vb = REGIONS[b].stats[metricKey];
      // Skip ties and near-ties — they make for ambiguous questions.
      if (Math.abs(va - vb) < 0.3) continue;

      // Avoid repeating the same region-pair + metric within one quiz.
      const key = [metricKey, Math.min(a, b), Math.max(a, b)].join("|");
      if (seen.has(key)) continue;
      seen.add(key);

      questions.push({ metricKey, left: REGIONS[a], right: REGIONS[b] });
    }
    return questions;
  }

  // --- Persistence -----------------------------------------------------------

  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveResult(dayId, results) {
    const history = loadHistory();
    history[dayId] = results;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      /* storage may be unavailable; the game still works for this session */
    }
  }

  function computeStreak(history) {
    // Count consecutive days (ending today) that have a completed result.
    let streak = 0;
    let cursor = new Date();
    for (;;) {
      const y = cursor.getUTCFullYear();
      const m = String(cursor.getUTCMonth() + 1).padStart(2, "0");
      const d = String(cursor.getUTCDate()).padStart(2, "0");
      const id = `${y}-${m}-${d}`;
      if (history[id]) {
        streak++;
        cursor = new Date(cursor.getTime() - 86400000);
      } else {
        break;
      }
    }
    return streak;
  }

  // --- Game state ------------------------------------------------------------

  const state = {
    dayId: todayId(),
    questions: [],
    index: 0,
    results: [], // booleans: was the answer correct?
    locked: false, // prevents double-answering while showing feedback
  };

  // --- DOM helpers -----------------------------------------------------------

  const el = (id) => document.getElementById(id);

  function metricDirectionNote(metric) {
    return metric.higherIsBetter
      ? "Higher is generally healthier."
      : "Lower is generally healthier.";
  }

  function regionCardHTML(side) {
    return `
      <button class="region-card" data-side="${side}">
        <span class="region-name"></span>
        <span class="region-sub"></span>
        <span class="region-value"></span>
      </button>`;
  }

  // --- Rendering -------------------------------------------------------------

  function renderQuestion() {
    const q = state.questions[state.index];
    const metric = METRICS[q.metricKey];
    state.locked = false;

    el("progress-text").textContent = `Question ${state.index + 1} of ${
      state.questions.length
    }`;
    el("progress-fill").style.width = `${
      (state.index / state.questions.length) * 100
    }%`;

    el("question-prompt").innerHTML = `Which area has the <strong>higher</strong> ${metric.short}?`;
    el("metric-note").textContent = metricDirectionNote(metric);

    const board = el("board");
    board.innerHTML = regionCardHTML("left") + `<div class="vs">vs</div>` + regionCardHTML("right");

    fillCard(board.querySelector('[data-side="left"]'), q.left);
    fillCard(board.querySelector('[data-side="right"]'), q.right);

    board.querySelectorAll(".region-card").forEach((card) => {
      card.addEventListener("click", () => onAnswer(card.dataset.side));
    });

    el("feedback").className = "feedback";
    el("feedback").innerHTML = "";
    el("next-btn").classList.add("hidden");
  }

  function fillCard(card, region) {
    card.querySelector(".region-name").textContent = region.name;
    card.querySelector(".region-sub").textContent = region.region;
    card.querySelector(".region-value").textContent = "";
  }

  function onAnswer(side) {
    if (state.locked) return;
    state.locked = true;

    const q = state.questions[state.index];
    const metric = METRICS[q.metricKey];
    const leftVal = q.left.stats[q.metricKey];
    const rightVal = q.right.stats[q.metricKey];
    const higherSide = leftVal > rightVal ? "left" : "right";
    const correct = side === higherSide;

    state.results.push(correct);

    const board = el("board");
    const leftCard = board.querySelector('[data-side="left"]');
    const rightCard = board.querySelector('[data-side="right"]');

    // Reveal values on both cards.
    leftCard.querySelector(".region-value").textContent =
      formatValue(leftVal, metric);
    rightCard.querySelector(".region-value").textContent =
      formatValue(rightVal, metric);

    // Mark the correct (higher) card, and flag a wrong pick.
    (higherSide === "left" ? leftCard : rightCard).classList.add("correct");
    if (!correct) {
      (side === "left" ? leftCard : rightCard).classList.add("wrong");
    }
    [leftCard, rightCard].forEach((c) => (c.disabled = true));

    const fb = el("feedback");
    fb.className = "feedback " + (correct ? "good" : "bad");
    const winner = higherSide === "left" ? q.left : q.right;
    fb.innerHTML = `
      <div class="feedback-headline">${correct ? "Correct!" : "Not quite."}</div>
      <div class="feedback-detail">
        <strong>${winner.name}</strong> has the higher ${metric.label.toLowerCase()}
        (${formatValue(winner.stats[q.metricKey], metric)}).
        <span class="metric-hint">${metric.description}</span>
      </div>`;

    const isLast = state.index === state.questions.length - 1;
    const nextBtn = el("next-btn");
    nextBtn.textContent = isLast ? "See results" : "Next question";
    nextBtn.classList.remove("hidden");
    nextBtn.focus();
  }

  function formatValue(value, metric) {
    const rounded = Number.isInteger(value) ? value : value.toFixed(1);
    return `${rounded}${metric.unit}`;
  }

  function onNext() {
    if (state.index < state.questions.length - 1) {
      state.index++;
      renderQuestion();
    } else {
      finishQuiz();
    }
  }

  function finishQuiz() {
    saveResult(state.dayId, state.results);
    const score = state.results.filter(Boolean).length;
    const total = state.results.length;

    el("progress-fill").style.width = "100%";
    el("game").classList.add("hidden");
    el("results").classList.remove("hidden");

    el("score-big").textContent = `${score} / ${total}`;
    el("score-line").textContent = scoreMessage(score, total);

    const squares = state.results.map((r) => (r ? "🟩" : "🟥")).join("");
    el("share-squares").textContent = squares;

    const history = loadHistory();
    const streak = computeStreak(history);
    el("streak-line").textContent =
      streak > 1 ? `🔥 ${streak}-day streak` : "Come back tomorrow for a new quiz.";
  }

  function scoreMessage(score, total) {
    const ratio = score / total;
    if (ratio === 1) return "Flawless — you know your UK health geography.";
    if (ratio >= 0.8) return "Strong work.";
    if (ratio >= 0.6) return "Not bad at all.";
    if (ratio >= 0.4) return "Room to improve — try again tomorrow.";
    return "Tricky one today. The data can be counter-intuitive!";
  }

  function buildShareText(score, total) {
    const squares = state.results.map((r) => (r ? "🟩" : "🟥")).join("");
    return `Health Juxt ${state.dayId}\n${score}/${total}  ${squares}\n${location.origin}${location.pathname}`;
  }

  async function onShare() {
    const score = state.results.filter(Boolean).length;
    const total = state.results.length;
    const text = buildShareText(score, total);
    const btn = el("share-btn");

    if (navigator.share) {
      try {
        await navigator.share({ title: "Health Juxt", text });
        return;
      } catch (e) {
        /* user cancelled or share failed — fall through to clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      const original = btn.textContent;
      btn.textContent = "Copied to clipboard!";
      setTimeout(() => (btn.textContent = original), 2000);
    } catch (e) {
      window.prompt("Copy your result:", text);
    }
  }

  // --- Boot ------------------------------------------------------------------

  function start() {
    state.dayId = todayId();
    state.questions = buildQuiz(state.dayId);
    state.index = 0;
    state.results = [];

    el("date-label").textContent = new Date().toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    el("intro").classList.add("hidden");
    el("results").classList.add("hidden");
    el("game").classList.remove("hidden");
    renderQuestion();
  }

  function renderDataSource() {
    const node = el("data-source");
    if (!node || !SOURCE) return;
    const fetched = new Date(SOURCE.fetched);
    const when = Number.isNaN(fetched.getTime())
      ? SOURCE.fetched
      : fetched.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
    const link = document.createElement("a");
    link.href = "https://fingertips.phe.org.uk/";
    link.rel = "noopener";
    link.textContent = SOURCE.provider;
    node.textContent = "Data: ";
    node.appendChild(link);
    node.appendChild(
      document.createTextNode(
        ` — latest available period per indicator, ${SOURCE.areaType.name.toLowerCase()}. Fetched ${when}.`
      )
    );
  }

  function init() {
    el("date-label").textContent = new Date().toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    renderDataSource();

    const history = loadHistory();
    const played = history[todayId()];

    el("start-btn").addEventListener("click", start);
    el("next-btn").addEventListener("click", onNext);
    el("share-btn").addEventListener("click", onShare);

    if (played) {
      // Already played today — show a gentle nudge but allow a replay.
      const score = played.filter(Boolean).length;
      el("intro-note").textContent = `You scored ${score}/${played.length} today. Play again to review.`;
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
