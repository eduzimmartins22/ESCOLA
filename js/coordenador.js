// coordenador.js - versão integrada com backend

async function coordCriarProfessor() {
  const nome = val("c_p_nome"),
    cpf = val("c_p_cpf"),
    mat = val("c_p_mat"),
    senha = val("c_p_senha");
  if (!nome || !cpf || !senha) return alert("Preencha nome, CPF e senha.");

  try {
    const res = await fetch("http://localhost:3000/professores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, cpf, mat, senha }),
    });
    if (!res.ok) throw new Error("Erro ao criar professor");

    ["c_p_nome", "c_p_cpf", "c_p_mat", "c_p_senha"].forEach(
      (id) => (byId(id).value = "")
    );
    renderProfsCoord();
    alert("Professor criado!");
  } catch (err) {
    console.error(err);
    alert("Falha ao cadastrar professor");
  }
}

async function renderProfsCoord() {
  try {
    const res = await fetch("http://localhost:3000/professores");
    const professores = await res.json();

    const tb = byId("c_tbProfs");
    tb.innerHTML = "";
    professores.forEach((p) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${p.nome}</td><td>${p.cpf}</td><td>${p.mat || "-"}</td>`;
      tb.appendChild(tr);
    });
  } catch (err) {
    console.error("Erro ao carregar professores", err);
  }
}

async function salvarBanner() {
  const tit = val("ban_tit"),
    data = val("ban_data"),
    hora = val("ban_hora"),
    local = val("ban_local"),
    mats = val("ban_mats"),
    dicas = val("ban_dicas");
  if (!tit) return alert("Informe o título.");

  try {
    const res = await fetch("http://localhost:3000/banners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tit, data, hora, local, materias: mats, dicas }),
    });
    if (!res.ok) throw new Error("Erro ao salvar banner");

    renderBannersCoord();
    alert("Banner salvo!");
  } catch (err) {
    console.error(err);
    alert("Falha ao salvar banner");
  }
}

async function renderBannersCoord() {
  try {
    const res = await fetch("http://localhost:3000/banners");
    const banners = await res.json();

    const col = byId("c_bannersList");
    col.innerHTML = "";
    banners.forEach((b) => {
      const d = document.createElement("div");
      d.className = "banner";
      d.innerHTML = `<img src="${b.img || ""}" onerror="this.style.background='#eef2ff'">
        <div><strong>${b.tit}</strong>
          <div class="muted">${b.data || ""} ${b.hora || ""} • ${b.local || ""}</div>
          <div class="muted">Matérias: ${b.materias || "-"}</div>
          <div class="muted">Dicas: ${b.dicas || "-"}</div>
        </div>`;
      col.appendChild(d);
    });
  } catch (err) {
    console.error("Erro ao carregar banners", err);
  }
}
