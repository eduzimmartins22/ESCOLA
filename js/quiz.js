/* ========= Módulo de Quiz ========= */

// Estado do quiz
let quizState = {
  materiaId: null,
  nivel: 'facil',
  streak: 0,
  best: 0,
  pergunta: null,
  isActive: false
};

// Inicializar quiz para uma matéria
function quizStart(materiaId) {
  quizState = {
    materiaId,
    nivel: 'facil',
    streak: 0,
    best: 0,
    pergunta: null,
    isActive: true
  };
  
  setText('a_nivel', 'Nível: Fácil');
  setProgress(0);
  novaPergunta();
}

// Parar quiz
function quizStop() {
  if (quizState.isActive && quizState.streak > 0) {
    salvarRanking(getCurrentUser().nome, quizState.streak);
  }
  
  quizState.isActive = false;
  showAlert('Jogo encerrado. Sequência salva no ranking.');
}

// Tentar novamente (resetar progresso)
function quizTentarNovamente() {
  if (!quizState.isActive) return;
  
  quizState.streak = 0;
  quizState.nivel = 'facil';
  setText('a_nivel', 'Nível: Fácil');
  setProgress(0);
  novaPergunta();
}

// Sair do quiz
function quizSair() {
  quizStop();
}

// Definir progresso visual
function setProgress(pct) {
  const progressBar = byId('a_prog');
  if (progressBar) {
    progressBar.style.width = (pct || 0) + '%';
  }
}

// Obter perguntas por nível
function perguntasPorNivel(materiaId, nivel) {
  const materias = LS.get('materias', []);
  const materia = materias.find(m => m.id === materiaId);
  return (materia?.perguntas || []).filter(q => q.nivel === nivel);
}

// Gerar nova pergunta
function novaPergunta() {
  if (!quizState.isActive) return;
  
  const pool = perguntasPorNivel(quizState.materiaId, quizState.nivel);
  
  if (!pool.length) {
    setText('a_q', 'Sem perguntas neste nível.');
    setHTML('a_ans', '');
    setHTML('a_fb', 'Peça ao professor para adicionar perguntas neste nível.');
    return;
  }
  
  // Selecionar pergunta aleatória
  quizState.pergunta = pool[randomInt(0, pool.length - 1)];
  
  // Exibir pergunta
  setText('a_q', quizState.pergunta.q);
  
  // Criar botões das alternativas
  const ansContainer = byId('a_ans');
  if (ansContainer) {
    ansContainer.innerHTML = '';
    
    quizState.pergunta.a.forEach((alternativa, index) => {
      const button = document.createElement('button');
      button.textContent = alternativa;
      button.onclick = () => responder(index);
      ansContainer.appendChild(button);
    });
  }
  
  // Limpar feedback anterior
  setHTML('a_fb', '');
}

// Processar resposta do usuário
function responder(indiceResposta) {
  if (!quizState.isActive || !quizState.pergunta) return;
  
  const stats = LS.get('stats', { respostas: 0 });
  stats.respostas = (stats.respostas || 0) + 1;
  LS.set('stats', stats);
  
  const respostacorreta = indiceResposta === quizState.pergunta.correta;
  
  if (respostacorreta) {
    processarRespostaCorreta();
  } else {
    processarRespostaIncorreta();
  }
  
  // Aguardar um pouco antes da próxima pergunta
  setTimeout(() => {
    if (quizState.isActive) {
      novaPergunta();
    }
  }, 1500);
}

// Processar resposta correta
function processarRespostaCorreta() {
  quizState.streak++;
  quizState.best = Math.max(quizState.best, quizState.streak);
  
  setHTML('a_fb', CONFIG.MESSAGES.quiz.correct);
  
  // Atualizar progresso visual
  const progressoParcial = (quizState.streak % CONFIG.QUESTIONS_PER_LEVEL_UP) * (100 / CONFIG.QUESTIONS_PER_LEVEL_UP);
  setProgress(Math.min(100, progressoParcial));
  
  // Verificar se deve subir de nível
  if (quizState.streak > 0 && quizState.streak % CONFIG.QUESTIONS_PER_LEVEL_UP === 0) {
    subirNivel();
  }
}

// Processar resposta incorreta
function processarRespostaIncorreta() {
  const sequenciaFinal = quizState.streak;
  
  setHTML('a_fb', CONFIG.MESSAGES.quiz.wrong + sequenciaFinal);
  
  // Salvar no ranking se houve sequência
  if (sequenciaFinal > 0) {
    salvarRanking(getCurrentUser().nome, sequenciaFinal);
  }
  
  // Resetar para nível fácil
  quizState.streak = 0;
  quizState.nivel = 'facil';
  setText('a_nivel', 'Nível: Fácil');
  setProgress(0);
}

// Subir de nível
function subirNivel() {
  const niveis = ['facil', 'medio', 'dificil'];
  const indiceAtual = niveis.indexOf(quizState.nivel);
  
  if (indiceAtual < niveis.length - 1) {
    quizState.nivel = niveis[indiceAtual + 1];
    const nomeNivel = CONFIG.LEVELS[quizState.nivel];
    setText('a_nivel', `Nível: ${nomeNivel}`);
    setProgress(0); // Reset progress bar para o novo nível
  }
}

// Salvar pontuação no ranking
function salvarRanking(nomeUsuario, pontuacao) {
  if (!nomeUsuario || pontuacao <= 0) return;
  
  const ranking = LS.get('ranking', []);
  
  // Adicionar nova pontuação
  ranking.push({
    id: uid(),
    nome: nomeUsuario,
    score: pontuacao,
    date: getCurrentDateTime()
  });
  
  // Ordenar por pontuação (maior primeiro)
  ranking.sort((a, b) => b.score - a.score);
  
  // Manter apenas as melhores pontuações
  LS.set('ranking', ranking.slice(0, CONFIG.MAX_RANKING));
}

// Renderizar ranking
function renderRanking() {
  const ranking = LS.get('ranking', []);
  const tbody = byId('a_tbRanking');
  
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  ranking.slice(0, 20).forEach((entry, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${index + 1}º</td>
      <td>${entry.nome}</td>
      <td>${entry.score}</td>
    `;
    tbody.appendChild(tr);
  });
  
  if (ranking.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="muted">Nenhuma pontuação registrada ainda.</td></tr>';
  }
}

// Obter estatísticas do quiz
function getQuizStats(materiaId) {
  const materias = LS.get('materias', []);
  const materia = materias.find(m => m.id === materiaId);
  
  if (!materia) return null;
  
  const stats = {
    totalPerguntas: materia.perguntas.length,
    perguntasPorNivel: {
      facil: materia.perguntas.filter(p => p.nivel === 'facil').length,
      medio: materia.perguntas.filter(p => p.nivel === 'medio').length,
      dificil: materia.perguntas.filter(p => p.nivel === 'dificil').length
    },
    distribuicao: materia.quizConfig || CONFIG.DEFAULT_DISTRIBUTION
  };
  
  return stats;
}

// Verificar se matéria tem perguntas suficientes
function materiaTemPerguntasSuficientes(materiaId) {
  const stats = getQuizStats(materiaId);
  return stats && stats.totalPerguntas >= 3; // Mínimo de 3 perguntas
}

// Obter nível de dificuldade recomendado baseado na performance
function getNivelRecomendado(nomeUsuario) {
  const ranking = LS.get('ranking', []);
  const userScores = ranking.filter(r => r.nome === nomeUsuario);
  
  if (userScores.length === 0) return 'facil';
  
  const bestScore = Math.max(...userScores.map(s => s.score));
  
  if (bestScore >= 20) return 'dificil';
  if (bestScore >= 10) return 'medio';
  return 'facil';
}

// Obter resumo de performance do usuário
function getUserPerformance(nomeUsuario) {
  const ranking = LS.get('ranking', []);
  const userScores = ranking.filter(r => r.nome === nomeUsuario);
  
  if (userScores.length === 0) {
    return {
      jogos: 0,
      melhorSequencia: 0,
      sequenciaMedia: 0,
      posicaoRanking: null
    };
  }
  
  const scores = userScores.map(s => s.score);
  const melhorSequencia = Math.max(...scores);
  const sequenciaMedia = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  
  // Encontrar posição no ranking (baseado na melhor pontuação)
  const allScores = ranking.map(r => r.score).sort((a, b) => b - a);
  const posicaoRanking = allScores.indexOf(melhorSequencia) + 1;
  
  return {
    jogos: userScores.length,
    melhorSequencia,
    sequenciaMedia,
    posicaoRanking: posicaoRanking > 0 ? posicaoRanking : null
  };
}

// Export das funções públicas
if (typeof window !== 'undefined') {
  window.QuizModule = {
    start: quizStart,
    stop: quizStop,
    tentarNovamente: quizTentarNovamente,
    sair: quizSair,
    responder,
    renderRanking,
    getStats: getQuizStats,
    temPerguntasSuficientes: materiaTemPerguntasSuficientes,
    getNivelRecomendado,
    getUserPerformance,
    getState: () => ({ ...quizState })
  };
  
}