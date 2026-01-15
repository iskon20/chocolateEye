const API = "https://chocolateeyeserver-production.up.railway.app/api";
// const API = "http://127.0.0.1:3000/api";

let savedSet = new Set();
let page = 1,
  pages = 1,
  limit = 100;

document.getElementById("unlog").addEventListener("click", () => {
  localStorage.removeItem("session");
  location.reload();
});

document.addEventListener("click", async (e) => {
  const el = e.target.closest(".copyable");
  if (!el) return;

  let text = el.innerText.trim();

  if (el.getAttribute("data-label") === "ID") {
    text = text.replace(/\s|&nbsp;/g, "").replace(/\u00A0/g, "");
  }

  try {
    await navigator.clipboard.writeText(text);
    el.classList.add("copied");

    setTimeout(() => el.classList.remove("copied"), 1000);
  } catch (err) {
    console.warn("Ошибка копирования:", err);
  }
});

function daysAgoLabel(ts) {
  if (!ts) return "";
  const date = new Date(ts);
  const now = new Date();
  const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diff <= 0) return "сегодня";
  if (diff === 1) return "вчера";
  if (diff === 2) return "позавчера";
  if (diff <= 7) {
    const dayWord = ((n) => {
      if (n % 10 === 1 && n % 100 !== 11) return "день";
      if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100))
        return "дня";
      return "дней";
    })(diff);
    return `${diff} ${dayWord} назад`;
  }
  return date.toLocaleDateString("ru-RU");
}

const loader = document.createElement("div");
loader.classList.add("loader");
loader.id = "loader";
loader.style.width = "120px";
loader.style.margin = "30px auto";

function countryFlag(code) {
  if (!code) return "";
  code = code.trim().toLowerCase();

  const flagPath = `../imgs/flags/${code}.png`;
  return `<img src="${flagPath}" alt="${code.toUpperCase()}" width="24" height="16" style="vertical-align:middle;">`;
}

async function loadSaved() {
  const token = localStorage.getItem("session");
  const res = await fetch(`${API}/saved`, {
    headers: { "x-session": token },
  });

  const result = await res.json();
  const arr = result.data || [];

  savedSet = new Set(arr.map((x) => x.uid));
}

function pluralRu(n, one, few, many) {
  if (n % 10 === 1 && n % 100 !== 11) return one;
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) return few;
  return many;
}

function formatNextUpdate(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);

  const hWord = pluralRu(h, "час", "часа", "часов");
  const mWord = pluralRu(m, "минуту", "минуты", "минут");

  if (h === 0) {
    return `через ${m} ${mWord}`;
  }

  if (m === 0) {
    return `через ${h} ${hWord}`;
  }

  return `через ${h} ${hWord}, ${m} ${mWord}`;
}

async function loadTargets(cleared) {
  const token = localStorage.getItem("session");

  const tbody = document.querySelector("#list tbody");
  tbody.innerHTML = "";

  tbody.parentElement.after(loader);

  document.getElementById("total-count").innerText = "Загрузка...";

  const anim = lottie.loadAnimation({
    container: loader,
    renderer: "svg",
    loop: true,
    autoplay: true,
    path: "../imgs/loader.json",
  });

  const params = new URLSearchParams({
    page,
    limit,
  });

  try {
    await loadSaved();

    const res = await fetch(`${API}/usernames?${params}`, {
      headers: { "x-session": token },
    });
    const data = await res.json();

    anim.destroy();
    loader.remove();

    if (data.redirect) window.location.href = data.redirect;

    const resCount = await fetch(`${API}/count`, {
      headers: { "x-session": token },
    });
    const count = await resCount.json();

    const formatted = count.total
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, " ");

    const allDbformatted = count.allDbTotal
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, " ");

    document.getElementById(
      "total-count"
    ).innerText = `На данный момент, в базе: ${formatted} записей с юзернеймами.\nОбщее кол-во записей: ${allDbformatted}.\nКешировано: ${data.total
      .toString()
      .replace(
        /\B(?=(\d{3})+(?!\d))/g,
        " "
      )} записей.\nСледующее кеширование через: ${formatNextUpdate(count.nextUpd)}.`;

    if (!data.data || data.data.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
    <td colspan="9" style="text-align:center; justify-content:center; padding:20px; color:#888;">
      Ничего не найдено
    </td>
  `;
      tbody.appendChild(tr);
      return;
    }

    data.data.forEach((t) => {
      const isSaved = savedSet.has(t.uid);
      const tr = document.createElement("tr");
      tr.innerHTML = `
    <td style="white-space: nowrap;" class="copyable" data-label="Юзер">${
      t.username || ""
    }</td>
    <td data-label="Ссылка на ТГ">
      ${
        t.username
          ? `
        <a class="tg-link" href="https://t.me/${t.username}" target="_blank" rel="noopener noreferrer">
            <img class="tg-icon" src="../imgs/telegram.svg" alt="Telegram">
          <span class="tg-text">@${t.username}</span>
        </a>
      `
          : ""
      }
    </td>
    <td class="copyable" data-label="Чат">${t.found_from || ""}</td>
    <td class="copyable" style="white-space: nowrap;" data-label="ID">${t.uid
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, "&nbsp;")}</td>

    <td class="${window.isCleared ? "hidden" : ""}" data-label="Статус">${
        t.status || ""
      }</td>
    <td class="copyable  ${
      window.isCleared ? "hidden" : ""
    }" data-label="Телефон">${t.number ? `+${t.number}` : ""}</td>
    <td style="text-align: center;" data-label="Страна">${countryFlag(
      t.country
    )}</td>
    <td data-label="Добавлен">${daysAgoLabel(t.added_at)}</td>
    <td data-label="Действие">
    <div class="card-btn-container">
  <button class="save-btn btn-usernames" onclick="toggleSave(${t.uid}, this)">
          ${isSaved ? "❌ Удалить лайк" : "⭐ Сохранить"}
        </button>
  <button class="mark-btn btn-usernames" onclick="hide(${t.uid}, this)">
    Отбраковать
  </button>
  </div>
</td>

  `;
      tbody.appendChild(tr);
    });

    page = data.page;
    pages = data.pages;
    document.getElementById("pageinfo").textContent = `Стр. ${page} / ${pages}`;
  } catch (e) {
    anim.destroy();
    loader.textContent = "Ошибка загрузки";
    console.log(e);
  }
}

async function toggleSave(uid, btn) {
  const token = localStorage.getItem("session");

  btn.disabled = true;

  const res = await fetch(`${API}/usernames/save/${uid}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-session": token,
    },
  });

  const data = await res.json();
  btn.disabled = false;

  if (!data.ok) {
    alert("Ошибка");
    return;
  }

  btn.textContent = data.saved ? "❌ Удалить лайк" : "⭐ Сохранить";
}

async function hide(uid, btn) {
  const tr = btn.closest("tr");
  const token = localStorage.getItem("session");

  const isHidden = tr.classList.contains("hidden-row");
  const newState = isHidden;

  btn.disabled = true;

  const res = await fetch(`${API}/usernames/toggle/${uid}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-session": token,
    },
    body: JSON.stringify({ in_use: newState }),
  });

  const data = await res.json();
  btn.disabled = false;

  if (!data.ok) {
    alert("Ошибка");
    return;
  }

  // 🔹 UI toggle
  tr.classList.toggle("hidden-row", !newState);
  btn.textContent = newState ? "Отбраковать" : "Вернуть";

  const tbody = tr.closest("tbody");

  const visibleRows = [...tbody.querySelectorAll("tr")].filter(
    (row) => !row.classList.contains("hidden-row")
  );

  if (visibleRows.length === 0) {
    loadTargets();
  }
}

async function checkAdmin() {
  const token = localStorage.getItem("session");
  if (!token) return;

  try {
    const res = await fetch(`${API}/me`, {
      headers: { "x-session": token },
    });
    const data = await res.json();

    if (!data.cleared) {
      document
        .querySelectorAll(".status_hidden.hidden")
        .forEach((el) => el.classList.remove("hidden"));
    }

    window.isCleared = data.cleared;
  } catch (e) {
    console.error("Ошибка проверки админа:", e);
  }
}

document.getElementById("refresh").onclick = () => {
  page = 1;
  loadTargets();
  checkAdmin();
};

document.getElementById("prev").onclick = () => {
  if (page > 1) {
    page--;
    loadTargets();
  }
};
document.getElementById("next").onclick = () => {
  if (page < pages) {
    page++;
    loadTargets();
  }
};

loadTargets();
checkAdmin();
