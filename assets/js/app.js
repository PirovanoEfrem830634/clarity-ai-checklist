// assets/js/app.js

document.addEventListener("DOMContentLoaded", () => {
  const STATE_KEY = "clarityAiChecklistState";

  const startBtn = document.getElementById("startChecklist");
  const resetAllBtn = document.getElementById("resetChecklist");
  const commitAllBtn = document.getElementById("commitAll");

  // Supporto retrocompatibilità: se non esistono i nuovi root, usa quello vecchio
  const legacyRoot = document.getElementById("checklistRoot");
  const structuralRoot =
    document.getElementById("checklistRootStructural") || legacyRoot;
  const macroRoot = document.getElementById("checklistRootMacro") || null;

  const checklistCounter = document.getElementById("checklistCounter");
  const checklistScore = document.getElementById("checklistScore");
  const checklistCounterMacro = document.getElementById("checklistCounterMacro");
  const checklistScoreMacro = document.getElementById("checklistScoreMacro");

  const SCALE_LABELS = {
    0: "0 ★ - Does not meet the criteria",
    1: "1 ★ - Minimally meets the criteria",
    2: "2 ★ - Meets some criteria, with gaps",
    3: "3 ★ - Adequately meets the criteria",
    4: "4 ★ - Meets criteria well",
    5: "5 ★ - Model of best practice",
  };

  let checklistData = null;
  let checklistState = {
    scores: {}, // { [itemId]: number }
    committedGroups: {}, // { [groupId]: true }
  };

  // ---- STATE HELPERS ----
  function loadState() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        checklistState = {
          scores: parsed.scores || {},
          committedGroups: parsed.committedGroups || {},
        };
      }
    } catch (err) {
      console.warn("Failed to load saved state:", err);
    }
  }

  function persistState() {
    try {
      localStorage.setItem(
        STATE_KEY,
        JSON.stringify({
          scores: checklistState.scores,
          committedGroups: checklistState.committedGroups,
        })
      );
    } catch (err) {
      console.warn("Failed to save state:", err);
    }
  }

  function clearState() {
    checklistState = {
      scores: {},
      committedGroups: {},
    };
    localStorage.removeItem(STATE_KEY);
  }

  // ---- RENDERING ----
  function buildChecklist(sections) {
    if (structuralRoot) structuralRoot.innerHTML = "";
    if (macroRoot) macroRoot.innerHTML = "";

    sections.forEach((section) => {
      // Decidiamo dove appendere la sezione:
      // se section.id inizia per "M" => Macro, altrimenti Structural
      const isMacroSection =
        typeof section.id === "string" &&
        section.id.trim().toUpperCase().startsWith("M");

      const targetRoot = isMacroSection ? macroRoot : structuralRoot;
      if (!targetRoot) return;

      const sectionEl = document.createElement("div");
      sectionEl.className = "checklist-section";
      sectionEl.dataset.sectionId = section.id;

      const sectionHeader = document.createElement("div");
      sectionHeader.className = "section-header";

      const sectionTitle = document.createElement("div");
      sectionTitle.className = "section-title";
      sectionTitle.textContent = section.label;

      const sectionMax = document.createElement("div");
      sectionMax.className = "section-max";
      sectionMax.textContent = `Max score: ${section.maxScore}`;

      sectionHeader.appendChild(sectionTitle);
      sectionHeader.appendChild(sectionMax);
      sectionEl.appendChild(sectionHeader);

      // Groups (Title, Abstract, ecc.)
      section.groups.forEach((group) => {
        const groupId = `${section.id}-${group.code}`; // es. "S-TI"

        const groupEl = document.createElement("div");
        // Apple-style group + compat con stile precedente
        groupEl.className = "group-card item-group";
        groupEl.dataset.groupId = groupId;

        // Classe per colore arcobaleno basata su group.code o group.id/label
        const colorKey =
          (group.code || group.id || group.label || "")
            .toString()
            .toLowerCase()
            .replace(/\s+/g, "-");
        if (colorKey) {
          groupEl.classList.add(`item-group--${colorKey}`);
        }

        if (checklistState.committedGroups[groupId]) {
          groupEl.classList.add("group-committed");
        }

        const groupHeader = document.createElement("div");
        groupHeader.className = "group-header";

        const groupLeft = document.createElement("div");
        groupLeft.className = "group-header-left";

        const groupLabel = document.createElement("div");
        groupLabel.className = "group-label item-group-label";
        groupLabel.textContent = group.label;

        const groupStatus = document.createElement("div");
        groupStatus.className = "group-status-chip";
        groupStatus.textContent = checklistState.committedGroups[groupId]
          ? "Committed"
          : "In progress";

        groupLeft.appendChild(groupLabel);
        groupLeft.appendChild(groupStatus);

        const groupActions = document.createElement("div");
        groupActions.className = "group-actions";

        const btnReset = document.createElement("button");
        btnReset.type = "button";
        btnReset.className = "btn-secondary btn-small";
        btnReset.textContent = "Reset section";
        btnReset.dataset.action = "reset-group";

        const btnCommit = document.createElement("button");
        btnCommit.type = "button";
        btnCommit.className = "btn-secondary btn-small btn-commit";
        btnCommit.textContent = "Commit section";
        btnCommit.dataset.action = "commit-group";

        groupActions.appendChild(btnReset);
        groupActions.appendChild(btnCommit);

        groupHeader.appendChild(groupLeft);
        groupHeader.appendChild(groupActions);
        groupEl.appendChild(groupHeader);

        // Corpo: items
        const groupBody = document.createElement("div");
        groupBody.className = "group-body";

        group.items.forEach((item, index) => {
          const itemEl = document.createElement("div");
          itemEl.className = "checklist-item";

          const indexEl = document.createElement("div");
          indexEl.className = "checklist-index";
          indexEl.textContent = String(index + 1);

          const contentEl = document.createElement("div");
          contentEl.className = "checklist-content";

          const labelEl = document.createElement("div");
          labelEl.className = "checklist-label";
          // Mostriamo l'ID come prefisso, es. "STI01 – Identification and Scope"
          labelEl.textContent = `${item.id} – ${item.label}`;

          const descEl = document.createElement("div");
          descEl.className = "checklist-help";
          descEl.textContent = item.description || "";

          const controlsEl = document.createElement("div");
          controlsEl.className = "checklist-controls";

          const selectEl = document.createElement("select");
          selectEl.className = "checklist-select";
          selectEl.dataset.itemId = item.id;
          selectEl.dataset.groupId = groupId;

          const defaultOpt = document.createElement("option");
          defaultOpt.value = "";
          defaultOpt.textContent = "Select…";
          selectEl.appendChild(defaultOpt);

          (item.scale || []).forEach((val) => {
            const opt = document.createElement("option");
            opt.value = String(val);
            opt.textContent =
              SCALE_LABELS[val] !== undefined
                ? SCALE_LABELS[val]
                : String(val);
            selectEl.appendChild(opt);
          });

          // Se abbiamo uno score salvato in state, impostiamo il valore
          const savedValue = checklistState.scores[item.id];
          if (savedValue !== undefined && savedValue !== null) {
            selectEl.value = String(savedValue);
          }

          const chipEl = document.createElement("span");
          chipEl.className = "score-chip";
          chipEl.dataset.scoreChip = "true";
          const initialScore =
            savedValue !== undefined && savedValue !== null ? savedValue : 0;
          chipEl.textContent = `Score: ${initialScore}`;

          controlsEl.appendChild(selectEl);
          controlsEl.appendChild(chipEl);

          contentEl.appendChild(labelEl);
          contentEl.appendChild(descEl);
          contentEl.appendChild(controlsEl);

          itemEl.appendChild(indexEl);
          itemEl.appendChild(contentEl);
          groupBody.appendChild(itemEl);
        });

        groupEl.appendChild(groupBody);
        sectionEl.appendChild(groupEl);
      });

      targetRoot.appendChild(sectionEl);
    });

    // Aggiorna contatori globali (structural + macro)
    updateScore();
  }

  // ---- SCORING ----
  function updateScore() {
    const allSelects = document.querySelectorAll(".checklist-select");

    let structuralItems = 0;
    let structuralScoreSum = 0;
    let macroItems = 0;
    let macroScoreSum = 0;

    allSelects.forEach((select) => {
      const val = select.value ? Number(select.value) : 0;

      // Aggiorna chip
      const chip = select
        .closest(".checklist-item")
        ?.querySelector("[data-score-chip], .score-chip");
      if (chip) {
        chip.textContent = `Score: ${val}`;
      }

      const isMacro = !!select.closest(".card-checklist--macro");
      if (isMacro) {
        macroItems += 1;
        macroScoreSum += val;
      } else {
        structuralItems += 1;
        structuralScoreSum += val;
      }
    });

    if (checklistCounter) {
      checklistCounter.textContent = `${structuralItems} item${
        structuralItems !== 1 ? "s" : ""
      }`;
    }
    if (checklistScore) {
      checklistScore.textContent = `Total score: ${structuralScoreSum}`;
    }

    if (checklistCounterMacro) {
      checklistCounterMacro.textContent = `${macroItems} item${
        macroItems !== 1 ? "s" : ""
      }`;
    }
    if (checklistScoreMacro) {
      checklistScoreMacro.textContent = `Total score: ${macroScoreSum}`;
    }
  }

  function updateGroupStatusVisual(groupId) {
    const groupEl = document.querySelector(
      `.group-card[data-group-id="${groupId}"]`
    );
    if (!groupEl) return;

    const statusEl = groupEl.querySelector(".group-status-chip");
    if (!statusEl) return;

    const committed = !!checklistState.committedGroups[groupId];

    if (committed) {
      groupEl.classList.add("group-committed");
      statusEl.textContent = "Committed";
    } else {
      groupEl.classList.remove("group-committed");
      statusEl.textContent = "In progress";
    }
  }

  // ---- EVENTI ----
  function handleSelectChange(event) {
    if (!event.target.matches(".checklist-select")) return;

    const select = event.target;
    const itemId = select.dataset.itemId;
    const value = select.value === "" ? null : Number(select.value);

    if (!itemId) return;

    if (value === null) {
      delete checklistState.scores[itemId];
    } else {
      checklistState.scores[itemId] = value;
    }
    persistState();
    updateScore();
  }

  function handleGroupButtonClick(event) {
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    const groupEl = btn.closest(".group-card");
    if (!groupEl) return;
    const groupId = groupEl.dataset.groupId;

    if (action === "reset-group") {
      // Reset solo la microsezione corrente
      const selects = groupEl.querySelectorAll(".checklist-select");
      selects.forEach((s) => {
        const itemId = s.dataset.itemId;
        s.value = "";
        if (itemId) {
          delete checklistState.scores[itemId];
        }
      });
      delete checklistState.committedGroups[groupId];
      persistState();
      updateGroupStatusVisual(groupId);
      updateScore();
    }

    if (action === "commit-group") {
      // Commit solo microsezione corrente
      checklistState.committedGroups[groupId] = true;
      persistState();
      updateGroupStatusVisual(groupId);
    }
  }

  // Attacca event listener a tutti i root esistenti (structural + macro)
  [structuralRoot, macroRoot].forEach((root) => {
    if (!root) return;
    root.addEventListener("change", handleSelectChange);
    root.addEventListener("click", handleGroupButtonClick);
  });

  // Start checklist: scroll alla prima sezione / group
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      const firstGroup = document.querySelector(".group-card");
      if (firstGroup) {
        firstGroup.scrollIntoView({ behavior: "smooth", block: "start" });
        const firstSelect = firstGroup.querySelector(".checklist-select");
        if (firstSelect) {
          firstSelect.focus();
        }
      }
    });
  }

  // Reset ALL
  if (resetAllBtn) {
    resetAllBtn.addEventListener("click", () => {
      const confirmReset = window.confirm(
        "Reset all sections? This will clear all scores and committed states."
      );
      if (!confirmReset) return;

      clearState();

      const selects = document.querySelectorAll(".checklist-select");
      selects.forEach((s) => {
        s.value = "";
      });

      const groups = document.querySelectorAll(".group-card");
      groups.forEach((g) => g.classList.remove("group-committed"));

      const statuses = document.querySelectorAll(".group-status-chip");
      statuses.forEach((st) => (st.textContent = "In progress"));

      updateScore();
    });
  }

  // Commit ALL
  if (commitAllBtn) {
    commitAllBtn.addEventListener("click", () => {
      const groups = document.querySelectorAll(".group-card");
      groups.forEach((g) => {
        const groupId = g.dataset.groupId;
        if (!groupId) return;
        checklistState.committedGroups[groupId] = true;
        updateGroupStatusVisual(groupId);
      });
      persistState();
    });
  }

  // ---- GUIDELINES COLLAPSE ----
  const guidelinesCard = document.querySelector(".card-guidelines");
  const guidelinesToggle = document.querySelector(".guidelines-toggle");
  const guidelinesLabel = document.querySelector(".guidelines-toggle-label");

  if (guidelinesCard && guidelinesToggle && guidelinesLabel) {
    // stato iniziale: aperto
    guidelinesCard.classList.remove("collapsed");
    guidelinesToggle.setAttribute("aria-expanded", "true");
    guidelinesLabel.textContent = "Hide details";

    guidelinesToggle.addEventListener("click", () => {
      const collapsed = guidelinesCard.classList.toggle("collapsed");
      if (collapsed) {
        guidelinesToggle.setAttribute("aria-expanded", "false");
        guidelinesLabel.textContent = "Show details";
      } else {
        guidelinesToggle.setAttribute("aria-expanded", "true");
        guidelinesLabel.textContent = "Hide details";
      }
    });
  }

  // ---- INIT: carica state + JSON ----
  loadState();

  fetch("data/clarity-checklist.json")
    .then((res) => res.json())
    .then((data) => {
      checklistData = data;
      if (!Array.isArray(checklistData.sections)) {
        console.error("Invalid checklist data. Expected sections[]");
        const target =
          structuralRoot || macroRoot || document.getElementById("checklistRoot");
        if (target) {
          target.innerHTML =
            '<p style="font-size: 13px; color: #c00;">Invalid checklist configuration.</p>';
        }
        return;
      }
      buildChecklist(checklistData.sections);
    })
    .catch((err) => {
      console.error("Failed to load checklist JSON:", err);
      const target =
        structuralRoot || macroRoot || document.getElementById("checklistRoot");
      if (target) {
        target.innerHTML =
          '<p style="font-size: 13px; color: #c00;">Unable to load checklist configuration.</p>';
      }
    });
});
