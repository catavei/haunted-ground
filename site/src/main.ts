/**
 * main.ts — application entry point.
 *
 * Boots the i18n system, then the map.
 * Later tasks will wire in search, card, tour, etc.
 */

import "./style.css";
import { detectLang, setLang } from "./i18n/i18n.js";
import { initMap } from "./map/map.js";

// Detect and apply language before anything renders
const lang = detectLang();
setLang(lang);

// Language toggle
document.getElementById("btn-lang")?.addEventListener("click", () => {
  import("./i18n/i18n.js").then(({ currentLang, setLang: sl }) => {
    sl(currentLang() === "en" ? "ro" : "en");
  });
});

// Calm mode toggle (full effects in task 15; wire the attribute now)
const btnCalm = document.getElementById("btn-calm");
btnCalm?.addEventListener("click", () => {
  const pressed = btnCalm.getAttribute("aria-pressed") === "true";
  btnCalm.setAttribute("aria-pressed", String(!pressed));
  document.body.classList.toggle("calm-mode", !pressed);
  localStorage.setItem("hg-calm", String(!pressed));
});
// Restore calm mode preference
if (localStorage.getItem("hg-calm") === "true") {
  btnCalm?.setAttribute("aria-pressed", "true");
  document.body.classList.add("calm-mode");
}

// Initialise map
initMap();
