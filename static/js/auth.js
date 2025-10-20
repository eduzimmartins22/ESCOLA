// auth.js
// Assumimos endpoints: POST /api/auth/login  { role, cpf, senha } -> { user }
//                  POST /api/auth/logout
//                  POST /api/users/coordenadores  -> criar coordenador (usado por register)

const cpfRegex = /^\d{11}$/;

function bindRoleTabs() {
  document.querySelectorAll(".role-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".role-tabs button")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      ["aluno", "professor", "coordenador"].forEach((r) => {
        const el = document.getElementById("form-" + r);
        if (!el) return;
        el.classList.toggle("hidden", r !== btn.dataset.role);
      });
    });
  });
}

function register(role) {
  if (role === "coordenador") {
    // Esconde a tela de login principal
    document.getElementById("auth").style.display = "none";
    // Mostra a tela de cadastro de coordenador
    document.getElementById("c_register_form").style.display = "block";
  }
}

async function login(role) {
  try {
    let cpf, senha;
    if (role === "aluno") {
      cpf = (val("a_cpf") || "").replace(/[^\d]/g, "");
      senha = val("a_senha");
    } else if (role === "professor") {
      cpf = (val("p_cpf") || "").replace(/[^\d]/g, "");
      senha = val("p_senha");
    } else {
      cpf = (val("c_cpf") || "").replace(/[^\d]/g, "");
      senha = val("c_senha");
    }
    if (!cpf || !senha) return alert("Preencha CPF e senha.");
    if (!cpfRegex.test(cpf)) return alert("CPF inválido. Use 11 dígitos.");

    const data = await API.login(cpf, senha, role);
    if (!data || !data.user) throw new Error("Resposta inválida do servidor");

    window.appState.user = { ...data.user, role };
    saveSession(window.appState.user);
    registrarLog("in"); // registra local e no servidor
    enterApp();
  } catch (err) {
    console.error(err);
    alert(err.body?.message || err.message || "Erro no login");
  }
}

async function submitRegister(role) {
  // usado para cadastro de coordenador via form de registro
  try {
    if (role !== "coordenador") return;
    const nome = val("reg_c_nome");
    const cpf = (val("reg_c_cpf") || "").replace(/[^\d]/g, "");
    const mat = val("reg_c_mat");
    const senha = val("reg_c_senha");

    if (!nome || !cpf || !senha) return alert("Preencha todos os campos.");
    if (!cpfRegex.test(cpf)) return alert("CPF inválido.");

    // ### CORREÇÃO ABAIXO ###
    // 1. Adicionamos o 'role' ao payload para o backend saber que é um coordenador.
    // 2. Chamamos a função correta: API.createUser
    const payload = { nome, cpf, mat, senha, role: role };
    await API.createUser(payload);

    alert("Coordenador cadastrado!");
    document.getElementById("c_register_form").style.display = "none";
    document.getElementById("auth").style.display = "block";
  } catch (err) {
    console.error(err);
    alert(err.body?.message || err.message || "Erro ao cadastrar coordenador");
  }
}

function logout() {
  try {
    // Envia o log ANTES de limpar a sessão
    registrarLog("out"); 

    // Limpa a sessão e mostra a tela de login imediatamente
    window.appState.user = null;
    clearSession();
    showAuth();

  } catch (e) {
     console.error("Erro durante o logout:", e);
     // Garante que mesmo com erro, a sessão seja limpa e a tela de auth mostrada
     window.appState.user = null;
     clearSession();
     showAuth();
  }
}

// session restore on page load
async function restoreSession() {
  const s = getSession();
  if (!s) {
    showAuth();
    return;
  }
  window.appState.user = s;
  enterApp();
}

function enterApp() {
  console.log(">> enterApp: Iniciando exibição do app..."); // LOG
  showApp();
  byId('ub-nome').textContent = window.appState.user.nome;
  byId('ub-role').textContent = window.appState.user.role.toUpperCase();
  console.log(">> enterApp: Chamando showMenuForRole..."); // LOG
  showMenuForRole(window.appState.user.role);
  // refreshAllSelectsAsync já é chamado no script inline do HTML, não precisa chamar aqui de novo
  refreshAllSelectsAsync();
  console.log(">> enterApp: Finalizada."); // LOG
}

function showMenuForRole(role) {
  console.log(">> showMenuForRole: Configurando menu para:", role); // LOG
  ["menu-aluno", "menu-professor", "menu-coordenador"].forEach((id) =>
    byId(id)?.classList.add("hidden")
  );
  if (role === "aluno") byId("menu-aluno")?.classList.remove("hidden");
  if (role === "professor") byId("menu-professor")?.classList.remove("hidden");
  if (role === "coordenador")
    byId("menu-coordenador")?.classList.remove("hidden");
  document.querySelectorAll('.menu button[data-tab]').forEach(btn => {
    btn.onclick = () => {
        console.log(">> Click no botão do menu:", btn.dataset.tab); // LOG CLICK
        openTab(btn.dataset.tab, btn);
    }
  });
  console.log(">> showMenuForRole: Finalizada."); // LOG
}

function openTab(id, btn) {
  console.log(">> openTab: Abrindo tab:", id); // LOG
  document
    .querySelectorAll("main section")
    .forEach((s) => s.classList.add("hidden"));
  byId(id)?.classList.remove("hidden");
  document
    .querySelectorAll(".menu button")
    .forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");

  // rotações que precisam de fetch
  if (id === "a_materias") {
    console.log(">> openTab: Chamando renderAlunoMaterias e renderBannersAluno..."); // LOG
    renderAlunoMaterias();
    renderBannersAluno();
  }
  if (id === "a_sala") {
    console.log(">> openTab: Chamando renderSalasAlunoSelects e renderAlunosSala..."); // LOG
    renderSalasAlunoSelects();
    renderAlunosSala();
  }
  if (id === "a_ranking") {
    console.log(">> openTab: Chamando renderRanking..."); // LOG
    renderRanking();
  }
  if (id === "p_materias") {
     console.log(">> openTab: Chamando renderProfMaterias..."); // LOG
     renderProfMaterias();
  }
  if (id === "p_questoes") {
    console.log(">> openTab: Chamando renderPQSelects e renderResumoQuestoes..."); // LOG
    renderPQSelects();
    renderResumoQuestoes();
  }
  if (id === "p_conteudos") {
    console.log(">> openTab: Chamando renderPConteudos..."); // LOG
    renderPConteudos();
  }
  if (id === "c_dash") {
    console.log(">> openTab: Chamando renderDashboard..."); // LOG
    renderDashboard();
  }
  if (id === "c_salas") {
    console.log(">> openTab: Chamando renderSalasCoord..."); // LOG
    renderSalasCoord();
  }
  if (id === "c_materias") {
    console.log(">> openTab: Chamando renderMateriasCoord..."); // LOG
    renderMateriasCoord();
  }
  if (id === "c_prof") {
    console.log(">> openTab: Chamando renderProfsCoord..."); // LOG
    renderProfsCoord();
  }
  if (id === "c_alunos") {
    console.log(">> openTab: Chamando renderAlunosCoord..."); // LOG
    renderAlunosCoord();
  }
  if (id === "c_banners") {
    console.log(">> openTab: Chamando renderBannersCoord..."); // LOG
    renderBannersCoord();
  }
  console.log(">> openTab: Finalizada para tab:", id); // LOG
}

/* logs locais + enviar ao servidor */
async function registrarLog(type) {
  const user = window.appState.user;
  if (!user) return; 

  // Determina o tipo ('login' ou 'logout')
  const logType = (type === 'in') ? 'login' : (type === 'out') ? 'logout' : null; 
  if (!logType) return; // Ignora tipos inválidos (embora só usemos 'in' e 'out')

  try {
    console.log(`>> registrarLog: Enviando log tipo '${logType}' para o servidor...`);
    // Envia o log para a API
    await API.createLog({ type: logType, user: user }); 
    console.log(`>> registrarLog: Log '${logType}' enviado com sucesso.`);
  } catch (err) {
    console.error(`>> ERRO ao enviar log '${logType}' para o servidor:`, err);
  }
}

async function loginBackend(role, cpf, senha) {
  const res = await fetch("https://seu-backend.example.com/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, cpf, senha }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Erro");
  return data.user;
}
