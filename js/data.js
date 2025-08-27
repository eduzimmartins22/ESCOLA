/* ========= Módulo de Gerenciamento de Dados ========= */

// Inicialização dos dados
function initData() {
  Object.keys(DATA_STRUCTURE).forEach(key => {
    if (!LS.get(key)) {
      LS.set(key, DATA_STRUCTURE[key]);
    }
  });
}

// ========= SALAS =========
const SalaManager = {
  // Criar sala
  create(nome, capacidade) {
    if (!nome || !capacidade || capacidade <= 0) {
      throw new Error('Nome e capacidade são obrigatórios');
    }
    
    const salas = LS.get('salas', []);
    const novaSala = {
      id: uid(),
      nome,
      capacidade: parseInt(capacidade, 10),
      alunos: [],
      createdAt: getCurrentDateTime(),
      createdBy: getCurrentUser()?.id
    };
    
    salas.push(novaSala);
    LS.set('salas', salas);
    
    return novaSala;
  },

  // Listar todas as salas
  getAll() {
    return LS.get('salas', []);
  },

  // Buscar sala por ID
  getById(id) {
    const salas = this.getAll();
    return salas.find(s => s.id === id);
  },

  // Atualizar sala
  update(id, updates) {
    const salas = this.getAll();
    const index = salas.findIndex(s => s.id === id);
    
    if (index === -1) {
      throw new Error('Sala não encontrada');
    }
    
    salas[index] = { ...salas[index], ...updates, updatedAt: getCurrentDateTime() };
    LS.set('salas', salas);
    
    return salas[index];
  },

  // Deletar sala
  delete(id) {
    const salas = this.getAll();
    const filtered = salas.filter(s => s.id !== id);
    
    if (filtered.length === salas.length) {
      throw new Error('Sala não encontrada');
    }
    
    LS.set('salas', filtered);
    return true;
  },

  // Adicionar aluno à sala
  addAluno(salaId, alunoId) {
    const sala = this.getById(salaId);
    if (!sala) throw new Error('Sala não encontrada');
    
    if (!sala.alunos.includes(alunoId)) {
      sala.alunos.push(alunoId);
      this.update(salaId, { alunos: sala.alunos });
    }
    
    return sala;
  },

  // Remover aluno da sala
  removeAluno(salaId, alunoId) {
    const sala = this.getById(salaId);
    if (!sala) throw new Error('Sala não encontrada');
    
    sala.alunos = sala.alunos.filter(id => id !== alunoId);
    this.update(salaId, { alunos: sala.alunos });
    
    return sala;
  }
};

// ========= MATÉRIAS =========
const MateriaManager = {
  // Criar matéria
  create(nome, salaId, ownerId = null) {
    if (!nome || !salaId) {
      throw new Error('Nome e sala são obrigatórios');
    }
    
    const materias = LS.get('materias', []);
    const novaMateria = {
      id: uid(),
      nome,
      salaId,
      ownerId: ownerId || getCurrentUser()?.id,
      quizConfig: { ...CONFIG.DEFAULT_DISTRIBUTION },
      perguntas: [],
      conteudos: [],
      inscritos: [],
      createdAt: getCurrentDateTime()
    };
    
    materias.push(novaMateria);
    LS.set('materias', materias);
    
    return novaMateria;
  },

  // Listar todas as matérias
  getAll() {
    return LS.get('materias', []);
  },

  // Buscar matéria por ID
  getById(id) {
    const materias = this.getAll();
    return materias.find(m => m.id === id);
  },

  // Buscar matérias por sala
  getBySala(salaId) {
    const materias = this.getAll();
    return materias.filter(m => m.salaId === salaId);
  },

  // Buscar matérias por owner
  getByOwner(ownerId) {
    const materias = this.getAll();
    return materias.filter(m => m.ownerId === ownerId);
  },

  // Atualizar matéria
  update(id, updates) {
    const materias = this.getAll();
    const index = materias.findIndex(m => m.id === id);
    
    if (index === -1) {
      throw new Error('Matéria não encontrada');
    }
    
    materias[index] = { ...materias[index], ...updates, updatedAt: getCurrentDateTime() };
    LS.set('materias', materias);
    
    return materias[index];
  },

  // Deletar matéria
  delete(id) {
    const materias = this.getAll();
    const filtered = materias.filter(m => m.id !== id);
    
    if (filtered.length === materias.length) {
      throw new Error('Matéria não encontrada');
    }
    
    LS.set('materias', filtered);
    return true;
  },

  // Adicionar pergunta
  addPergunta(materiaId, pergunta) {
    const materia = this.getById(materiaId);
    if (!materia) throw new Error('Matéria não encontrada');
    
    const novaPergunta = {
      id: uid(),
      ...pergunta,
      createdAt: getCurrentDateTime()
    };
    
    materia.perguntas.push(novaPergunta);
    this.update(materiaId, { perguntas: materia.perguntas });
    
    return novaPergunta;
  },

  // Adicionar conteúdo
  addConteudo(materiaId, conteudo) {
    const materia = this.getById(materiaId);
    if (!materia) throw new Error('Matéria não encontrada');
    
    const novoConteudo = {
      id: uid(),
      ...conteudo,
      createdAt: getCurrentDateTime()
    };
    
    materia.conteudos.push(novoConteudo);
    this.update(materiaId, { conteudos: materia.conteudos });
    
    return novoConteudo;
  },

  // Atualizar configuração do quiz
  updateQuizConfig(materiaId, config) {
    const total = config.facil + config.medio + config.dificil;
    if (total !== 100) {
      throw new Error('A distribuição deve somar 100%');
    }
    
    return this.update(materiaId, { quizConfig: config });
  }
};

// ========= USUÁRIOS =========
const UserManager = {
  // Obter todos os usuários
  getAll() {
    return LS.get('users', { alunos: [], professores: [], coordenadores: [] });
  },

  // Obter usuários por tipo
  getByRole(role) {
    const users = this.getAll();
    return users[role + 's'] || [];
  },

  // Buscar usuário por ID
  getById(id, role = null) {
    if (role) {
      const users = this.getByRole(role);
      return users.find(u => u.id === id);
    } else {
      const allUsers = this.getAll();
      return (
        allUsers.alunos.find(u => u.id === id) ||
        allUsers.professores.find(u => u.id === id) ||
        allUsers.coordenadores.find(u => u.id === id)
      );
    }
  },

  // Atualizar usuário
  update(id, role, updates) {
    const users = this.getAll();
    const userList = users[role + 's'];
    const index = userList.findIndex(u => u.id === id);
    
    if (index === -1) {
      throw new Error('Usuário não encontrado');
    }
    
    userList[index] = { ...userList[index], ...updates, updatedAt: getCurrentDateTime() };
    LS.set('users', users);
    
    return userList[index];
  },

  // Obter alunos por sala
  getAlunosBySala(salaId) {
    const alunos = this.getByRole('aluno');
    return alunos.filter(a => a.salaId === salaId);
  }
};

// ========= BANNERS =========
const BannerManager = {
  // Criar banner
  create(data) {
    const banners = LS.get('banners', []);
    const novoBanner = {
      id: uid(),
      ...data,
      createdAt: getCurrentDateTime(),
      createdBy: getCurrentUser()?.id
    };
    
    // Manter apenas os últimos banners
    banners.unshift(novoBanner);
    LS.set('banners', banners.slice(0, CONFIG.MAX_BANNERS));
    
    return novoBanner;
  },

  // Listar todos os banners
  getAll() {
    return LS.get('banners', []);
  },

  // Buscar banner por ID
  getById(id) {
    const banners = this.getAll();
    return banners.find(b => b.id === id);
  },

  // Atualizar banner
  update(id, updates) {
    const banners = this.getAll();
    const index = banners.findIndex(b => b.id === id);
    
    if (index === -1) {
      throw new Error('Banner não encontrado');
    }
    
    banners[index] = { ...banners[index], ...updates, updatedAt: getCurrentDateTime() };
    LS.set('banners', banners);
    
    return banners[index];
  },

  // Deletar banner
  delete(id) {
    const banners = this.getAll();
    const filtered = banners.filter(b => b.id !== id);
    
    if (filtered.length === banners.length) {
      throw new Error('Banner não encontrado');
    }
    
    LS.set('banners', filtered);
    return true;
  }
};

// ========= LOGS =========
const LogManager = {
  // Adicionar log
  add(data) {
    const logs = LS.get('logs', []);
    const novoLog = {
      id: uid(),
      ...data,
      timestamp: getCurrentDateTime()
    };
    
    logs.push(novoLog);
    
    // Manter apenas os logs recentes
    LS.set('logs', logs.slice(-CONFIG.MAX_LOGS));
    
    return novoLog;
  },

  // Obter todos os logs
  getAll() {
    return LS.get('logs', []);
  },

  // Obter logs por usuário
  getByUser(username) {
    const logs = this.getAll();
    return logs.filter(l => l.user === username);
  },

  // Obter logs por tipo
  getByRole(role) {
    const logs = this.getAll();
    return logs.filter(l => l.role === role);
  },

  // Obter estatísticas dos logs
  getStats() {
    const logs = this.getAll();
    const stats = {
      total: logs.length,
      byRole: {},
      recent: logs.slice(-10)
    };
    
    logs.forEach(log => {
      stats.byRole[log.role] = (stats.byRole[log.role] || 0) + 1;
    });
    
    return stats;
  }
};

// ========= ESTATÍSTICAS =========
const StatsManager = {
  // Obter estatísticas gerais
  getGeral() {
    return LS.get('stats', { respostas: 0 });
  },

  // Atualizar estatísticas
  update(updates) {
    const stats = this.getGeral();
    const newStats = { ...stats, ...updates };
    LS.set('stats', newStats);
    return newStats;
  },

  // Incrementar contador
  increment(key, amount = 1) {
    const stats = this.getGeral();
    stats[key] = (stats[key] || 0) + amount;
    LS.set('stats', stats);
    return stats[key];
  },

  // Obter estatísticas completas do sistema
  getSystemStats() {
    const users = UserManager.getAll();
    const materias = MateriaManager.getAll();
    const salas = SalaManager.getAll();
    const logs = LogManager.getAll();
    const ranking = LS.get('ranking', []);
    const stats = this.getGeral();
    
    return {
      usuarios: {
        total: users.alunos.length + users.professores.length + users.coordenadores.length,
        alunos: users.alunos.length,
        professores: users.professores.length,
        coordenadores: users.coordenadores.length
      },
      salas: salas.length,
      materias: materias.length,
      totalLogins: logs.filter(l => l.in).length,
      respostas: stats.respostas || 0,
      jogosRanking: ranking.length
    };
  }
};

// Export dos managers
if (typeof window !== 'undefined') {
  window.DataModule = {
    init: initData,
    Sala: SalaManager,
    Materia: MateriaManager,
    User: UserManager,
    Banner: BannerManager,
    Log: LogManager,
    Stats: StatsManager
  };
  
}