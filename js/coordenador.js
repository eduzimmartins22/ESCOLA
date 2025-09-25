/* ========= Coordenador: Cadastro de Usuários (proteção por senha mestra) ========= */
function submitRegister(role) {
  const nome = val("reg_c_nome"),
    cpf = val("reg_c_cpf"),
    mat = val("reg_c_mat"),
    senha = val("reg_c_senha");

  if (!nome || !cpf || !senha) return alert("Preencha todos os campos.");

  const cpfLimpo = cpf.replace(/[^\d]/g, "");
  if (cpfLimpo.length !== 11)
    return alert("CPF inválido. Use 11 dígitos numéricos.");

  const users = LS.get("users");
  if (users.coordenadores.some((u) => u.cpf === cpfLimpo))
    return alert("CPF já cadastrado.");

  users.coordenadores.push({ id: uid(), nome, cpf: cpfLimpo, mat, senha });
  LS.set("users", users);

  alert("Coordenador cadastrado com sucesso!");
  // Volta para a tela de login
  document.getElementById("auth").style.display = "block";
  document.getElementById("c_register_form").style.display = "none";
}

function coordCriarProfessor() {
  const nome = val("c_p_nome"),
    cpf = val("c_p_cpf"),
    mat = val("c_p_mat"),
    senha = val("c_p_senha");
  if (!nome || !cpf || !senha) return alert("Preencha nome, CPF e senha.");
  const cpfRegex = /^\d{11}$/;
  if (!cpfRegex.test(cpf))
    return alert("CPF inválido. Use 11 dígitos numéricos.");
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

function coordCriarAluno() {
  const nome = val("c_a_nome"),
    cpf = val("c_a_cpf"),
    ra = val("c_a_ra"),
    senha = val("c_a_senha");
  if (!nome || !cpf || !ra || !senha) return alert("Preencha todos os campos.");

  const cpfRegex = /^\d{11}$/;
  const cpfLimpo = cpf.replace(/[^\d]/g, "");
  if (!cpfRegex.test(cpfLimpo))
    return alert("CPF inválido. Use 11 dígitos numéricos.");

  const users = LS.get("users");
  if (users.alunos.some((a) => a.cpf === cpfLimpo))
    return alert("CPF já cadastrado.");
  if (users.alunos.some((a) => a.ra === ra)) return alert("RA já cadastrado.");

  users.alunos.push({
    id: uid(),
    nome,
    cpf: cpfLimpo,
    ra,
    senha,
    salaId: null,
  });
  LS.set("users", users);
  ["c_a_nome", "c_a_cpf", "c_a_ra", "c_a_senha"].forEach(
    (id) => (byId(id).value = "")
  );
  renderAlunosCoord();
  alert("Aluno criado!");
}

// Nova função para apagar usuários
function apagarUsuario(id, role) {
  if (!confirm(`Tem certeza que deseja apagar este(a) ${role}?`)) return;
  const users = LS.get("users");
  if (role === "aluno") {
    users.alunos = users.alunos.filter((a) => a.id !== id);
    LS.set("users", users);
    renderAlunosCoord();
  } else if (role === "professor") {
    users.professores = users.professores.filter((p) => p.id !== id);
    LS.set("users", users);
    renderProfsCoord();
  }
}

function renderAlunosCoord() {
  const tb = byId("c_tbAlunos");
  tb.innerHTML = "";
  const users = LS.get("users");
  users.alunos.forEach((a) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${a.nome}</td>
      <td>${a.cpf}</td>
      <td>${a.ra}</td>
      <td>
        <button class="btn" style="background:#dc2626; color:white; padding: 4px 8px; font-size:12px;" onclick="apagarUsuario('${a.id}', 'aluno')">
          Apagar
        </button>
      </td>
    `;
    tb.appendChild(tr);
  });
}

function renderProfsCoord() {
  const tb = byId("c_tbProfs");
  tb.innerHTML = "";
  const users = LS.get("users");
  users.professores.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.nome}</td>
      <td>${p.cpf}</td>
      <td>${p.mat || "-"}</td>
      <td>
        <button class="btn" style="background:#dc2626; color:white; padding: 4px 8px; font-size:12px;" onclick="apagarUsuario('${
          p.id
        }', 'professor')">
          Apagar
        </button>
      </td>
    `;
    tb.appendChild(tr);
  });
}

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

function renderDashboard() {
  const logs = LS.get("logs");
  const materias = LS.get("materias");
  const stats = LS.get("stats");
  byId("d1").textContent = logs.filter((l) => l.in).length;
  byId("d2").textContent = stats.respostas || 0;
  byId("d3").textContent = materias.length;
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
