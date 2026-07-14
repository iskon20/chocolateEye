(function () {
  const video = document.getElementById('bgVideo');
  if (!video) return;

  const TIME_KEY = 'bgVideoTime';
  const ENABLED_KEY = 'bgVideoEnabled';

  const isEnabled = localStorage.getItem(ENABLED_KEY) !== 'false';
  applyEnabledState(isEnabled);

  video.addEventListener('loadedmetadata', () => {
    const saved = parseFloat(localStorage.getItem(TIME_KEY));
    if (!isNaN(saved) && saved < video.duration) {
      video.currentTime = saved;
    }
    if (isEnabled) video.play().catch(() => {});
  });

  let lastSave = 0;
  video.addEventListener('timeupdate', () => {
    const now = Date.now();
    if (now - lastSave > 500) {
      localStorage.setItem(TIME_KEY, video.currentTime);
      lastSave = now;
    }
  });

  window.addEventListener('beforeunload', () => {
    localStorage.setItem(TIME_KEY, video.currentTime);
  });

  function applyEnabledState(enabled) {
    video.style.display = enabled ? 'block' : 'none';
    if (enabled) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }

  // делаем доступной для внешнего скрипта с тумблером
  window.bgVideoApplyState = applyEnabledState;
})();