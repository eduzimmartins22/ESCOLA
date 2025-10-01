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
const cpfRegex = /^\d{11}$/;

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

function login(role) {
  const users = LS.get("users");
  let user = null;

  if (role === "aluno") {
    const cpf = val("a_cpf").replace(/[^\d]/g, ""),
      senha = val("a_senha");
    if (!cpf || !senha) return alert("Preencha o CPF e a senha.");
    if (!cpfRegex.test(cpf))
      return alert("CPF inválido. Use 11 dígitos numéricos.");
    user = users.alunos.find((u) => u.cpf === cpf && u.senha === senha);
  } else if (role === "professor") {
    const cpf = val("p_cpf").replace(/[^\d]/g, ""),
      senha = val("p_senha");
    if (!cpf || !senha) return alert("Preencha o CPF e a senha.");
    if (!cpfRegex.test(cpf))
      return alert("CPF inválido. Use 11 dígitos numéricos.");
    user = users.professores.find((u) => u.cpf === cpf && u.senha === senha);
  } else {
    const cpf = val("c_cpf").replace(/[^\d]/g, ""),
      senha = val("c_senha");
    if (!cpf || !senha) return alert("Preencha o CPF e a senha.");
    if (!cpfRegex.test(cpf))
      return alert("CPF inválido. Use 11 dígitos numéricos.");
    user = users.coordenadores.find((u) => u.cpf === cpf && u.senha === senha);
  }

  if (!user) return alert("Credenciais inválidas.");

  state.user = { ...user, role };
  sessionStorage.setItem("sessionUser", JSON.stringify(state.user));
  registrarLog("in");
  enterApp();
}

function register(role) {
  if (role !== "coordenador") return;

  const senhaMestra = prompt(
    "Digite a senha mestra para autorizar o cadastro:"
  );
  if (senhaMestra !== COORD_MASTER_PASSWORD) {
    return alert("Senha mestra incorreta. Cadastro não permitido.");
  }

  document.getElementById("auth").style.display = "none";
  document.getElementById("c_register_form").style.display = "block";
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
  if (!u) {
    document.getElementById("auth").style.display = "block";
    document.getElementById("app").style.display = "none";
    return;
  }
  state.user = JSON.parse(u);
  enterApp();
}

function registrarLog(type) {
  const logs = LS.get("logs");
  if (type === "in") {
    logs.push({
      id: uid(),
      user: state.user?.nome,
      role: state.user?.role,
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

function enterApp() {
  document.getElementById("auth").style.display = "none";
  document.getElementById("app").style.display = "block";
  byId("ub-nome").textContent = state.user.nome;
  byId("ub-role").textContent = state.user.role.toUpperCase();

  showMenuForRole(state.user.role);
  refreshAllSelects();
  openFirstTab(state.user.role);
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

  refreshAllSelects();

  if (id === "a_materias") {
    renderAlunoMaterias();
    renderBannersAluno();
  }
  if (id === "a_sala") {
    renderSalasAlunoSelects();
    renderAlunosSala();
  }
  if (id === "a_ranking") {
    renderRanking();
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
  if (id === "c_alunos") {
    renderAlunosCoord();
  }
  if (id === "c_banners") {
    renderBannersCoord();
  }
}
