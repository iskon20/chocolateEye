const API = "https://chocolateeyeserver-production.up.railway.app/api";
// const API = "http://127.0.0.1:3000/api";

let page = 1,
  pages = 1,
  limit = 100;

function daysAgoLabel(ts) {
  if (!ts) return "";
  const date = new Date(ts);
  const now = new Date();
  const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return "сегодня";
  if (diff === 1) return "вчера";
  if (diff === 2) return "позавчера";
  if (diff < 7) return `${diff} дн. назад`;
  return date.toLocaleDateString("ru-RU");
}

const loader = document.createElement("div");
loader.classList.add("loader");
loader.id = "loader";
loader.style.width = "120px";
loader.style.margin = "30px auto";

async function loadTargets() {
  const sort = document.getElementById("sort").value;
  const hasPhone = document.getElementById("has_phone").checked;
  const notRecently = document.getElementById("not_recently").checked;
  const token = localStorage.getItem("session");

  const tbody = document.querySelector("#list tbody");
  tbody.innerHTML = "";
  tbody.parentElement.after(loader);

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
    has_phone: hasPhone,
    not_recently: notRecently,
  });

  try {
    const res = await fetch(`${API}/targets?${params}`, {
      headers: { "x-session": token },
    });
    const data = await res.json();

    anim.destroy();
    loader.remove();

    if (res.status === 401 || res.status === 403) {
      window.location.href = "../index.html";
      return
    }

    data.data.forEach((t) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
    <td data-label="ID">${t.id
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, "&nbsp;")}</td>

    <td data-label="Имя">${t.name || ""}</td>
    <td data-label="Чат">${t.chat || ""}</td>
    <td data-label="Статус">${t.status || ""}</td>
    <td data-label="Телефон">${t.phone || ""}</td>
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
  loadTargets();
};
document.getElementById("sort").onchange = loadTargets;
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

loadTargets();
