// auth.js
// Assumimos endpoints: POST /api/auth/login  { role, cpf, senha } -> { user }
//                  POST /api/auth/logout
//                  POST /api/users/coordenadores  -> criar coordenador (usado por register)

const cpfRegex = /^\d{11}$/;

function bindRoleTabs() {
  document.querySelectorAll(".role-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".role-tabs button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      ["aluno", "professor", "coordenador"].forEach(r => {
        const el = document.getElementById("form-" + r);
        if (!el) return;
        el.classList.toggle("hidden", r !== btn.dataset.role);
      });
    });
  });
}

async function login(role) {
  try {
    let cpf, senha;
    if (role === 'aluno') {
      cpf = (val('a_cpf') || '').replace(/[^\d]/g, '');
      senha = val('a_senha');
    } else if (role === 'professor') {
      cpf = (val('p_cpf') || '').replace(/[^\d]/g, '');
      senha = val('p_senha');
    } else {
      cpf = (val('c_cpf') || '').replace(/[^\d]/g, '');
      senha = val('c_senha');
    }
    if (!cpf || !senha) return alert('Preencha CPF e senha.');
    if (!cpfRegex.test(cpf)) return alert('CPF inválido. Use 11 dígitos.');

    const data = await API.login(cpf, senha, role);
    if (!data || !data.user) throw new Error('Resposta inválida do servidor');

    window.appState.user = { ...data.user, role };
    saveSession(window.appState.user);
    registrarLog('in'); // registra local e no servidor
    enterApp();
  } catch (err) {
    console.error(err);
    alert(err.body?.message || err.message || 'Erro no login');
  }
}

async function submitRegister(role) {
  // usado para cadastro de coordenador via form de registro (senha mestra valida no backend se necessário)
  try {
    if (role !== 'coordenador') return;
    const nome = val('reg_c_nome'), cpf = (val('reg_c_cpf') || '').replace(/[^\d]/g, ''), mat = val('reg_c_mat'), senha = val('reg_c_senha');
    if (!nome || !cpf || !senha) return alert('Preencha todos os campos.');
    if (!cpfRegex.test(cpf)) return alert('CPF inválido.');

    const payload = { nome, cpf, mat, senha };
    await API.registerCoordinator(payload);
    alert('Coordenador cadastrado!');
    document.getElementById('c_register_form').style.display = 'none';
    document.getElementById('auth').style.display = 'block';
  } catch (err) {
    console.error(err);
    alert(err.body?.message || err.message || 'Erro ao cadastrar coordenador');
  }
}

function logout() {
  try {
    API.logout().catch(() => { }); // não bloquear se falhar
  } catch (e) { }
  registrarLog('out');
  window.appState.user = null;
  clearSession();
  showAuth();
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
  showApp();
  byId('ub-nome').textContent = window.appState.user.nome;
  byId('ub-role').textContent = window.appState.user.role.toUpperCase();
  showMenuForRole(window.appState.user.role);
  refreshAllSelectsAsync();
}

function showMenuForRole(role) {
  ['menu-aluno', 'menu-professor', 'menu-coordenador'].forEach(id => byId(id)?.classList.add('hidden'));
  if (role === 'aluno') byId('menu-aluno')?.classList.remove('hidden');
  if (role === 'professor') byId('menu-professor')?.classList.remove('hidden');
  if (role === 'coordenador') byId('menu-coordenador')?.classList.remove('hidden');

  document.querySelectorAll('.menu button[data-tab]').forEach(btn => {
    btn.onclick = () => openTab(btn.dataset.tab, btn);
  });
}

function openTab(id, btn) {
  document.querySelectorAll('main section').forEach(s => s.classList.add('hidden'));
  byId(id)?.classList.remove('hidden');
  document.querySelectorAll('.menu button').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  // rotações que precisam de fetch
  if (id === 'a_materias') {
    renderAlunoMaterias();
    renderBannersAluno();
  }
  if (id === 'a_sala') {
    renderSalasAlunoSelects();
    renderAlunosSala();
  }
  if (id === 'a_ranking') {
    renderRanking();
  }
  if (id === 'p_materias') {
    renderProfMaterias();
  }
  if (id === 'p_questoes') {
    renderPQSelects();
    renderResumoQuestoes();
  }
  if (id === 'p_conteudos') {
    renderPConteudos();
  }
  if (id === 'c_dash') {
    renderDashboard();
  }
  if (id === 'c_salas') {
    renderSalasCoord();
  }
  if (id === 'c_materias') {
    renderMateriasCoord();
  }
  if (id === 'c_prof') {
    renderProfsCoord();
  }
  if (id === 'c_alunos') {
    renderAlunosCoord();
  }
  if (id === 'c_banners') {
    renderBannersCoord();
  }
}

/* logs locais + enviar ao servidor */
async function registrarLog(type) {
  // local (appState.logs) + remote
  const logs = window.appState.logs || [];
  if (type === 'in') {
    const entry = { id: uid(), user: window.appState.user?.nome, role: window.appState.user?.role, in: new Date().toLocaleString(), out: null };
    logs.push(entry);
    try { await API.listLogs(); /* just to ensure server is reachable; you might want a /logs endpoint to POST */ } catch (e) { }
  } else {
    const open = [...logs].reverse().find(l => l.user === window.appState.user?.nome && !l.out);
    if (open) open.out = new Date().toLocaleString();
  }
  window.appState.logs = logs;
}


async function loginBackend(role, cpf, senha) {
  const res = await fetch("https://seu-backend.example.com/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, cpf, senha })
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Erro");
  return data.user;
}
