function renderAlunoMaterias() {
  fillSelect("a_selSala", LS.get("salas"), state.user.salaId || "");
  if (state.user.salaId)
    fillSelect(
      "a_selMateria",
      LS.get("materias").filter((m) => m.salaId === state.user.salaId)
    );
  else
    byId("a_selMateria").innerHTML =
      '<option value="">Selecione uma sala</option>';
  // limpar view
  byId("a_materiaView").classList.add("hidden");
}
function abrirMateriaAluno() {
  const salaId = sel("a_selSala").value;
  const materiaId = sel("a_selMateria").value;
  if (!salaId || !materiaId) return alert("Selecione sala e matéria.");
  // conteúdos
  const m = LS.get("materias").find((x) => x.id === materiaId);
  const cont = byId("a_conteudos");
  cont.innerHTML = "";
  if (m.conteudos.length === 0)
    cont.innerHTML = '<span class="muted">Sem conteúdos cadastrados.</span>';
  m.conteudos.forEach((c) => {
    const d = document.createElement("div");
    d.className = "banner";
    d.innerHTML = `<img src="${
      c.url
    }" onerror="this.style.background='#eef2ff'"><div><strong>${
      c.nome
    }</strong><div class="muted">${c.tipo || "arquivo"}</div></div>`;
    cont.appendChild(d);
  });
  // quiz start
  quizStart(materiaId);
  byId("a_materiaView").classList.remove("hidden");
}
function alunoVincularSala() {
  const salaId = sel("a_selSala").value;
  if (!salaId) return alert("Selecione uma sala.");
  const users = LS.get("users");
  const a = users.alunos.find((x) => x.id === state.user.id);
  a.salaId = salaId;
  LS.set("users", users);
  state.user = { ...state.user, salaId };
  sessionStorage.setItem("sessionUser", JSON.stringify(state.user));
  alert("Vinculado à sala!");
  renderAlunoMaterias();
}

function renderSalasAlunoSelects() {
  fillSelect("a_salaView", LS.get("salas"), state.user.salaId || "");
}
function renderAlunosSala() {
  const salaId = sel("a_salaView").value || state.user.salaId;
  const tb = byId("a_tbAlunos");
  tb.innerHTML = "";
  if (!salaId) {
    tb.innerHTML = '<tr><td colspan="2">Selecione uma sala.</td></tr>';
    return;
  }
  const alunos = LS.get("users").alunos.filter((a) => a.salaId === salaId);
  alunos.forEach((a) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${a.nome}</td><td>${a.ra}</td>`;
    tb.appendChild(tr);
  });
}

/* ========= Banners na visão do aluno ========= */
function renderBannersAluno() {
  const col = byId("a_bannersCol");
  col.innerHTML = "";
  const banners = LS.get("banners");
  banners.forEach((b) => {
    const d = document.createElement("div");
    d.className = "banner";
    d.style.cursor = "pointer";
    d.onclick = () => showBannerInfo(b);
    d.innerHTML = `<img src="${
      b.img
    }" onerror="this.style.background='#eef2ff'">
    <div><strong>${b.tit}</strong><div class="muted">${b.data || ""} ${
      b.hora || ""
    }</div></div>`;
    col.appendChild(d);
  });
}
function showBannerInfo(b) {
  byId("a_bannerInfo").innerHTML = `
    <div class="banner">
      <img src="${b.img}" onerror="this.style.background='#eef2ff'">
      <div>
        <strong>${b.tit}</strong>
        <div class="muted">${b.data || ""} ${b.hora || ""} • ${
    b.local || ""
  }</div>
        <div class="muted">Matérias: ${b.materias || "-"}</div>
        <div class="muted">Dicas: ${b.dicas || "-"}</div>
      </div>
    </div>
  `;
}

/* ========= Quiz com níveis + Ranking ========= */
let Q = { materiaId: null, nivel: "facil", streak: 0, best: 0, pergunta: null };
function quizStart(materiaId) {
  Q = { materiaId, nivel: "facil", streak: 0, best: 0, pergunta: null };
  byId("a_nivel").textContent = "Nível: Fácil";
  setProgress(0);
  novaPergunta();
}
function setProgress(pct) {
  byId("a_prog").style.width = (pct || 0) + "%";
}

function perguntasPorNivel(materiaId, nivel) {
  const m = LS.get("materias").find((x) => x.id === materiaId);
  return (m?.perguntas || []).filter((q) => q.nivel === nivel);
}
function novaPergunta() {
  const pool = perguntasPorNivel(Q.materiaId, Q.nivel);
  if (!pool.length) {
    byId("a_q").textContent = "Sem perguntas neste nível.";
    byId("a_ans").innerHTML = "";
    return;
  }
  Q.pergunta = pool[Math.floor(Math.random() * pool.length)];
  byId("a_q").textContent = Q.pergunta.q;
  const ans = byId("a_ans");
  ans.innerHTML = "";
  Q.pergunta.a.forEach((t, i) => {
    const b = document.createElement("button");
    b.textContent = t;
    b.onclick = () => responder(i);
    ans.appendChild(b);
  });
}
function responder(i) {
  const stats = LS.get("stats");
  if (i === Q.pergunta.correta) {
    Q.streak++;
    Q.best = Math.max(Q.best, Q.streak);
    byId("a_fb").textContent = "✅ Correto!";
    setProgress(Math.min(100, (Q.streak % 5) * 20));
    // sobe de nível a cada 5 seguidas
    if (Q.streak > 0 && Q.streak % 5 === 0) {
      if (Q.nivel === "facil") Q.nivel = "medio";
      else if (Q.nivel === "medio") Q.nivel = "dificil";
      byId("a_nivel").textContent = "Nível: " + cap(Q.nivel);
    }
  } else {
    byId("a_fb").textContent = "❌ Errou! Sequência final: " + Q.streak;
    salvarRanking(state.user.nome, Q.streak);
    Q.streak = 0;
    Q.nivel = "facil";
    byId("a_nivel").textContent = "Nível: Fácil";
    setProgress(0);
  }
  stats.respostas = (stats.respostas || 0) + 1;
  LS.set("stats", stats);
  novaPergunta();
}
function quizTentarNovamente() {
  Q.streak = 0;
  Q.nivel = "facil";
  byId("a_nivel").textContent = "Nível: Fácil";
  setProgress(0);
  novaPergunta();
}
function quizSair() {
  salvarRanking(state.user.nome, Q.streak);
  alert("Jogo encerrado. Sequência salva no ranking.");
}

function salvarRanking(nome, score) {
  const r = LS.get("ranking");
  r.push({ nome, score });
  r.sort((a, b) => b.score - a.score);
  LS.set("ranking", r.slice(0, 50));
}
function renderRanking() {
  const r = LS.get("ranking");
  const tb = byId("a_tbRanking");
  tb.innerHTML = "";
  r.slice(0, 20).forEach((x, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${i + 1}º</td><td>${x.nome}</td><td>${x.score}</td>`;
    tb.appendChild(tr);
  });
}
