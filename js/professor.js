// professor.js - versão integrada com backend

async function criarSala() {
  const nome = val("c_s_nome");
  const cap = parseInt(val("c_s_cap") || "0", 10);
  if (!nome || !cap) return alert("Preencha nome e capacidade.");

  try {
    const res = await fetch("http://localhost:3000/salas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, capacidade: cap }),
    });
    if (!res.ok) throw new Error("Erro ao criar sala");

    byId("c_s_nome").value = "";
    byId("c_s_cap").value = 30;
    renderSalasCoord();
    refreshAllSelects();
  } catch (err) {
    console.error(err);
    alert("Falha ao criar sala");
  }
}

async function renderSalasCoord() {
  try {
    const res = await fetch("http://localhost:3000/salas");
    const salas = await res.json();

    const grid = byId("c_salasGrid");
    grid.innerHTML = "";
    salas.forEach((s) => {
      const d = document.createElement("div");
      d.className = "sala-card";
      d.innerHTML = `<strong>${s.nome}</strong><span class="muted">Cap.: ${s.capacidade}</span>`;
      grid.appendChild(d);
    });
  } catch (err) {
    console.error("Erro ao carregar salas", err);
  }
}

/* ========= Matérias ========= */
async function criarMateria(orig) {
  const salaId =
    orig === "coordenador" ? sel("c_m_selSala").value : sel("p_selSala").value;
  const nome = orig === "coordenador" ? val("c_m_nome") : val("p_matNome");
  if (!salaId || !nome) return alert("Selecione sala e informe um nome.");

  try {
    const res = await fetch("http://localhost:3000/materias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome,
        salaId,
        ownerId: state.user.id,
      }),
    });
    if (!res.ok) throw new Error("Erro ao criar matéria");

    if (orig === "coordenador") {
      byId("c_m_nome").value = "";
      renderMateriasCoord();
    } else {
      byId("p_matNome").value = "";
      renderProfMaterias();
    }
    refreshAllSelects();
  } catch (err) {
    console.error(err);
    alert("Falha ao criar matéria");
  }
}

async function renderMateriasCoord() {
  try {
    const resSalas = await fetch("http://localhost:3000/salas");
    const salas = await resSalas.json();

    const resMat = await fetch("http://localhost:3000/materias");
    const materias = await resMat.json();

    const list = byId("c_m_list");
    list.innerHTML = "";
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
  } catch (err) {
    console.error("Erro ao carregar matérias", err);
  }
}

async function renderProfMaterias() {
  try {
    const res = await fetch(
      `http://localhost:3000/materias?ownerId=${state.user.id}`
    );
    const materias = await res.json();

    const container = byId("p_listaMaterias");
    container.innerHTML = "";
    materias.forEach((m) => {
      const c = document.createElement("div");
      c.className = "card";
      c.innerHTML = `<strong>${m.nome}</strong>
        <div class="muted">Sala: ${m.salaNome || m.salaId}</div>
        <div class="muted">Inscritos: ${m.inscritos?.length || 0}</div>`;
      container.appendChild(c);
    });
  } catch (err) {
    console.error("Erro ao carregar matérias do professor", err);
  }
}
