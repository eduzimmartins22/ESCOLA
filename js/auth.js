function initData() {
  if (!LS.get("users")) {
    LS.set("users", { alunos: [], professores: [], coordenadores: [] });
  }
  if (!LS.get("salas")) LS.set("salas", []);
  if (!LS.get("materias")) LS.set("materias", []);
  if (!LS.get("banners")) LS.set("banners", []);
  if (!LS.get("logs")) LS.set("logs", []); // {user, role, in, out?}
  if (!LS.get("ranking")) LS.set("ranking", []); // {nome, score}
  if (!LS.get("stats")) LS.set("stats", { respostas: 0 });
}

/* ========= Login / Cadastro ========= */
function bindRoleTabs() {
  document.querySelectorAll(".role-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".role-tabs button")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      ["aluno", "professor", "coordenador"].forEach((r) => {
        document
          .getElementById("form-" + r)
          .classList.toggle("hidden", r !== btn.dataset.role);
      });
    });
  });
}

function register(role) {
  const users = LS.get("users");
  const cpfRegex = /^\d{11}$/;

  if (role === "aluno") {
    const nome = val("a_nome"),
      ra = val("a_ra"),
      senha = val("a_senha");
    if (!nome || !ra || !senha) return alert("Preencha nome, RA e senha.");
    if (users.alunos.some((a) => a.ra === ra))
      return alert("RA já cadastrado.");
    const salaId = sel("a_salaSelect").value || null;
    users.alunos.push({ id: uid(), nome, ra, senha, salaId });
    LS.set("users", users);
    alert("Aluno cadastrado!");
  }
  if (role === "professor") {
    const nome = val("p_nome"),
      cpf = val("p_cpf"),
      mat = val("p_mat"),
      senha = val("p_senha");
    if (!nome || !cpf || !senha) return alert("Preencha nome, CPF e senha.");

    const cpfLimpo = cpf.replace(/[^\d]/g, "");
    if (!cpfRegex.test(cpfLimpo)) return alert("CPF inválido. Use 11 dígitos numéricos.");

    if (users.professores.some((p) => p.cpf === cpfLimpo))
      return alert("CPF já cadastrado.");
    users.professores.push({ id: uid(), nome, cpf: cpfLimpo, mat, senha });
    LS.set("users", users);
    alert("Professor cadastrado!");
  }
  if (role === "coordenador") {
    const nome = val("c_nome"),
      cpf = val("c_cpf"),
      mat = val("c_mat"),
      senha = val("c_senha");
    if (!nome || !cpf || !senha) return alert("Preencha nome, CPF e senha.");

    const cpfLimpo = cpf.replace(/[^\d]/g, "");
    if (!cpfRegex.test(cpfLimpo)) return alert("CPF inválido. Use 11 dígitos numéricos.");

    if (users.coordenadores.some((p) => p.cpf === cpfLimpo))
      return alert("CPF já cadastrado.");
    users.coordenadores.push({ id: uid(), nome, cpf: cpfLimpo, mat, senha });
    LS.set("users", users);
    alert("Coordenador cadastrado!");
  }
  populateLoginSalaSelects();
}

function login(role) {
  const users = LS.get("users");
  let user = null;
  if (role === "aluno") {
    const ra = val("a_ra"),
      senha = val("a_senha");
    user = users.alunos.find((u) => u.ra == ra && u.senha === senha);
  } else if (role === "professor") {
    const cpf = val("p_cpf").replace(/[^\d]/g, ""),
      senha = val("p_senha");
    user = users.professores.find((u) => u.cpf == cpf && u.senha === senha);
  } else {
    const cpf = val("c_cpf").replace(/[^\d]/g, ""),
      senha = val("c_senha");
    user = users.coordenadores.find((u) => u.cpf == cpf && u.senha === senha);
  }
  if (!user) return alert("Credenciais inválidas.");
  state.user = { ...user, role };
  sessionStorage.setItem("sessionUser", JSON.stringify(state.user));
  registrarLog("in");
  enterApp();
}

function logout() {
  registrarLog("out");
  state.user = null;
  sessionStorage.removeItem("sessionUser");
  document.getElementById("app").style.display = "none";
  document.getElementById("auth").style.display = "block";
}

function restoreSession() {
  const u = sessionStorage.getItem("sessionUser");
  if (!u) return;
  state.user = JSON.parse(u);
  enterApp();
}

function registrarLog(type) {
  const logs = LS.get("logs");
  if (type === "in") {
    logs.push({
      id: uid(),
      user: state.user?.nome || val("a_nome") || val("p_nome") || val("c_nome"),
      role:
        state.user?.role ||
        document.querySelector(".role-tabs .active")?.dataset.role,
      in: new Date().toLocaleString(),
      out: null,
    });
  } else {
    const open = [...logs]
      .reverse()
      .find((l) => l.user === state.user.nome && !l.out);
    if (open) open.out = new Date().toLocaleString();
  }
  LS.set("logs", logs);
}

/* ========= Entrar na aplicação ========= */
function enterApp() {
  document.getElementById("auth").style.display = "none";
  document.getElementById("app").style.display = "block";
  byId("ub-nome").textContent = state.user.nome;
  byId("ub-role").textContent = state.user.role.toUpperCase();

  // menus
  showMenuForRole(state.user.role);
  // carregar selects
  refreshAllSelects();
  // abrir primeira aba do papel
  openFirstTab(state.user.role);
  // dashboard números
  if (state.user.role === "coordenador") renderDashboard();
}

function showMenuForRole(role) {
  ["menu-aluno", "menu-professor", "menu-coordenador"].forEach((id) =>
    byId(id).classList.add("hidden")
  );
  if (role === "aluno") byId("menu-aluno").classList.remove("hidden");
  if (role === "professor") byId("menu-professor").classList.remove("hidden");
  if (role === "coordenador")
    byId("menu-coordenador").classList.remove("hidden");
  // bind navegação
  document.querySelectorAll(".menu button[data-tab]").forEach((btn) => {
    btn.onclick = () => openTab(btn.dataset.tab, btn);
  });
}

function openFirstTab(role) {
  const first = {
    aluno: "a_materias",
    professor: "p_materias",
    coordenador: "c_dash",
  }[role];
  openTab(first, document.querySelector(`.menu button[data-tab="${first}"]`));
}
function openTab(id, btn) {
  document
    .querySelectorAll("main section")
    .forEach((s) => s.classList.add("hidden"));
  byId(id).classList.remove("hidden");
  document
    .querySelectorAll(".menu button")
    .forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  // renders por aba
  if (id === "a_materias") {
    renderAlunoMaterias();
    renderBannersAluno();
  }
  if (id === "a_sala") {
    renderSalasAlunoSelects();
    renderAlunosSala();
  }
  if (id === "a_ranking") {
    renderRankingSelects();
    // Se o usuário já tem uma sala, mostrar ranking automaticamente
    if (state.user.salaId) {
      const materias = LS.get("materias").filter(m => m.salaId === state.user.salaId);
      if (materias.length === 1) {
        setTimeout(() => {
          sel("a_selRankMateria").value = materias[0].id;
          renderRanking(state.user.salaId, materias[0].id);
        }, 100);
      }
    }
  }
  if (id === "p_materias") {
    renderProfMaterias();
  }
  if (id === "p_questoes") {
    renderPQSelects();
    renderResumoQuestoes();
  }
  if (id === "p_conteudos") {
    renderPConteudos();
  }
  if (id === "p_ranking") {
    renderRankingProfessorSelects();  // adicionei aqui
  }
  if (id === "c_dash") {
    renderDashboard();
  }
  if (id === "c_salas") {
    renderSalasCoord();
  }
  if (id === "c_materias") {
    renderMateriasCoord();
  }
  if (id === "c_prof") {
    renderProfsCoord();
  }
  if (id === "c_banners") {
    renderBannersCoord();
  }
}
