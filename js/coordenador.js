/* ========= Coordenador: Cadastro de Usuários (proteção por senha mestra) ========= */
const COORD_MASTER_PASSWORD = "12345";

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
  document.getElementById("auth").style.display = "block";
  document.getElementById("c_register_form").style.display = "none";
}

/* ========= Salas ========= */
function criarSala() {
  const nome = val("c_s_nome");
  const cap = parseInt(val("c_s_cap") || "0", 10);
  if (!nome || !cap) return alert("Preencha nome e capacidade.");
  const salas = LS.get("salas");
  if (salas.some((s) => s.nome === nome))
    return alert("Já existe uma sala com esse nome.");
  salas.push({ id: uid(), nome, capacidade: cap, alunos: [] });
  LS.set("salas", salas);
  byId("c_s_nome").value = "";
  byId("c_s_cap").value = 30;
  renderSalasCoord();
  refreshAllSelects();
  alert("Sala criada!");
}
function renderSalasCoord() {
  const salas = LS.get("salas");
  const tb = byId("c_tbSalas");
  if (!tb) return;
  tb.innerHTML = "";
  salas.forEach((s) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td>${s.nome}</td>
            <td>${s.capacidade}</td>
            <td>
                <button class="btn" style="background:#dc2626; color:white; padding: 4px 8px; font-size:12px;" onclick="apagarUsuario('${s.id}', 'sala')">
                    Apagar
                </button>
                <button class="btn" style="background:#3b82f6; color:white; padding: 4px 8px; font-size:12px;" onclick="editarSala('${s.id}')">
                    Editar
                </button>
            </td>
        `;
    tb.appendChild(tr);
  });
}
function editarSala(id) {
  const salas = LS.get("salas");
  const sala = salas.find((s) => s.id === id);
  if (!sala) return alert("Sala não encontrada.");
  const novoNome = prompt(`Editar nome da sala ${sala.nome}:`, sala.nome);
  const novaCapacidade = prompt(
    `Editar capacidade da sala ${sala.nome}:`,
    sala.capacidade
  );
  if (novoNome === null || novaCapacidade === null) return;
  if (!novoNome || !novaCapacidade || isNaN(parseInt(novaCapacidade, 10))) {
    return alert(
      "Nome e capacidade são obrigatórios e a capacidade deve ser um número."
    );
  }
  sala.nome = novoNome;
  sala.capacidade = parseInt(novaCapacidade, 10);
  LS.set("salas", salas);
  renderSalasCoord();
  alert("Sala atualizada com sucesso!");
}

/* ========= Coordenador: Professores ========= */
function coordCriarProfessor() {
  const nome = val("c_p_nome"),
    cpf = val("c_p_cpf").replace(/[^\d]/g, ""),
    mat = val("c_p_mat"),
    senha = val("c_p_senha");
  if (!nome || !cpf || !senha) return alert("Preencha nome, CPF e senha.");
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
  refreshAllSelects();
  alert("Professor criado!");
}
function renderProfsCoord() {
  const users = LS.get("users");
  const tb = byId("c_tbProfs");
  tb.innerHTML = "";
  if (users.professores.length === 0) {
    tb.innerHTML = `<tr><td colspan="4">Nenhum professor cadastrado.</td></tr>`;
    return;
  }
  users.professores.forEach((p, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.nome}</td>
      <td>${p.cpf}</td>
      <td>${p.mat || "-"}</td>
      <td>
        <button class="btn" style="background:#dc2626; color:white; padding: 4px 8px; font-size:12px;" onclick="apagarUsuario('${
          p.id
        }', 'professor')">
          Excluir
        </button>
        <button class="btn" style="background:#3b82f6; color:white; padding: 4px 8px; font-size:12px;" onclick="editarUsuario('${
          p.id
        }', 'professor')">
          Editar
        </button>
      </td>
    `;
    tb.appendChild(tr);
  });
}

/* ========= Coordenador: Alunos ========= */
function coordCriarAluno() {
  const nome = val("c_a_nome"),
    cpf = val("c_a_cpf"),
    mat = val("c_a_mat"),
    senha = val("c_a_senha");
  if (!nome || !cpf || !senha) return alert("Preencha nome, CPF e senha.");
  const cpfLimpo = cpf.replace(/[^\d]/g, "");
  if (!cpfRegex.test(cpfLimpo))
    return alert("CPF inválido. Use 11 dígitos numéricos.");
  const users = LS.get("users");
  if (users.alunos.some((a) => a.cpf === cpfLimpo))
    return alert("CPF já cadastrado.");
  if (mat && users.alunos.some((a) => a.mat === mat))
    return alert("Matrícula já cadastrada.");
  users.alunos.push({
    id: uid(),
    nome,
    cpf: cpfLimpo,
    mat,
    senha,
    salaId: null,
  });
  LS.set("users", users);
  ["c_a_nome", "c_a_cpf", "c_a_mat", "c_a_senha"].forEach(
    (id) => (byId(id).value = "")
  );
  renderAlunosCoord();
  alert("Aluno criado!");
}
function vincularAlunoASala() {
  const alunoId = sel("c_vincular_aluno").value;
  const salaId = sel("c_vincular_sala").value;
  if (!alunoId || !salaId) {
    return alert("Selecione um aluno e uma sala.");
  }
  const users = LS.get("users");
  const aluno = users.alunos.find((a) => a.id === alunoId);
  if (aluno) {
    aluno.salaId = salaId;
    LS.set("users", users);
    alert("Aluno vinculado à sala com sucesso!");
    renderAlunosCoord();
  } else {
    alert("Aluno não encontrado.");
  }
}
function renderAlunosCoord() {
  const tb = byId("c_tbAlunos");
  tb.innerHTML = "";
  const users = LS.get("users");
  const salas = LS.get("salas");
  fillSelect(
    "c_vincular_aluno",
    users.alunos.map((a) => ({ id: a.id, nome: a.nome }))
  );
  fillSelect(
    "c_vincular_sala",
    salas.map((s) => ({ id: s.id, nome: s.nome }))
  );
  users.alunos.forEach((a) => {
    const tr = document.createElement("tr");
    const salaNome = salas.find((s) => s.id === a.salaId)?.nome || "-";
    tr.innerHTML = `
      <td>${a.nome}</td>
      <td>${a.cpf}</td>
      <td>${a.mat || "-"}</td>
      <td>${salaNome}</td>
      <td>
        <button class="btn" style="background:#dc2626; color:white; padding: 4px 8px; font-size:12px;" onclick="apagarUsuario('${
          a.id
        }', 'aluno')">
          Apagar
        </button>
        <button class="btn" style="background:#3b82f6; color:white; padding: 4px 8px; font-size:12px;" onclick="editarUsuario('${
          a.id
        }', 'aluno')">
          Editar
        </button>
      </td>
    `;
    tb.appendChild(tr);
  });
}

function apagarUsuario(id, role) {
  if (!confirm(`Tem certeza que deseja apagar este(a) ${role}?`)) return;
  const users = LS.get("users");
  if (role === "aluno") {
    users.alunos = users.alunos.filter((a) => a.id !== id);
  } else if (role === "professor") {
    users.professores = users.professores.filter((p) => p.id !== id);
  } else if (role === "sala") {
    const salas = LS.get("salas");
    if (
      !confirm(
        "Ao apagar a sala, os alunos associados a ela serão desvinculados. Deseja continuar?"
      )
    )
      return;
    const usuarios = LS.get("users");
    usuarios.alunos.forEach((a) => {
      if (a.salaId === id) a.salaId = null;
    });
    LS.set("users", usuarios);
    LS.set(
      "salas",
      salas.filter((s) => s.id !== id)
    );
  }
  LS.set("users", users);
  if (role === "aluno") renderAlunosCoord();
  if (role === "professor") renderProfsCoord();
  if (role === "sala") renderSalasCoord();
  refreshAllSelects();
  alert("Usuário excluído!");
}

function editarUsuario(id, role) {
  let user;
  if (role === "aluno") {
    user = LS.get("users").alunos.find((u) => u.id === id);
  } else if (role === "professor") {
    user = LS.get("users").professores.find((u) => u.id === id);
  }
  if (!user) return alert("Usuário não encontrado para edição.");
  byId("edit_id").value = user.id;
  byId("edit_role").value = role;
  byId("edit_nome").value = user.nome;
  byId("edit_cpf").value = user.cpf;
  byId("edit_senha").value = user.senha;
  byId("edit_mat").value = user.mat || user.ra || "";
  document.getElementById("app").style.display = "none";
  document.getElementById("c_edit_form").style.display = "block";
}

function salvarEdicao() {
  const id = val("edit_id"),
    role = val("edit_role"),
    nome = val("edit_nome"),
    cpf = val("edit_cpf"),
    senha = val("edit_senha"),
    mat = val("edit_mat");
  if (!nome || !cpf || !senha) return alert("Preencha todos os campos.");
  const cpfLimpo = cpf.replace(/[^\d]/g, "");
  if (cpfLimpo.length !== 11) return alert("CPF inválido.");
  const users = LS.get("users");
  let lista;
  if (role === "aluno") {
    lista = users.alunos;
  } else if (role === "professor") {
    lista = users.professores;
  }
  const usuarioParaEditar = lista.find((u) => u.id === id);
  if (!usuarioParaEditar) return alert("Usuário não encontrado.");
  usuarioParaEditar.nome = nome;
  usuarioParaEditar.cpf = cpfLimpo;
  usuarioParaEditar.senha = senha;
  if (role === "aluno") {
    usuarioParaEditar.mat = mat;
  } else if (role === "professor") {
    usuarioParaEditar.mat = mat;
  }
  LS.set("users", users);
  alert("Dados atualizados com sucesso!");
  cancelarEdicao();
  if (role === "aluno") renderAlunosCoord();
  if (role === "professor") renderProfsCoord();
  refreshAllSelects();
}

function cancelarEdicao() {
  document.getElementById("c_edit_form").style.display = "none";
  document.getElementById("app").style.display = "block";
}

/* ========= Coordenador: Matérias ========= */
function criarMateriaCoord() {
  const salas = LS.get("salas");
  const materias = LS.get("materias");
  const salaId = sel("c_m_selSala").value;
  const nome = val("c_m_nome");
  if (!salaId || !nome)
    return alert("Selecione a sala e informe um nome para a matéria.");
  if (materias.some((m) => m.nome === nome && m.salaId === salaId))
    return alert("Já existe uma matéria com esse nome nesta sala.");
  materias.push({
    id: uid(),
    nome,
    salaId,
    ownerId: null,
    quizConfig: { facil: 60, medio: 30, dificil: 10 },
    perguntas: [],
    conteudos: [],
    inscritos: [],
  });
  LS.set("materias", materias);
  byId("c_m_nome").value = "";
  renderMateriasCoord();
  refreshAllSelects();
  alert("Matéria criada!");
}
function renderMateriasCoord() {
  const materias = LS.get("materias");
  const tb = byId("c_m_list");
  tb.innerHTML = "";
  if (materias.length === 0) {
    tb.innerHTML = `<span class="muted">Nenhuma matéria cadastrada.</span>`;
    return;
  }
  materias.forEach((m, i) => {
    const d = document.createElement("div");
    d.className = "card";
    const sala = LS.get("salas").find((s) => s.id === m.salaId);
    d.innerHTML = `<strong>${m.nome}</strong><div class="muted">Sala: ${
      (sala && sala.nome) || "-"
    }</div>`;
    tb.appendChild(d);
  });
}
function deletarMateria(id) {
  if (!confirm("Tem certeza que deseja excluir esta matéria?")) return;
  const materias = LS.get("materias").filter((m) => m.id !== id);
  LS.set("materias", materias);
  renderMateriasCoord();
  alert("Matéria excluída!");
}

/* ========= Coordenador: Banners ========= */
function salvarBanner() {
  const banners = LS.get("banners");
  const titulo = val("ban_titulo"),
    desc = val("ban_desc"),
    data = val("ban_data"),
    hora = val("ban_hora"),
    local = val("ban_local"),
    mats = val("ban_mats"),
    dicas = val("ban_dicas");
  if (!titulo || !data) return alert("Preencha título e data.");
  banners.push({ id: uid(), titulo, desc, data, hora, local, mats, dicas });
  LS.set("banners", banners);
  byId("ban_titulo").value =
    byId("ban_desc").value =
    byId("ban_data").value =
    byId("ban_hora").value =
    byId("ban_local").value =
    byId("ban_mats").value =
    byId("ban_dicas").value =
      "";
  renderBannersCoord();
  alert("Banner salvo!");
}
function renderBannersCoord() {
  const banners = LS.get("banners");
  const list = byId("c_bannersList");
  list.innerHTML = "";
  if (banners.length === 0) {
    list.innerHTML = `<span class="muted">Nenhum banner cadastrado.</span>`;
    return;
  }
  banners.slice(-3).forEach((b, i) => {
    const d = document.createElement("div");
    d.className = "banner-item";
    d.innerHTML = `
      <div class="banner-head">
        <h4>${b.titulo}</h4>
        <button class="btn-xs red" onclick="deletarBanner('${b.id}')">Excluir</button>
      </div>
      <div class="banner-body">
        <p>${b.desc}</p>
        <span class="muted"><b>Data:</b> ${b.data}<br><b>Horário:</b> ${b.hora}<br><b>Local:</b> ${b.local}<br><b>Matérias:</b> ${b.mats}<br><b>Dicas:</b> ${b.dicas}</span>
      </div>
    `;
    list.appendChild(d);
  });
}
function deletarBanner(id) {
  if (!confirm("Tem certeza que deseja excluir este banner?")) return;
  const banners = LS.get("banners").filter((b) => b.id !== id);
  LS.set("banners", banners);
  renderBannersCoord();
  alert("Banner excluído!");
}

/* ========= Dashboard Coordenador ========= */
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
    barW = 30,
    gap = (W - vals.length * barW) / (vals.length + 1),
    maxVal = Math.max(...vals);
  vals.forEach((v, i) => {
    const barH = (v / maxVal) * H * 0.8;
    ctx.fillStyle = ["#4f46e5", "#14b8a6", "#3b82f6"][i];
    ctx.fillRect(gap * (i + 1) + barW * i, H - barH, barW, barH);
    ctx.fillStyle = "#111827";
    ctx.font = "12px Inter";
    ctx.textAlign = "center";
    ctx.fillText(v, gap * (i + 1) + barW * i + barW / 2, H - barH - 5);
    ctx.fillText(labels[i], gap * (i + 1) + barW * i + barW / 2, H - 12);
  });
}
