(function () {
  const video = document.getElementById("bgVideo");
  if (!video) return;

  const TIME_KEY = "bgVideoTime";
  const ENABLED_KEY = "bgVideoEnabled";
  const MAX_RETRIES = 5;
  const SAVE_INTERVAL_MS = 500;

  let retryCount = 0;
  let retryTimeout = null;
  let lastSave = 0;

  function getSavedTime() {
    const saved = parseFloat(localStorage.getItem(TIME_KEY));
    return isNaN(saved) ? 0 : saved;
  }

  function toggleClass(selector, enabled) {
    const el = document.querySelector(selector);
    if (el) el.classList.toggle("video-active", enabled);
  }

  function stopRetries() {
    clearTimeout(retryTimeout);
    retryTimeout = null;
    retryCount = 0;
  }

  function scheduleRetry() {
    if (retryCount >= MAX_RETRIES) {
      console.warn("Превышено число попыток восстановления видео");
      return;
    }

    retryCount++;
    const delay = Math.min(1000 * retryCount, 5000);
    const savedTime = video.currentTime || getSavedTime();

    clearTimeout(retryTimeout);
    retryTimeout = setTimeout(() => {
      video.load();
      video.addEventListener(
        "loadedmetadata",
        () => {
          video.currentTime = savedTime;
          video.play().catch(() => {});
        },
        { once: true }
      );
    }, delay);
  }

  function applyEnabledState(enabled) {
    video.style.display = enabled ? "block" : "none";

    toggleClass("table", enabled);
    toggleClass(".sort-bar", enabled);
    toggleClass(".count-display", enabled);
    toggleClass(".header h2", enabled);

    if (enabled) {
      // если src был снят ранее (video.removeAttribute("src")) — восстанавливаем
      if (!video.getAttribute("src") && !video.querySelector("source")?.getAttribute("src")) {
        return; // источник отсутствует, восстанавливать нечего (на случай кастомных сценариев)
      }
      video.play().catch(() => {});
    } else {
      // намеренное отключение — гасим retry, чтобы не сработал случайный error
      stopRetries();
      video.pause();
    }
  }

  // ===== события видео =====

  video.addEventListener("loadedmetadata", () => {
    const saved = getSavedTime();
    if (saved > 0 && saved < video.duration) {
      video.currentTime = saved;
    }
    if (localStorage.getItem(ENABLED_KEY) !== "false") {
      video.play().catch(() => {});
    }
  });

  video.addEventListener("timeupdate", () => {
    const now = Date.now();
    if (now - lastSave > SAVE_INTERVAL_MS) {
      localStorage.setItem(TIME_KEY, video.currentTime);
      lastSave = now;
    }
  });

  video.addEventListener("error", () => {
    if (!video.src) return; // ошибка после намеренного removeAttribute("src") — игнорируем
    console.warn("Video error, попытка восстановления...", video.error);
    scheduleRetry();
  });

  video.addEventListener("playing", () => {
    retryCount = 0;
  });

  window.addEventListener("beforeunload", () => {
    localStorage.setItem(TIME_KEY, video.currentTime);
  });

  // ===== синхронизация между вкладками/страницами =====
  window.addEventListener("storage", (e) => {
    if (e.key === ENABLED_KEY) {
      applyEnabledState(e.newValue !== "false");
    }
  });

  // ===== публичный API =====
  window.bgVideoApplyState = applyEnabledState;

  // ===== инициализация (в самом конце, когда всё готово) =====
  const isEnabled = localStorage.getItem(ENABLED_KEY) !== "false";
  applyEnabledState(isEnabled);
})();