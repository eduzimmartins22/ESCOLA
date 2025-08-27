/* ========= Aplicação Principal - ESTUDE ========= */

// Estado global da aplicação
let appState = {
  currentUser: null,
  currentTab: null,
  initialized: false
};

/* ========= Inicialização da Aplicação ========= */
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
});

function initializeApp() {
  try {
    // Verificar se os módulos necessários estão carregados
    if (typeof DataModule === 'undefined') {
      throw new Error('DataModule não carregado');
    }
    if (typeof AuthModule === 'undefined') {
      throw new Error('AuthModule não carregado');
    }
    
    // Inicializar módulos
    DataModule.init();
    AuthModule.init();
    
    // Marcar como inicializado
    appState.initialized = true;
    
    console.log('Aplicação ESTUDE inicializada com sucesso');
  } catch (error) {
    console.error('Erro ao inicializar aplicação:', error);
    showAlert('Erro ao carregar aplicação. Verifique se todos os arquivos JS foram carregados.');
  }
}

/* ========= Funções de Navegação ========= */
function showMenuForRole(role) {
  // Ocultar todos os menus
  ['menu-aluno', 'menu-professor', 'menu-coordenador'].forEach(id => hide(id));
  
  // Mostrar menu específico
  const menuId = `menu-${role}`;
  show(menuId);
  
  // Configurar navegação dos botões
  document.querySelectorAll('.menu button[data-tab]').forEach(btn => {
    btn.onclick = () => openTab(btn.dataset.tab, btn);
  });
}

function openFirstTab(role) {
  const firstTabs = {
    aluno: 'a_materias',
    professor: 'p_materias',
    coordenador: 'c_dash'
  };
  
  const tabId = firstTabs[role];
  const button = document.querySelector(`.menu button[data-tab="${tabId}"]`);
  openTab(tabId, button);
}

function openTab(tabId, button) {
  // Ocultar todas as seções
  document.querySelectorAll('main section').forEach(section => {
    section.classList.add('hidden');
  });
  
  // Mostrar seção ativa
  show(tabId);
  
  // Atualizar botão ativo
  document.querySelectorAll('.menu button').forEach(btn => {
    btn.classList.remove('active');
  });
  if (button) button.classList.add('active');
  
  // Atualizar estado
  appState.currentTab = tabId;
  
  // Executar renderização específica da aba
  renderTabContent(tabId);
}

function renderTabContent(tabId) {
  // Verificar se UIModule existe (onde estarão as funções de renderização)
  if (typeof UIModule === 'undefined') {
    console.error('UIModule não carregado para renderizar conteúdo da aba:', tabId);
    return;
  }
  
  switch (tabId) {
    case 'a_materias':
      UIModule.renderAlunoMaterias();
      UIModule.renderBannersAluno();
      break;
    case 'a_sala':
      UIModule.renderSalasAlunoSelects();
      UIModule.renderAlunosSala();
      break;
    case 'a_ranking':
      if (typeof QuizModule !== 'undefined') {
        QuizModule.renderRanking();
      }
      break;
    case 'p_materias':
      UIModule.renderProfMaterias();
      break;
    case 'p_questoes':
      UIModule.renderPQSelects();
      UIModule.renderResumoQuestoes();
      break;
    case 'p_conteudos':
      UIModule.renderPConteudos();
      break;
    case 'c_dash':
      UIModule.renderDashboard();
      break;
    case 'c_salas':
      UIModule.renderSalasCoord();
      break;
    case 'c_materias':
      UIModule.renderMateriasCoord();
      break;
    case 'c_prof':
      UIModule.renderProfsCoord();
      break;
    case 'c_banners':
      UIModule.renderBannersCoord();
      break;
    default:
      console.warn('Aba não reconhecida:', tabId);
  }
}


window.register = (role) => {
  console.log('register chamado com role:', role);
  console.log('AuthModule disponível:', typeof AuthModule);
  
  if (typeof AuthModule !== 'undefined' && typeof AuthModule.register === 'function') {
    return AuthModule.register(role);
  } else {
 
    console.log('Tentando chamar register diretamente...');
    if (typeof register === 'function') {
      return register(role);
    } else {
      showAlert('Módulo de autenticação não carregado');
    }
  }
};

window.login = (role) => {
  if (typeof AuthModule !== 'undefined') {
    return AuthModule.login(role);
  } else {
    showAlert('Módulo de autenticação não carregado');
  }
};

window.logout = () => {
  if (typeof AuthModule !== 'undefined') {
    return AuthModule.logout();
  } else {
    showAlert('Módulo de autenticação não carregado');
  }
};

window.toggleMode = () => {
  if (typeof AuthModule !== 'undefined') {
    return AuthModule.toggleMode();
  } else {
    showAlert('Módulo de autenticação não carregado');
  }
};

// Quiz functions
window.quizTentarNovamente = () => {
  if (typeof QuizModule !== 'undefined') {
    return QuizModule.tentarNovamente();
  } else {
    showAlert('Módulo de quiz não carregado');
  }
};

window.quizSair = () => {
  if (typeof QuizModule !== 'undefined') {
    return QuizModule.sair();
  } else {
    showAlert('Módulo de quiz não carregado');
  }
};

// Interface functions - Delegar para UIModule quando disponível
window.criarSala = () => {
  if (typeof UIModule !== 'undefined') {
    return UIModule.criarSala();
  } else {
    showAlert('Módulo de interface não carregado');
  }
};

window.criarMateria = (origem) => {
  if (typeof UIModule !== 'undefined') {
    return UIModule.criarMateria(origem);
  } else {
    showAlert('Módulo de interface não carregado');
  }
};

window.coordCriarProfessor = () => {
  if (typeof UIModule !== 'undefined') {
    return UIModule.coordCriarProfessor();
  } else {
    showAlert('Módulo de interface não carregado');
  }
};

window.adicionarPergunta = () => {
  if (typeof UIModule !== 'undefined') {
    return UIModule.adicionarPergunta();
  } else {
    showAlert('Módulo de interface não carregado');
  }
};

window.salvarDistribuicao = () => {
  if (typeof UIModule !== 'undefined') {
    return UIModule.salvarDistribuicao();
  } else {
    showAlert('Módulo de interface não carregado');
  }
};

window.adicionarConteudo = () => {
  if (typeof UIModule !== 'undefined') {
    return UIModule.adicionarConteudo();
  } else {
    showAlert('Módulo de interface não carregado');
  }
};

window.salvarBanner = () => {
  if (typeof UIModule !== 'undefined') {
    return UIModule.salvarBanner();
  } else {
    showAlert('Módulo de interface não carregado');
  }
};

window.alunoVincularSala = () => {
  if (typeof UIModule !== 'undefined') {
    return UIModule.alunoVincularSala();
  } else {
    showAlert('Módulo de interface não carregado');
  }
};

window.abrirMateriaAluno = () => {
  if (typeof UIModule !== 'undefined') {
    return UIModule.abrirMateriaAluno();
  } else {
    showAlert('Módulo de interface não carregado');
  }
};

window.renderAlunosSala = () => {
  if (typeof UIModule !== 'undefined') {
    return UIModule.renderAlunosSala();
  } else {
    showAlert('Módulo de interface não carregado');
  }
};

/* ========= Funções de Compatibilidade ========= */
// Estas funções serão movidas para outros módulos, mas mantemos aqui temporariamente
// para compatibilidade durante a migração

function refreshAllSelects() {
  // Esta função será movida para UIModule
  if (typeof UIModule !== 'undefined' && typeof UIModule.refreshAllSelects === 'function') {
    return UIModule.refreshAllSelects();
  } else {
    console.warn('refreshAllSelects não disponível - verifique se UIModule está carregado');
  }
}
