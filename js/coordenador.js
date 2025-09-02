function coordCriarProfessor() {
  const nome = val("c_p_nome"),
    cpf = val("c_p_cpf"),
    mat = val("c_p_mat"),
    senha = val("c_p_senha");
  if (!nome || !cpf || !senha) return alert("Preencha nome, CPF e senha.");
  const cpfRegex = /^\d{11}$/;
  if (!cpfRegex.test(cpf)) return alert("CPF inválido. Use 11 dígitos numéricos.");
  const users = LS.get("users");
  if (users.professores.some((p) => p.cpf === cpf))
    return alert("CPF já cadastrado.");
  users.professores.push({ id: uid(), nome, cpf, mat, senha });
  LS.set("users", users);
  ["c_p_nome", "c_p_cpf", "c_p_mat", "c_p_senha"].forEach(
    (id) => (byId(id).value = "")
  );
  renderProfsCoord();
  alert("Professor criado!");
}
function renderProfsCoord() {
  const tb = byId("c_tbProfs");
  tb.innerHTML = "";
  const users = LS.get("users");
  users.professores.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${p.nome}</td><td>${p.cpf}</td><td>${
      p.mat || "-"
    }</td>`;
    tb.appendChild(tr);
  });
}

/* ========= Coordenador: Banners ========= */
function salvarBanner() {
  const img = byId("ban_img").files[0];
  const tit = val("ban_tit"),
    data = val("ban_data"),
    hora = val("ban_hora"),
    local = val("ban_local"),
    mats = val("ban_mats"),
    dicas = val("ban_dicas");
  if (!tit) return alert("Informe o título.");
  const banners = LS.get("banners");
  const pushBanner = (imageUrl) => {
    banners.unshift({
      id: uid(),
      tit,
      data,
      hora,
      local,
      materias: mats,
      dicas,
      img: imageUrl,
    });
    LS.set("banners", banners.slice(0, 3));
    renderBannersCoord();
    alert("Banner salvo!");
  };
  if (img) {
    const url = URL.createObjectURL(img);
    pushBanner(url);
  } else {
    pushBanner("");
  }
}
function renderBannersCoord() {
  const col = byId("c_bannersList");
  col.innerHTML = "";
  LS.get("banners").forEach((b) => {
    const d = document.createElement("div");
    d.className = "banner";
    d.innerHTML = `<img src="${
      b.img
    }" onerror="this.style.background='#eef2ff'">
    <div><strong>${b.tit}</strong>
      <div class="muted">${b.data || ""} ${b.hora || ""} • ${
      b.local || ""
    }</div>
      <div class="muted">Matérias: ${b.materias || "-"}</div>
      <div class="muted">Dicas: ${b.dicas || "-"}</div>
    </div>`;
    col.appendChild(d);
  });
}

/* ========= Dashboard ========= */
function renderDashboard() {
  const logs = LS.get("logs");
  const materias = LS.get("materias");
  const stats = LS.get("stats");
  byId("d1").textContent = logs.filter((l) => l.in).length;
  byId("d2").textContent = stats.respostas || 0;
  byId("d3").textContent = materias.length;
  // tabela
  const tb = byId("c_tbLogs");
  tb.innerHTML = "";
  logs
    .slice(-15)
    .reverse()
    .forEach((l) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${l.user}</td><td>${l.role}</td><td>${l.in}</td><td>${
        l.out || "-"
      }</td>`;
      tb.appendChild(tr);
    });
  // gráfico simples
  const ctx = byId("c_chart").getContext("2d");
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const counts = { aluno: 0, professor: 0, coordenador: 0 };
  logs.forEach((l) => {
    counts[l.role] = (counts[l.role] || 0) + 1;
  });
  const labels = ["Aluno", "Professor", "Coordenador"];
  const vals = [
    counts.aluno || 0,
    counts.professor || 0,
    counts.coordenador || 0,
  ];
  const W = ctx.canvas.width,
    H = ctx.canvas.height,
    pad = 30,
    bw = 40,
    gap = 40;
  labels.forEach((lb, i) => {
    const x = pad + i * (bw + gap);
    const max = Math.max(...vals, 1);
    const h = (H - 2 * pad) * (vals[i] / max);
    ctx.fillStyle = i === 0 ? "#8ecae6" : i === 1 ? "#90be6d" : "#219ebc";
    ctx.fillRect(x, H - pad - h, bw, h);
    ctx.fillStyle = "#111";
    ctx.fillText(lb, x, H - pad + 14);
    ctx.fillText(vals[i], x + 12, H - pad - h - 6);
  });
}
