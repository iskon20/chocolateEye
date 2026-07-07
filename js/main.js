// const API = "https://api.iskonentertainment.it.com/api";
// const API = "http://127.0.0.1:3000/api";
let currentUser = {};
const API = window.API_URL;
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

function showModal(message, buttons) {
  const overlay = document.getElementById("modal-overlay");
  const msgEl = document.getElementById("modal-message");
  const btnContainer = document.getElementById("modal-buttons");

  msgEl.textContent = message;
  btnContainer.innerHTML = "";

  buttons.forEach((b) => {
    const btn = document.createElement("button");
    btn.textContent = b.label;
    btn.className = b.className || "modal-btn-ok";
    btn.onclick = () => {
      overlay.classList.add("hidden");
      b.onClick?.();
    };
    btnContainer.appendChild(btn);
  });

  overlay.classList.remove("hidden");
}

function showAlert(message) {
  showModal(message, [{ label: "Ок", className: "modal-btn-ok" }]);
}

function showConfirm(message, onConfirm) {
  showModal(message, [
    { label: "Отмена", className: "modal-btn-cancel" },
    {
      label: "Подтвердить",
      className: "modal-btn-danger",
      onClick: onConfirm,
    },
  ]);
}

async function loadTargets(cleared) {
  const sort = document.getElementById("sort").value;
  const country = document.getElementById("country").value;
  const onSale = document.getElementById("on_sale").checked;
  const idLength = document.getElementById("id_length").value;
  const hasPhone = document.getElementById("has_phone").checked;
  const notRecently = document.getElementById("not_recently").checked;
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
    sort,
    on_sale: onSale,
    has_phone: hasPhone,
    not_recently: notRecently,
  });

  if (idLength) params.set("id_length", idLength);
  if (country) params.set("country", country);

  try {
    const res = await fetch(`${API}/targets?${params}`, {
      headers: { "x-session": token },
    });
    const data = await res.json();

    anim.destroy();
    loader.remove();

    if (data.redirect) window.location.href = data.redirect;

    const formatted = data.total
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, " ");

    document.getElementById("total-count").innerText =
      `На данный момент, в базе: ${formatted} записей.`;

    if (!data.data || data.data.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
    <td colspan="10" style="text-align:center; justify-content:center; padding:20px; color:#888;">
      Ничего не найдено
    </td>
  `;
      tbody.appendChild(tr);
      return;
    }

    data.data.forEach((t) => {
      const tr = document.createElement("tr");
      const isOwn = (currentUser.session_ids || []).includes(t.session_id);
      const canMark =
        !t.session_id ||
        isOwn ||
        (currentUser.can_mark_others && t.added_minutes_ago >= 5);

      const minsLeft =
        t.session_id &&
        !isOwn &&
        currentUser.can_mark_others &&
        t.added_minutes_ago < 5
          ? 5 - t.added_minutes_ago
          : null;
      tr.innerHTML = `
    <td class="copyable" style="white-space: nowrap;" data-label="ID">${t.id
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, "&nbsp;")}</td>

    <td class="copyable" data-label="Имя">${(t.name || "").slice(0, 32)}</td>
    <td class="copyable" data-label="Юзер">${t.username || ""}</td>
    <td class="copyable" data-label="Чат">${t.chat || ""}</td>
    <td class=" ${window.isCleared ? "hidden" : ""}" data-label="Статус">${
      t.status || ""
    }</td>
    <td class="copyable  ${
      window.isCleared ? "hidden" : ""
    }" data-label="Телефон">${t.phone ? `+${t.phone}` : ""}</td>
    <td style="text-align: center;" data-label="Страна">${countryFlag(t.country)}</td>
    <td data-label="Добавлен">${daysAgoLabel(t.added_at)}</td>
    <td style="text-align: center;" data-label="Спарсил">${t.parser_user_name}</td>
     <td class="action_btns" data-label="Действия">
    <div class="card-btn-container-main">
    <button class="mark-btn" onclick="mark(${t.id}, this)" ${canMark ? "" : "disabled"}>${minsLeft !== null ? `${minsLeft} мин.` : canMark ? "Забрать" : "✕"}</button>
    <button class="delete-btn" onclick="deleteTarget(${t.id}, this)" ${canMark ? "" : "disabled"}>${minsLeft !== null ? `${minsLeft} мин.` : canMark ? "Удалить" : "✕"}</button>
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
    currentUser = data;

    if (data.is_admin) {
      document.getElementById("adminBtn").classList.remove("hidden");
    }

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

async function mark(id, btn) {
  const token = localStorage.getItem("session");
  btn.disabled = true;
  const res = await fetch(`${API}/mark/${id}`, {
    method: "POST",
    headers: { "x-session": token },
  });
  const data = await res.json();
  if (data.ok) btn.closest("tr").remove();
  else alert(data.error || "Ошибка");
}

function deleteTarget(id, btn) {
  showConfirm("Удалить эту запись?", async () => {
    const token = localStorage.getItem("session");
    btn.disabled = true;
    const res = await fetch(`${API}/delete/${id}`, {
      method: "POST",
      headers: { "x-session": token },
    });
    const data = await res.json();
    if (data.ok) {
      btn.closest("tr").remove();
    } else {
      showAlert(data.error || "Ошибка");
      btn.disabled = false;
    }
  });
}

document.getElementById("refresh").onclick = () => {
  page = 1;
  checkAdmin();
  loadTargets();
};

document.getElementById("sort").onchange = loadTargets;
document.getElementById("country").onchange = loadTargets;
document.getElementById("on_sale").onchange = loadTargets;
document.getElementById("id_length").onchange = loadTargets;
document.getElementById("has_phone").onchange = loadTargets;
document.getElementById("not_recently").onchange = loadTargets;
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

checkAdmin();
loadTargets();
