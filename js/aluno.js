// aluno.js - versão integrada com backend

async function renderAlunoMaterias() {
  try {
    const resSalas = await fetch("http://localhost:3000/salas");
    const salas = await resSalas.json();
    fillSelect("a_selSala", salas, state.user.salaId || "");

    if (state.user.salaId) {
      const resMat = await fetch(
        `http://localhost:3000/materias?salaId=${state.user.salaId}`
      );
      const materias = await resMat.json();
      fillSelect("a_selMateria", materias);
    } else {
      byId("a_selMateria").innerHTML =
        '<option value="">Selecione uma sala</option>';
    }
    byId("a_materiaView").classList.add("hidden");
  } catch (err) {
    console.error("Erro ao carregar matérias do aluno", err);
  }
}

async function abrirMateriaAluno() {
  const salaId = sel("a_selSala").value;
  const materiaId = sel("a_selMateria").value;
  if (!salaId || !materiaId) return alert("Selecione sala e matéria.");

  try {
    const res = await fetch(`http://localhost:3000/materias/${materiaId}`);
    const m = await res.json();

    const cont = byId("a_conteudos");
    cont.innerHTML = "";
    if (!m.conteudos || m.conteudos.length === 0) {
      cont.innerHTML = '<span class="muted">Sem conteúdos cadastrados.</span>';
    } else {
      m.conteudos.forEach((c) => {
        const d = document.createElement("div");
        d.className = "banner";
        d.innerHTML = `<img src="${c.url}" onerror="this.style.background='#eef2ff'">
          <div><strong>${c.nome}</strong><div class="muted">${c.tipo || "arquivo"}</div></div>`;
        cont.appendChild(d);
      });
    }

    quizStart(materiaId);
    byId("a_materiaView").classList.remove("hidden");
  } catch (err) {
    console.error("Erro ao abrir matéria", err);
  }
}

async function alunoVincularSala() {
  const salaId = sel("a_selSala").value;
  if (!salaId) return alert("Selecione uma sala.");

  try {
    const res = await fetch(`http://localhost:3000/alunos/${state.user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salaId }),
    });
    if (!res.ok) throw new Error("Erro ao vincular aluno à sala");

    state.user = { ...state.user, salaId };
    sessionStorage.setItem("sessionUser", JSON.stringify(state.user));
    alert("Vinculado à sala!");
    renderAlunoMaterias();
  } catch (err) {
    console.error(err);
    alert("Falha ao vincular sala");
  }
}

async function renderAlunosSala() {
  const salaId = sel("a_salaView").value || state.user.salaId;
  const tb = byId("a_tbAlunos");
  tb.innerHTML = "";

  if (!salaId) {
    tb.innerHTML = '<tr><td colspan="2">Selecione uma sala.</td></tr>';
    return;
  }

  try {
    const res = await fetch(`http://localhost:3000/alunos?salaId=${salaId}`);
    const alunos = await res.json();

    alunos.forEach((a) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${a.nome}</td><td>${a.ra}</td>`;
      tb.appendChild(tr);
    });
  } catch (err) {
    console.error("Erro ao carregar alunos", err);
  }
}
