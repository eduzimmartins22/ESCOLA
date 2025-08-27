/* ========= Módulo de Autenticação ========= */

// Estado de autenticação
let authState = {
  user: null,
  mode: 'login'
};

// Inicialização do módulo de autenticação
function initAuth() {
  bindRoleTabs();
  restoreSession();
}

// Gerenciamento das abas de papel (aluno, professor, coordenador)
function bindRoleTabs() {
  document.querySelectorAll('.role-tabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      setActiveRoleTab(btn.dataset.role);
    });
  });
}

function setActiveRoleTab(role) {
  // Atualizar botões ativos
  document.querySelectorAll('.role-tabs button').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-role="${role}"]`).classList.add('active');
  
  // Mostrar/ocultar formulários
  ['aluno', 'professor', 'coordenador'].forEach(r => {
    const form = document.getElementById('form-' + r);
    if (form) {
      form.classList.toggle('hidden', r !== role);
    }
  });
}

// Alternância entre modo login e cadastro
function toggleMode() {
  authState.mode = authState.mode === 'login' ? 'cadastro' : 'login';
  showAlert('Modo: ' + authState.mode.toUpperCase());
}

// Cadastro de usuários
function register(role) {
  console.log('=== FUNÇÃO REGISTER ORIGINAL EXECUTADA ===');
  console.log('Role recebido:', role);
  
  const userData = getFormData(role);
  console.log('1. userData obtido:', userData);
  
  if (!validateUserData(userData, role)) {
    console.log('2. Validação falhou - parando aqui');
    return;
  }
  console.log('2. Validação passou');

  const users = LS.get('users', { alunos: [], professores: [], coordenadores: [] });
  console.log('3. Users carregados:', users);

  // Verificar se usuário já existe
  if (userExists(users, userData, role)) {
    const identifier = role === 'aluno' ? 'RA' : 'CPF';
    console.log('4. Usuário já existe - parando aqui');
    showAlert(`${identifier} já cadastrado.`);
    return;
  }
  console.log('4. Usuário não existe, continuando');

  // Criar novo usuário
  const newUser = createUser(userData, role);
  console.log('5. Novo usuário criado:', newUser);
  
  // Corrigir mapeamento de roles
  const roleMap = {
    'aluno': 'alunos',
    'professor': 'professores', 
    'coordenador': 'coordenadores'
  };
  
  const userType = roleMap[role];
  console.log('6a. Tipo de usuário mapeado:', userType);
  console.log('6b. Array existe?', users[userType]);
  
  users[userType].push(newUser);
  LS.set('users', users);
  console.log('6. Usuário salvo');
  
  showAlert(`${cap(role)} cadastrado com sucesso!`);
  console.log('7. Alert mostrado');
  
  clearForm(role);
  console.log('8. Form limpo');
  
  // Fazer login automático após cadastro
  console.log('9. Iniciando login automático...');
  authState.user = { ...newUser, role };
  SS.set('sessionUser', authState.user);
  registrarLog('in');
  
  enterApp();
  console.log('10. Login automático realizado');
  
  // Atualizar selects se necessário
  if (role === 'aluno') {
    populateLoginSalaSelects();
    console.log('11. Selects atualizados');
  }
  
  console.log('12. Registro finalizado com sucesso');
}

// Login de usuários
function login(role) {
  const credentials = getLoginCredentials(role);
  
  if (!validateCredentials(credentials, role)) {
    return;
  }

  const users = LS.get('users', { alunos: [], professores: [], coordenadores: [] });
  const user = findUser(users, credentials, role);
  
  if (!user) {
    showAlert('Credenciais inválidas.');
    return;
  }

  // Realizar login
  authState.user = { ...user, role };
  SS.set('sessionUser', authState.user);
  registrarLog('in');
  

  enterApp();
}

// Logout
function logout() {
  if (authState.user) {
    registrarLog('out');
  }
  
  authState.user = null;
  SS.remove('sessionUser');
  
  // Voltar para tela de login
  hide('app');
  show('auth');
}

// Restaurar sessão
function restoreSession() {
  const savedUser = SS.get('sessionUser');
  if (savedUser) {
    authState.user = savedUser;
    enterApp();
  }
}

// Obter dados do formulário
function getFormData(role) {
  switch (role) {
    case 'aluno':
      return {
        nome: val('a_nome'),
        ra: val('a_ra'),
        senha: val('a_senha'),
        salaId: sel('a_salaSelect').value || null
      };
    case 'professor':
      return {
        nome: val('p_nome'),
        cpf: cleanCPF(val('p_cpf')),
        mat: val('p_mat'),
        senha: val('p_senha')
      };
    case 'coordenador':
      return {
        nome: val('c_nome'),
        cpf: cleanCPF(val('c_cpf')),
        mat: val('c_mat'),
        senha: val('c_senha')
      };
    default:
      return {};
  }
}

// Obter credenciais de login
function getLoginCredentials(role) {
  switch (role) {
    case 'aluno':
      return {
        ra: val('a_ra'),
        senha: val('a_senha')
      };
    case 'professor':
    case 'coordenador':
      return {
        cpf: cleanCPF(val(role[0] + '_cpf')),
        senha: val(role[0] + '_senha')
      };
    default:
      return {};
  }
}

// Validar dados do usuário
function validateUserData(data, role) {
  if (!isValidName(data.nome)) {
    showAlert('Nome deve ter pelo menos 2 caracteres.');
    return false;
  }
  
  if (!isValidPassword(data.senha)) {
    showAlert('Senha deve ter pelo menos 4 caracteres.');
    return false;
  }
  
  if (role === 'aluno') {
    if (!isValidRA(data.ra)) {
      showAlert('RA deve ter pelo menos 3 caracteres.');
      return false;
    }
  } else {
    if (!isValidCPF(data.cpf)) {
      showAlert('CPF deve conter 11 dígitos.');
      return false;
    }
  }
  
  return true;
}

// Validar credenciais de login
function validateCredentials(credentials, role) {
  if (role === 'aluno') {
    if (!credentials.ra || !credentials.senha) {
      showAlert('Preencha RA e senha.');
      return false;
    }
  } else {
    if (!credentials.cpf || !credentials.senha) {
      showAlert('Preencha CPF e senha.');
      return false;
    }
  }
  
  return true;
}

// Verificar se usuário já existe
function userExists(users, userData, role) {
  const roleMap = {
    'aluno': 'alunos',
    'professor': 'professores', 
    'coordenador': 'coordenadores'
  };
  
  const userList = users[roleMap[role]] || [];
  
  if (role === 'aluno') {
    return userList.some(u => u.ra === userData.ra);
  } else {
    return userList.some(u => u.cpf === userData.cpf);
  }
}

// Encontrar usuário para login
function findUser(users, credentials, role) {
  const roleMap = {
    'aluno': 'alunos',
    'professor': 'professores', 
    'coordenador': 'coordenadores'
  };
  
  const userList = users[roleMap[role]] || [];
  
  if (role === 'aluno') {
    return userList.find(u => u.ra == credentials.ra && u.senha === credentials.senha);
  } else {
    return userList.find(u => u.cpf == credentials.cpf && u.senha === credentials.senha);
  }
}

// Criar novo usuário
function createUser(userData, role) {
  return {
    id: uid(),
    ...userData,
    createdAt: getCurrentDateTime()
  };
}

// Limpar formulário
function clearForm(role) {
  const fields = {
    aluno: ['a_nome', 'a_ra', 'a_senha'],
    professor: ['p_nome', 'p_cpf', 'p_mat', 'p_senha'],
    coordenador: ['c_nome', 'c_cpf', 'c_mat', 'c_senha']
  };
  
  const fieldList = fields[role] || [];
  fieldList.forEach(fieldId => {
    const field = byId(fieldId);
    if (field) field.value = '';
  });
}

// Registrar log de entrada/saída
function registrarLog(type) {
  const logs = LS.get('logs', []);
  
  if (type === 'in') {
    const newLog = {
      id: uid(),
      user: authState.user?.nome || getUserNameFromForm(),
      role: authState.user?.role || getActiveRole(),
      in: getCurrentDateTime(),
      out: null
    };
    logs.push(newLog);
  } else if (type === 'out' && authState.user) {
    // Encontrar log em aberto para este usuário
    const openLog = [...logs].reverse().find(l => 
      l.user === authState.user.nome && 
      l.role === authState.user.role && 
      !l.out
    );
    if (openLog) {
      openLog.out = getCurrentDateTime();
    }
  }
  
  // Manter apenas os últimos logs
  LS.set('logs', logs.slice(-CONFIG.MAX_LOGS));
}

// Funções auxiliares
function getUserNameFromForm() {
  return val('a_nome') || val('p_nome') || val('c_nome') || 'Usuário';
}

function getActiveRole() {
  return document.querySelector('.role-tabs .active')?.dataset.role || 'aluno';
}

function populateLoginSalaSelects() {
  const salas = LS.get('salas', []);
  const select = byId('a_salaSelect');
  if (select) {
    select.innerHTML = '<option value="">(opcional)</option>' + 
      salas.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');
  }
}

// Obter usuário atual
function getCurrentUser() {
  return authState.user;
}

// Verificar se usuário está logado
function isLoggedIn() {
  return authState.user !== null;
}

// Verificar papel do usuário
function hasRole(role) {
  return authState.user?.role === role;
}

function enterApp() {
  hide('auth');       // esconde a tela de login
  show('app');        // mostra a tela principal

  const currentUser = AuthModule.getCurrentUser();
  if (currentUser) {
    // Atualiza nome e role na sidebar
    setText('ub-nome', currentUser.nome);
    setText('ub-role', currentUser.role.toUpperCase());

    // Mostra os menus da role certa
    showMenuForRole(currentUser.role);

    // Abre a primeira aba do menu
    openFirstTab(currentUser.role);

    // Atualiza selects do sistema
    refreshAllSelects();

    // Se for coordenador, carrega o dashboard
    if (currentUser.role === 'coordenador') {
      renderDashboard();
    }
  }
}


// Atualizar dados do usuário na sessão
function updateUserSession(updates) {
  if (authState.user) {
    authState.user = { ...authState.user, ...updates };
    SS.set('sessionUser', authState.user);
  }
}

// Exportar módulo
if (typeof window !== 'undefined') {
  window.AuthModule = {
    init: initAuth,
    register,
    login,
    logout,
    toggleMode,
    getCurrentUser,
    isLoggedIn,
    hasRole,
    updateUserSession,
    populateLoginSalaSelects
  };
  
 
  window.register = register;
  window.login = login;
  window.logout = logout;
  window.toggleMode = toggleMode;
}