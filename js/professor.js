function criarSala() {
  const nome = val("c_s_nome");
  const cap = parseInt(val("c_s_cap") || "0", 10);
  if (!nome || !cap) return alert("Preencha nome e capacidade.");
  const salas = LS.get("salas");
  salas.push({ id: uid(), nome, capacidade: cap, alunos: [] });
  LS.set("salas", salas);
  byId("c_s_nome").value = "";
  byId("c_s_cap").value = 30;
  renderSalasCoord();
  refreshAllSelects();
}
function renderSalasCoord() {
  const salas = LS.get("salas");
  const grid = byId("c_salasGrid");
  grid.innerHTML = "";
  salas.forEach((s) => {
    const d = document.createElement("div");
    d.className = "sala-card";
    d.innerHTML = `<strong>${s.nome}</strong><span class="muted">Cap.: ${s.capacidade}</span>`;
    grid.appendChild(d);
  });
}

/* ========= Matérias ========= */
function criarMateria(orig) {
  const salas = LS.get("salas");
  const materias = LS.get("materias");
  const salaId =
    orig === "coordenador" ? sel("c_m_selSala").value : sel("p_selSala").value;
  const nome = orig === "coordenador" ? val("c_m_nome") : val("p_matNome");
  if (!salaId || !nome) return alert("Selecione sala e informe um nome.");
  materias.push({
    id: uid(),
    nome,
    salaId,
    ownerId: state.user.id,
    quizConfig: { facil: 60, medio: 30, dificil: 10 },
    perguntas: [],
    conteudos: [],
    inscritos: [],
  });
  LS.set("materias", materias);
  if (orig === "coordenador") {
    byId("c_m_nome").value = "";
    renderMateriasCoord();
  } else {
    byId("p_matNome").value = "";
    renderProfMaterias();
  }
  refreshAllSelects();
}

function renderMateriasCoord() {
  const list = byId("c_m_list");
  list.innerHTML = "";
  const salas = LS.get("salas");
  const materias = LS.get("materias");
  salas.forEach((s) => {
    const bloco = document.createElement("div");
    bloco.className = "card";
    bloco.innerHTML = `<strong>${s.nome}</strong><div class="muted">Matérias:</div>`;
    const ul = document.createElement("ul");
    materias
      .filter((m) => m.salaId === s.id)
      .forEach((m) => {
        const li = document.createElement("li");
        li.textContent = m.nome;
        ul.appendChild(li);
      });
    bloco.appendChild(ul);
    list.appendChild(bloco);
  });
}

/* ========= Professor: matérias / perguntas / conteúdos ========= */
function renderProfMaterias() {
  const container = byId("p_listaMaterias");
  container.innerHTML = "";
  const materias = LS.get("materias").filter(
    (m) => m.ownerId === state.user.id
  );
  materias.forEach((m) => {
    const c = document.createElement("div");
    c.className = "card";
    c.innerHTML = `<strong>${
      m.nome
    }</strong><div class="muted">Sala: ${salaNome(m.salaId)}</div>
      <div class="muted">Inscritos: ${m.inscritos.length}</div>`;
    container.appendChild(c);
  });
}

function renderPQSelects() {
  fillSelectWithMaterias("p_q_materia", true);
  fillSelectWithMaterias("p_c_materia", true);
}

function adicionarPergunta() {
  const materiaId = sel("p_q_materia").value;
  if (!materiaId) return alert("Selecione a matéria.");
  const nivel = sel("p_q_nivel").value;
  const enun = val("p_q_enun");
  const alts = [0, 1, 2, 3, 4].map((i) => val("p_q_a" + i));
  const cor = parseInt(val("p_q_cor") || "0", 10);
  if (!enun || alts.some((a) => !a) || cor < 0 || cor > 4)
    return alert("Preencha a pergunta corretamente.");
  const materias = LS.get("materias");
  const m = materias.find((x) => x.id === materiaId);
  m.perguntas.push({ nivel, q: enun, a: alts, correta: cor });
  LS.set("materias", materias);
  byId("p_q_enun").value = "";
  [0, 1, 2, 3, 4].forEach((i) => (byId("p_q_a" + i).value = ""));
  byId("p_q_cor").value = 0;
  renderResumoQuestoes();
  alert("Pergunta adicionada!");
}

function salvarDistribuicao() {
  const materiaId = sel("p_q_materia").value;
  if (!materiaId) return alert("Selecione a matéria.");
  const f = parseInt(val("p_dist_facil") || "0", 10),
    m = parseInt(val("p_dist_medio") || "0", 10),
    d = parseInt(val("p_dist_dificil") || "0", 10);
  if (f + m + d !== 100) return alert("A soma deve ser 100%.");
  const materias = LS.get("materias");
  const mt = materias.find((x) => x.id === materiaId);
  mt.quizConfig = { facil: f, medio: m, dificil: d };
  LS.set("materias", materias);
  alert("Distribuição salva!");
}

function renderResumoQuestoes() {
  const materiaId = sel("p_q_materia").value;
  const box = byId("p_q_resumo");
  if (!materiaId) {
    box.textContent = "Selecione a matéria.";
    return;
  }
  const m = LS.get("materias").find((x) => x.id === materiaId);
  const c = m.quizConfig;
  const counts = { facil: 0, medio: 0, dificil: 0 };
  m.perguntas.forEach((p) => counts[p.nivel]++);
  box.innerHTML = `
    <div><span class="pill">Fácil: ${counts.facil}</span> <span class="pill">Médio: ${counts.medio}</span> <span class="pill">Difícil: ${counts.dificil}</span></div>
    <div class="muted" style="margin-top:6px">Distribuição: ${c.facil}% / ${c.medio}% / ${c.dificil}%</div>
  `;
}

function adicionarConteudo() {
  const materiaId = sel("p_c_materia").value;
  if (!materiaId) return alert("Selecione a matéria.");
  const files = byId("p_c_file").files;
  if (!files.length) return alert("Selecione arquivos.");
  const materias = LS.get("materias");
  const m = materias.find((x) => x.id === materiaId);
  [...files].forEach((f) => {
    const url = URL.createObjectURL(f);
    m.conteudos.push({ id: uid(), nome: f.name, tipo: f.type, url });
  });
  LS.set("materias", materias);
  byId("p_c_file").value = "";
  renderPConteudos();
}

function renderPConteudos() {
  const materiaId = sel("p_c_materia").value;
  const list = byId("p_c_lista");
  list.innerHTML = "";
  if (!materiaId) {
    list.innerHTML = '<span class="muted">Selecione a matéria.</span>';
    return;
  }
  const m = LS.get("materias").find((x) => x.id === materiaId);
  if (!m || !m.conteudos.length) {
    list.innerHTML = '<span class="muted">Sem arquivos.</span>';
    return;
  }
  m.conteudos.forEach((c) => {
    const d = document.createElement("div");
    d.className = "banner";
    d.innerHTML = `<img src="${
      c.url
    }" onerror="this.src=''; this.style.background='#eef2ff'">
    <div><strong>${c.nome}</strong><div class="muted">${
      c.tipo || "arquivo"
    }</div></div>`;
    list.appendChild(d);
  });
}
