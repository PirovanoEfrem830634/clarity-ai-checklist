// assets/js/app.js

document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startChecklist");
  const resetBtn = document.getElementById("resetChecklist");
  const checklistRoot = document.getElementById("checklistRoot");
  const checklistCounter = document.getElementById("checklistCounter");
  const checklistScore = document.getElementById("checklistScore");

  function updateScore() {
    const selects = checklistRoot.querySelectorAll(".checklist-select");
    let totalItems = 0;
    let totalScore = 0;

    selects.forEach((select) => {
      totalItems += 1;
      const value = select.value ? Number(select.value) : 0;
      totalScore += value;

      const chip = select
        .closest(".checklist-item")
        .querySelector("[data-score-chip]");
      if (chip) {
        chip.textContent = `Score: ${value}`;
      }
    });

    checklistCounter.textContent = `${totalItems} item${
      totalItems !== 1 ? "s" : ""
    }`;
    checklistScore.textContent = `Total score: ${totalScore}`;
  }

  // Cambio valore score quando l'utente modifica un select
  checklistRoot.addEventListener("change", (event) => {
    if (event.target.matches(".checklist-select")) {
      updateScore();
    }
  });

  // Pulsante "Start checklist": scroll + focus
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      const firstSelect = checklistRoot.querySelector(".checklist-select");
      if (firstSelect) {
        firstSelect.focus();
        firstSelect.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }

  // Pulsante "Reset all scores"
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      const selects = checklistRoot.querySelectorAll(".checklist-select");
      selects.forEach((s) => {
        s.value = "";
      });
      updateScore();
    });
  }

  // Calcolo iniziale
  updateScore();
});
