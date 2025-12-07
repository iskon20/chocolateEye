const API = "https://chocolateeyeserver-production.up.railway.app/api";
// const API = "http://127.0.0.1:3000/api";

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

    const resCount = await fetch(`${API}/count`, {
      headers: { "x-session": token },
    });
    const count = await resCount.json();

    const formatted = count.total
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, " ");

    document.getElementById(
      "total-count"
    ).innerText = `На данный момент, в базе: ${formatted} записей.`;

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
      const tr = document.createElement("tr");
      tr.innerHTML = `
    <td class="copyable" data-label="ID">${t.id
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, "&nbsp;")}</td>

    <td class="copyable" data-label="Имя">${t.name || ""}</td>
    <td class="copyable" data-label="Чат">${t.chat || ""}</td>
    <td class=" ${window.isCleared ? "hidden" : ""}" data-label="Статус">${
        t.status || ""
      }</td>
    <td class="copyable  ${
      window.isCleared ? "hidden" : ""
    }" data-label="Телефон">${t.phone ? `+${t.phone}` : ""}</td>
    <td class="${
      window.isCleared ? "hidden" : ""
    }" data-label="Продажа">${t.on_sale ? "✅" : "❌"}</td>
    <td data-label="Страна">${countryFlag(t.country)}</td>
    <td data-label="Добавлен">${daysAgoLabel(t.added_at)}</td>
    <td data-label="Действие">
      <button class="mark-btn" onclick="mark(${t.id}, this)">Забрать</button>
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
