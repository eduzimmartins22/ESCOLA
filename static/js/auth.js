// auth.js
// Assumimos endpoints: POST /api/auth/login  { role, cpf, senha } -> { user }
//                  POST /api/auth/logout
//                  POST /api/users/coordenadores  -> criar coordenador (usado por register)
const COORD_MASTER_KEY_FRONTEND = "fn@2025";
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

function register(role) {
  if (role === 'coordenador') {
    // Esconde a tela de login principal
    document.getElementById('auth').style.display = 'none';
    // Mostra a tela de cadastro de coordenador
    document.getElementById('c_register_form').style.display = 'block';
  }
}

async function login(role, btn) {
  try {
    setLoading(btn, true, 'Entrando...');
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
    if (!cpf || !senha) { setLoading(btn, false); return alert('Preencha CPF e senha.'); }
    if (!cpfRegex.test(cpf)) { setLoading(btn, false); return alert('CPF inválido. Use 11 dígitos.'); }

    const data = await API.login(cpf, senha, role);
    if (!data || !data.user) throw new Error('Resposta inválida do servidor');

    window.appState.user = { ...data.user, role };
    saveSession(window.appState.user);
    registrarLog('in'); // registra local e no servidor
    enterApp();
  } catch (err) {
    console.error(err);
    alert(err.body?.message || err.message || 'Erro no login');
    // Erro! Reseta o botão
    setLoading(btn, false);
  }
}

async function submitRegister(role, btn) {
  try {
    setLoading(btn, true, 'Cadastrando...');
    if (role !== 'coordenador') return;
    const nome = val('reg_c_nome');
    const cpf = (val('reg_c_cpf') || '').replace(/[^\d]/g, '');
    const mat = val('reg_c_mat');
    const senha = val('reg_c_senha');
    // ### LEITURA DA CHAVE MESTRE ###
    const masterKey = val('reg_c_masterkey'); 

    // ### VALIDAÇÃO DA CHAVE MESTRE (INSEGURA - APENAS FRONTEND) ###
    if (!masterKey || masterKey !== COORD_MASTER_KEY_FRONTEND) {
        return alert('Chave Mestra inválida!');
    }
    // ### FIM DA VALIDAÇÃO ###

    if (!nome || !cpf || !senha) return alert('Preencha nome, CPF e senha.');
    if (!cpfRegex.test(cpf)) return alert('CPF inválido.');

    const payload = { nome, cpf, mat, senha, role: role };
    // Não enviamos a masterKey para o backend nesta versão simples
    await API.createUser(payload); 

    alert('Coordenador cadastrado!');
    document.getElementById('c_register_form').style.display = 'none';
    document.getElementById('auth').style.display = 'block'; // Volta para a tela de login
  } catch (err) {
    console.error(err);
    alert(err.body?.message || 'Erro ao cadastrar');
    setLoading(btn, false); // Reseta no erro
  }
}

function cancelarCadastro() {
  // Limpa os campos do formulário (opcional)
  byId('reg_c_nome').value = '';
  byId('reg_c_cpf').value = '';
  byId('reg_c_mat').value = '';
  byId('reg_c_senha').value = '';
  byId('reg_c_masterkey').value = ''; 

  // Esconde o formulário de cadastro
  document.getElementById('c_register_form').style.display = 'none';
  // Mostra o formulário de login novamente
  document.getElementById('auth').style.display = 'block'; 
}

function logout() {
  try {
    // Envia o log ANTES de limpar a sessão
    registrarLog("out"); 

    // Garante que todas as secções da app são escondidas
    document.querySelectorAll('main section').forEach(s => s.classList.add('hidden')); 

    // Limpa a sessão
    window.appState.user = null;
    clearSession();
    
    // --- CORREÇÃO AQUI: Reseta os botões de login ---
    resetAllLoginButtons();
    // -----------------------------------------------

    showAuth(); // Esconde #app e mostra #auth

  } catch (e) {
     console.error("Erro durante o logout:", e);
     document.querySelectorAll('main section').forEach(s => s.classList.add('hidden')); 
     window.appState.user = null;
     clearSession();
     resetAllLoginButtons(); // Garante o reset mesmo com erro
     showAuth();
  }
}

// Função auxiliar para restaurar os botões
function resetAllLoginButtons() {
  // Seleciona todos os botões dentro da secção de auth que possam estar "presos"
  const buttons = document.querySelectorAll('#auth .btn');
  
  buttons.forEach(btn => {
    // Usa a nossa função utilitária setLoading com 'false' para destravar
    // Se o botão tiver texto original salvo, ele restaura. 
    // Se não tiver (porque a página foi recarregada), definimos manualmente.
    
    setLoading(btn, false);

    // Força o texto correto baseado no contexto (caso o _originalText tenha sido perdido)
    if (btn.innerText === 'Entrando...') btn.innerText = 'Entrar';
    if (btn.innerText === 'Cadastrando...') btn.innerText = 'Cadastrar';
  });
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
  console.log(">> enterApp: Iniciando exibição do app..."); 
  showApp(); // Mostra o container principal da app
  byId('ub-nome').textContent = window.appState.user.nome;
  byId('ub-role').textContent = window.appState.user.role.toUpperCase();
  console.log(">> enterApp: Chamando showMenuForRole..."); 
  showMenuForRole(window.appState.user.role); // Configura o menu correto

  // ### ADIÇÃO PARA ABRIR TAB PADRÃO ###
  // Define os IDs das tabs padrão para cada papel
  const defaultTabs = {
      aluno: 'a_materias',
      professor: 'p_dashboard',
      coordenador: 'c_dash'
  };
  const userRole = window.appState.user.role;
  const defaultTabId = defaultTabs[userRole]; // Obtém o ID da tab padrão

  if (defaultTabId) {
      // Encontra o botão correspondente no menu para poder destacá-lo
      const defaultButton = document.querySelector(`#menu-${userRole} button[data-tab='${defaultTabId}']`);
      console.log(`>> enterApp: Abrindo tab padrão '${defaultTabId}' para ${userRole}...`, defaultButton);
      // Chama openTab para mostrar a secção correta e destacar o botão
      openTab(defaultTabId, defaultButton); 
  } else {
       console.warn(">> enterApp: Não foi possível determinar a tab padrão para o papel:", userRole);
       // Opcional: Esconder todas as tabs se nenhuma padrão for encontrada
       document.querySelectorAll('main section').forEach(s => s.classList.add('hidden'));
  }
  // ### FIM DA ADIÇÃO ###

  // A linha refreshAllSelectsAsync() foi movida para o script inline do HTML após restoreSession
  // refreshAllSelectsAsync(); // Não chamar aqui novamente se já chamado no HTML

  console.log(">> enterApp: Finalizada."); 
}

function showMenuForRole(role) {
  console.log(">> showMenuForRole: Configurando menu para:", role);

  // 1. Esconde todos os menus primeiro
  ['menu-aluno', 'menu-professor', 'menu-coordenador'].forEach(id => byId(id)?.classList.add('hidden'));

  // 2. Obtém os dados do utilizador logado
  const user = window.appState.user || {};

  // 3. Mostra menus com base no papel E na flag
  if (role === 'aluno') {
    byId('menu-aluno')?.classList.remove('hidden');
  }

  if (role === 'professor') {
    byId('menu-professor')?.classList.remove('hidden');
    // SE for professor E assistente, mostra o menu de coordenador também
    if (user.is_assistente) {
      byId('menu-coordenador')?.classList.remove('hidden');
      console.log(">> showMenuForRole: Professor Assistente detectado, exibindo menu Coordenador.");
    }
  }

  if (role === 'coordenador') {
    byId('menu-coordenador')?.classList.remove('hidden');
    // (Opcional: se quiser que coordenador também veja menu professor, descomente a linha abaixo)
    // byId('menu-professor')?.classList.remove('hidden'); 
  }

  // 4. Liga os botões de clique (código original)
  document.querySelectorAll('.menu button[data-tab]').forEach(btn => {
    btn.onclick = async () => { 
        console.log(">> Click no botão do menu:", btn.dataset.tab); 
        await openTab(btn.dataset.tab, btn); 
    }
  });
  console.log(">> showMenuForRole: Finalizada.");
}

async function openTab(id, btn) {
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
  if (id === "a_desafio") {
    console.log(">> openTab: Chamando renderDesafioView...");
    await renderDesafioView();
  }
  if (id === "p_materias") {
     console.log(">> openTab: Chamando renderProfMaterias..."); // LOG
     renderProfMaterias();
  }
  if (id === "p_questoes") {
    console.log(">> openTab: Chamando renderPQSelects (await)..."); 
    await renderPQSelects(); // <-- Adiciona 'await'
    console.log(">> openTab: Chamando renderResumoQuestoes e renderListaPerguntas...");
    renderResumoQuestoes();
    renderListaPerguntas(); // Isto agora lerá o <select> de filtro (que estará vazio)
  }
  if (id === "p_biblioteca") {
    console.log(">> openTab: Chamando renderBiblioteca...");
    await renderBiblioteca();
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
  if (id === "p_dashboard") {
   await refreshAllSelectsAsync();
   fillSelectWithMateriasId('p_dash_materia', window.appState.materias, true);

   // Limpa a tela anterior
   byId('p_dash_content').classList.add('hidden');
   sel('p_dash_materia').value = "";

   // Liga o evento
   sel('p_dash_materia').onchange = carregarDashboardProfessor;
  }
  if (id === 'p_ver_sala') {
    console.log(">> openTab: Chamando renderSalasProfessorSelect..."); // Log
    renderSalasProfessorSelect(); // Precisamos criar esta função
    // Não renderiza a tabela de alunos automaticamente, espera o clique no botão
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
    body: JSON.stringify({ role, cpf, senha })
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Erro");
  return data.user;
}
