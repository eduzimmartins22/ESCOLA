/* ========= Configurações da Aplicação ========= */

// Configurações gerais
const CONFIG = {
  // Limites do sistema
  MAX_BANNERS: 3,
  MAX_RANKING: 50,  MAX_LOGS: 100,
  
  // Quiz configurações
  QUESTIONS_PER_LEVEL_UP: 5,
  DEFAULT_DISTRIBUTION: {
    facil: 60,
    medio: 30,
    dificil: 10
  },
  
  // Níveis de dificuldade
  LEVELS: {
    facil: 'Fácil',
    medio: 'Médio',
    dificil: 'Difícil'
  },
  
  // Tipos de usuário
  USER_ROLES: {
    aluno: 'aluno',
    professor: 'professor',
    coordenador: 'coordenador'
  },
  
  // Cores do tema
  COLORS: {
    primary: '#0A5BAA',
    secondary: '#2EA36A',
    accent: '#0f73d1',
    background: '#f5f7fa',
    border: '#e2e8f0',
    text: '#1f2937'
  },
  
  // Mensagens padrão
  MESSAGES: {
    login: {
      invalidCredentials: 'Credenciais inválidas.',
      fillAllFields: 'Preencha todos os campos obrigatórios.',
      userAlreadyExists: 'Usuário já cadastrado.',
      success: 'Login realizado com sucesso!'
    },
    quiz: {
      correct: '✅ Correto!',
      wrong: '❌ Errou! Sequência final: ',
      noQuestions: 'Sem perguntas neste nível.',
      gameEnded: 'Jogo encerrado. Sequência salva no ranking.'
    },
    forms: {
      selectRoom: 'Selecione uma sala.',
      selectSubject: 'Selecione a matéria.',
      fillCorrectly: 'Preencha a pergunta corretamente.',
      percentageSum: 'A soma deve ser 100%.',
      selectFiles: 'Selecione arquivos.'
    }
  },
  
  // Configurações de storage
  STORAGE_KEYS: {
    users: 'users',
    salas: 'salas',
    materias: 'materias',
    banners: 'banners',
    logs: 'logs',
    ranking: 'ranking',
    stats: 'stats',
    session: 'sessionUser'
  }
};

// Estrutura padrão dos dados
const DATA_STRUCTURE = {
  users: {
    alunos: [],
    professores: [],
    coordenadores: []
  },
  salas: [],
  materias: [],
  banners: [],
  logs: [],
  ranking: [],
  stats: {
    respostas: 0,
    totalLogins: 0,
    materiasCreated: 0
  }
};

// Validações
const VALIDATION = {
  // CPF básico (apenas números)
  cpf: (cpf) => /^\d{11}$/.test(cpf?.replace(/\D/g, '')),
  
  // RA/Matrícula
  ra: (ra) => ra && ra.length >= 3,
  
  // Senha mínima
  password: (password) => password && password.length >= 4,
  
  // Nome
  name: (name) => name && name.trim().length >= 2,
  
  // Percentage
  percentage: (value) => {
    const num = parseInt(value, 10);
    return !isNaN(num) && num >= 0 && num <= 100;
  }
};

// Utilitários de formatação
const FORMAT = {
  cpf: (cpf) => {
    if (!cpf) return '';
    const cleaned = cpf.replace(/\D/g, '');
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  },
  
  date: (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('pt-BR');
  },
  
  time: (time) => {
    if (!time) return '';
    return time;
  },
  
  capitalize: (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
};

// Export para uso em outros arquivos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONFIG, DATA_STRUCTURE, VALIDATION, FORMAT };
}