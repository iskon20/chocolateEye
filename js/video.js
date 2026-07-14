(function () {
  const video = document.getElementById("bgVideo");
  if (!video) return;

  const TIME_KEY = "bgVideoTime";
  const ENABLED_KEY = "bgVideoEnabled";

  const isEnabled = localStorage.getItem(ENABLED_KEY) !== "false";
  applyEnabledState(isEnabled);

  video.addEventListener("loadedmetadata", () => {
    const saved = parseFloat(localStorage.getItem(TIME_KEY));
    if (!isNaN(saved) && saved < video.duration) {
      video.currentTime = saved;
    }
    if (isEnabled) video.play().catch(() => {});
  });

  let lastSave = 0;
  video.addEventListener("timeupdate", () => {
    const now = Date.now();
    if (now - lastSave > 500) {
      localStorage.setItem(TIME_KEY, video.currentTime);
      lastSave = now;
    }
  });

  window.addEventListener("beforeunload", () => {
    localStorage.setItem(TIME_KEY, video.currentTime);
  });

  // ===== Retry при обрыве соединения =====
  let retryCount = 0;
  const MAX_RETRIES = 5;
  let retryTimeout = null;

  video.addEventListener("error", () => {
    if (!video.src) return; // ошибка после намеренного removeAttribute("src") — игнорируем

    console.warn("Video error, попытка восстановления...", video.error);

    if (retryCount >= MAX_RETRIES) {
      console.warn("Превышено число попыток восстановления видео");
      return;
    }

    retryCount++;
    const delay = Math.min(1000 * retryCount, 5000); // 1s, 2s, 3s... максимум 5s
    const savedTime = video.currentTime || parseFloat(localStorage.getItem(TIME_KEY)) || 0;

    clearTimeout(retryTimeout);
    retryTimeout = setTimeout(() => {
      video.load();
      video.addEventListener(
        "loadedmetadata",
        () => {
          video.currentTime = savedTime;
          video.play().catch(() => {});
        },
        { once: true },
      );
    }, delay);
  });

  // при успешном воспроизведении сбрасываем счётчик попыток
  video.addEventListener("playing", () => {
    retryCount = 0;
  });

  function applyEnabledState(enabled) {
    video.style.display = enabled ? "block" : "none";

    const table = document.querySelector("table");
    if (table) {
      table.classList.toggle("video-active", enabled);
    }

    const sortBar = document.querySelector(".sort-bar");
    if (sortBar) {
      sortBar.classList.toggle("video-active", enabled);
    }

    const cDisplay = document.querySelector(".count-display");
    if (cDisplay) {
      cDisplay.classList.toggle("video-active", enabled);
    }

    const header = document.querySelector(".header h2");
    if (header) {
      header.classList.toggle("video-active", enabled);
    }

    if (enabled) {
      video.play().catch(() => {});
    } else {
      // намеренное отключение — сбрасываем retry, чтобы не сработал случайный error
      clearTimeout(retryTimeout);
      retryCount = 0;
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
  }

  window.bgVideoApplyState = applyEnabledState;
})();