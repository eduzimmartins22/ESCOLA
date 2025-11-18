// aluno.js
async function renderAlunoMaterias() {
  console.log(">> renderAlunoMaterias: Iniciando..."); // Log
  try {
    // Garante que os dados mais recentes (salas, matérias, utilizador) estão disponíveis
    await refreshAllSelectsAsync(); 

    const salaDisplayEl = byId('a_nomeSala');
    const materiaSelectEl = byId('a_selMateria');
    const salaMutedTextEl = byId('a_salaMutedText');
    const materiaViewEl = byId('a_materiaView');

    // Garante que os elementos existem antes de continuar
    if (!salaDisplayEl || !materiaSelectEl || !salaMutedTextEl || !materiaViewEl) {
        console.error(">> renderAlunoMaterias: Elementos essenciais do DOM não encontrados!");
        return;
    }

    // Esconde a vista detalhada da matéria por defeito
    materiaViewEl.classList.add('hidden'); 

    const userSalaId = window.appState.user?.sala_id; // Usa snake_case
    console.log(">> renderAlunoMaterias: ID da sala do utilizador:", userSalaId); // Log

    if (userSalaId) {
        // Encontra o nome da sala
        const sala = window.appState.salas.find(s => s.id === userSalaId);
        const nomeSala = sala ? sala.nome : `Sala ID: ${userSalaId} (não encontrada)`;
        console.log(">> renderAlunoMaterias: Nome da sala encontrado:", nomeSala); // Log

        // Exibe o nome da sala
        salaDisplayEl.textContent = nomeSala;
        salaMutedTextEl.textContent = ''; // Limpa a mensagem muted padrão

        // Filtra as matérias APENAS para a sala do utilizador
        const materiasDaSala = (window.appState.materias || []).filter(m => m.sala_id === userSalaId); // Usa snake_case
        console.log(">> renderAlunoMaterias: Matérias filtradas para a sala:", materiasDaSala); // Log

        // Preenche o select de matérias (usa a função correta)
        fillSelectById('a_selMateria', materiasDaSala.map(m => ({ id: m.id, nome: m.nome })), null); // Passa um array de {id, nome}

        if (materiasDaSala.length === 0) {
             materiaSelectEl.innerHTML = '<option value="">(Sem matérias nesta sala)</option>';
             salaMutedTextEl.textContent = 'A sua sala ainda não tem matérias cadastradas.';
        }

    } else {
        // Caso o utilizador não esteja vinculado a nenhuma sala
        console.log(">> renderAlunoMaterias: Utilizador não vinculado a uma sala."); // Log
        salaDisplayEl.textContent = 'Nenhuma sala vinculada';
        materiaSelectEl.innerHTML = '<option value="">Vincule-se a uma sala primeiro</option>';
        salaMutedTextEl.textContent = 'Contacte o coordenador para ser vinculado a uma sala.';
    }

  } catch (err) {
      console.error(">> ERRO em renderAlunoMaterias:", err);
      // Opcional: Mostrar uma mensagem de erro na UI
  }
  console.log(">> renderAlunoMaterias: Finalizada."); // Log
}

async function abrirMateriaAluno() {
  const materiaId = sel('a_selMateria').value; // Obtém apenas o ID da matéria
  // Usa o sala_id do utilizador logado (se necessário internamente, mas não para a lógica atual)
  const userSalaId = window.appState.user?.sala_id; 

  if (!materiaId) return alert('Selecione uma matéria.');
  if (!userSalaId) return alert('Utilizador não vinculado a uma sala.'); // Verificação adicional

  const m = (window.appState.materias || []).find(x => x.id === materiaId);

  const cont = byId('a_conteudos');
  cont.innerHTML = '';
  if (!m || !m.conteudos || m.conteudos.length === 0) {
       cont.innerHTML = '<span class="muted">Sem conteúdos cadastrados.</span>';
  } else {
      (m.conteudos || []).forEach(c => {
        const d = document.createElement('div');
        d.className = 'card'; // Usando a classe 'card'
        d.style.marginBottom = '12px';

        let html = `<strong>${c.nome || 'Sem Título'}</strong>`; // Título

        // 2. Adiciona o Texto
        if (c.texto) {
          html += `<p class="muted" style="font-size: 13px; white-space: pre-wrap; margin-top: 5px;">${c.texto}</p>`;
        }
        
        // 3. Adiciona o Link Clicável
        if (c.link_externo) {
          html += `<a href="${c.link_externo}" target="_blank" rel="noopener noreferrer" style="font-size: 13px; margin-top: 5px; display: block;">Acessar Link</a>`;
        }

        // 4. Adiciona o Arquivo (se houver)
        if (c.url) {
            const isImg = c.tipo && c.tipo.startsWith('image/');
            if (isImg) {
                 html += `<img src="${c.url}" style="max-width: 100%; border-radius: 8px; margin-top: 10px;" onerror="this.style.display='none'">`;
            } else {
                 html += `<a href="${c.url}" target="_blank" rel="noopener noreferrer" style="font-size: 13px; margin-top: 5px; display: block;">Baixar Arquivo (${c.tipo || 'arquivo'})</a>`;
            }
        }
        
        d.innerHTML = html;
        cont.appendChild(d);
      });
  }
  quizStart(materiaId);
  byId('a_materiaView').classList.remove('hidden');
}

async function alunoVincularSala() {
  const salaId = sel('a_selSala').value;
  if (!salaId) return alert('Selecione uma sala.');
  try {
    // atualizar usuário no backend
    await API.updateUser('alunos', window.appState.user.id, { salaId });
    // atualizar session e estado local
    window.appState.user.salaId = salaId;
    saveSession(window.appState.user);
    alert('Vinculado à sala!');
    await refreshAllSelectsAsync();
    renderAlunoMaterias();
  } catch (err) {
    console.error(err);
    alert('Erro ao vincular sala');
  }
}

async function renderSalasAlunoSelects() {
  await refreshAllSelectsAsync();
  fillSelect('a_salaView', window.appState.salas, window.appState.user?.salaId || '');
}

async function renderAlunosSala() {
  const salaId = sel('a_salaView').value || window.appState.user?.salaId;
  const tb = byId('a_tbAlunos');
  tb.innerHTML = '';
  if (!salaId) {
    tb.innerHTML = '<tr><td colspan="2">Selecione uma sala.</td></tr>';
    return;
  }
  const users = window.appState.users?.alunos || [];
  const alunos = users.filter(a => a.salaId === salaId);
  alunos.forEach(a => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${a.nome}</td><td>${a.ra || a.mat || '-'}</td>`;
    tb.appendChild(tr);
  });
}

/* Banners */
async function renderBannersAluno() {
  console.log(">> renderBannersAluno: Iniciando...");
  const col = byId('a_bannersCol');
  if (!col) return console.error(">> renderBannersAluno: Elemento 'a_bannersCol' não encontrado.");

  col.innerHTML = ''; 

  // Usa os banners já existentes em appState (atualizados pelo refreshAllSelectsAsync chamado em enterApp ou openTab)
  const banners = window.appState.banners || [];
  console.log(">> renderBannersAluno: Banners a renderizar:", banners);

  if (banners.length === 0) {
      col.innerHTML = '<span class="muted">Nenhum banner disponível.</span>';
      return;
  }

  banners.forEach((b, index) => {
    console.log(`>> renderBannersAluno: Renderizando banner ${index}:`, b);
    const d = document.createElement('div');
    d.className = 'banner'; // Usa a classe 'banner'
    d.style.cursor = 'pointer';
    d.onclick = () => showBannerInfo(b); 

    // --- CORREÇÃO: Verifica se b.img_url existe ---
    const imgUrl = b.img_url || ''; // Usa a URL ou string vazia
    console.log(`>> renderBannersAluno: Banner ${index} - img_url:`, imgUrl); // LOG URL

    const imgHtml = imgUrl ? 
        `<img src="${imgUrl}" alt="${b.tit || 'Banner'}" style="width:120px; height: 90px; object-fit: cover; border-radius: 10px; border: 1px solid var(--borda);" onerror="this.style.display='none'; console.error('Erro ao carregar imagem (renderBannersAluno):', '${imgUrl}');">` // Adiciona log no onerror
        : 
        '<div style="width:120px; height: 90px; background-color:#eef2ff; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #6b7280; text-align: center;">Sem Imagem</div>';

    // Formata data e hora
    let dataFormatada = '-';
    if (b.data_evento) { try { dataFormatada = new Date(b.data_evento + 'T00:00:00Z').toLocaleDateString('pt-BR', { timeZone: 'UTC' }); } catch (e) {} }
    let horaFormatada = b.hora ? b.hora.substring(0,5) : '';

    // Monta o HTML interno
    d.innerHTML = `
        ${imgHtml}
        <div>
            <strong>${b.tit || 'Sem Título'}</strong>
            <div class="muted" style="font-size: 11px;">${dataFormatada} ${horaFormatada}</div>
        </div>
    `;
    col.appendChild(d);
  });
  console.log(">> renderBannersAluno: Finalizado.");
}

// Garante que showBannerInfo também usa img_url corretamente
function showBannerInfo(b) {
  console.log(">> showBannerInfo: Mostrando detalhes para:", b);
  const infoEl = byId('a_bannerInfo');
  if (!infoEl) return console.error(">> showBannerInfo: Elemento 'a_bannerInfo' não encontrado.");

  let dataFormatada = '-';
  if (b.data_evento) { try { dataFormatada = new Date(b.data_evento + 'T00:00:00Z').toLocaleDateString('pt-BR', { timeZone: 'UTC' }); } catch(e){} }
  let horaFormatada = b.hora ? b.hora.substring(0,5) : '';

  // --- CORREÇÃO: Verifica se b.img_url existe ---
  const imgUrl = b.img_url || ''; 
  console.log(`>> showBannerInfo: img_url:`, imgUrl); // LOG URL

  const imgHtml = imgUrl ? 
      `<img src="${imgUrl}" alt="${b.tit || 'Banner'}" style="width:120px; height: 90px; object-fit: cover; border-radius: 10px; border: 1px solid var(--borda);" onerror="this.style.display='none'; console.error('Erro ao carregar imagem (showBannerInfo):', '${imgUrl}');">` // Adiciona log no onerror
      : 
      '<div style="width:120px; height: 90px; background-color:#eef2ff; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #6b7280; text-align: center;">Sem Imagem</div>';

  infoEl.innerHTML = `
    <div class="banner">
      ${imgHtml}
      <div>
        <strong>${b.tit || 'Sem Título'}</strong>
        <div class="muted">${dataFormatada} ${horaFormatada} • ${b.local || '-'}</div>
        <div class="muted">Matérias: ${b.materias || '-'}</div>
        <div class="muted">Dicas: ${b.dicas || '-'}</div>
      </div>
    </div>
  `;
}

/* Quiz (mantive a lógica local: perguntas vêm das matérias já carregadas no appState) */
let Q = { materiaId: null, nivel: 'facil', streak: 0, best:0, pergunta:null };
function quizStart(materiaId) {
  Q = { materiaId, nivel: 'facil', streak:0, best:0, pergunta:null };
  byId('a_nivel').textContent = 'Nível: Fácil';
  setProgress(0);
  novaPergunta();
}
function setProgress(pct) { byId('a_prog').style.width = (pct||0)+'%'; }
function perguntasPorNivel(materiaId, nivel) {
  const m = (window.appState.materias||[]).find(x => x.id === materiaId);
  return (m?.perguntas||[]).filter(q => q.nivel === nivel);
}

function novaPergunta() {
  const pool = perguntasPorNivel(Q.materiaId, Q.nivel);

  const qContainer = byId('a_q'); // Elemento que conterá o enunciado E a imagem
  const ansContainer = byId('a_ans'); // Elemento que conterá as respostas

  if (!pool.length) { 
      qContainer.innerHTML = 'Sem perguntas neste nível.'; // Limpa enunciado e imagem
      ansContainer.innerHTML = ''; // Limpa respostas
      return; 
  }

  Q.pergunta = pool[Math.floor(Math.random() * pool.length)];

  // --- LÓGICA DA IMAGEM ADICIONADA ---
  let htmlEnunciado = '';

  // 1. Adiciona a imagem SE ela existir
  if (Q.pergunta.img_url) {
      console.log(">> novaPergunta: Exibindo imagem:", Q.pergunta.img_url);
      htmlEnunciado += `
          <img src="${Q.pergunta.img_url}" 
               alt="Imagem da pergunta" 
               style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 10px; border: 1px solid var(--borda);"
               onerror="this.style.display='none'; console.error('Erro ao carregar imagem da pergunta:', '${Q.pergunta.img_url}');">
      `;
  }

  // 2. Adiciona o texto do enunciado
  htmlEnunciado += `<p>${Q.pergunta.q}</p>`; // Envolve o texto num <p> para melhor espaçamento

  // Define o conteúdo do container do enunciado
  qContainer.innerHTML = htmlEnunciado; 

  // Limpa as respostas antigas
  ansContainer.innerHTML = '';

  // Adiciona os botões de resposta
  Q.pergunta.a.forEach((t, i) => {
    const b = document.createElement('button');
    b.textContent = t;
    b.onclick = () => responder(i);
    ansContainer.appendChild(b);
  });
  // --- FIM DAS ALTERAÇÕES ---
}

  

function responder(i) {
  const stats = window.appState.stats || { respostas: 0 };
  
  // 1. Verifica se acertou (necessário para o dashboard e lógica do jogo)
  const acertou = (i === Q.pergunta.correta);

  // 2. --- REGISTO NO DASHBOARD (A parte que faltava) ---
  if (window.appState.user && Q.materiaId) {
      API.registrarTentativa({
          user_id: window.appState.user.id,
          pergunta_id: Q.pergunta.id,
          materia_id: Q.materiaId,
          acertou: acertou
      }).catch(console.error);
  }
  // ----------------------------------------------------

  if (acertou) {
    // --- ACERTOU ---
    Q.streak++; 
    Q.best = Math.max(Q.best, Q.streak);
    byId('a_fb').textContent = '✅ Correto!';
    
    // Lógica de subir nível
    setProgress(Math.min(100, (Q.streak%5)*20));
    if (Q.streak > 0 && Q.streak % 5 === 0) {
      if (Q.nivel === 'facil') Q.nivel = 'medio';
      else if (Q.nivel === 'medio') Q.nivel = 'dificil';
      byId('a_nivel').textContent = 'Nível: ' + cap(Q.nivel);
    }

  } else {
    // --- ERROU ---
    
    // Lógica da Explicação (mantida)
    const explicacaoTexto = Q.pergunta.explicacao 
        ? `<br><br><strong>Explicação:</strong><br>${Q.pergunta.explicacao}` 
        : '';
      
    byId('a_fb').innerHTML = `❌ Errou! Sequência final: ${Q.streak} ${explicacaoTexto}`;
    
    // Reseta o jogo
    Q.streak = 0; 
    Q.nivel = 'facil'; 
    byId('a_nivel').textContent = 'Nível: Fácil'; 
    setProgress(0);
  }
  
  // Estatísticas globais do aluno
  stats.respostas = (stats.respostas || 0) + 1;
  window.appState.stats = stats;
  API.incrementStat({ stat_key: 'questions_answered' }).catch(console.error);
  
  // Próxima pergunta
  novaPergunta();
}

function quizTentarNovamente() { Q.streak=0; Q.nivel='facil'; byId('a_nivel').textContent='Nível: Fácil'; setProgress(0); novaPergunta(); }
async function quizSair() {
//await salvarRanking(window.appState.user.nome, Q.streak);
alert('Jogo encerrado.'); }

async function salvarRanking(nome, score) {
  // Obtém dados do aluno logado
  const salaId = window.appState.user?.sala_id; 
  const userId = window.appState.user?.id; // <-- Precisamos disto agora

  try {
    // Envia o ID do usuário junto
    await API.pushRanking({ 
        nome: nome, 
        score: score, 
        sala_id: salaId,
        user_id: userId // <-- Novo campo enviado
    });
    
    // Pede a lista atualizada DAQUELA sala
    const list = await API.listRanking(salaId);
    window.appState.ranking = list || [];
  } catch (err) {
    console.error(err);
    // fallback local simples (não perfeito, mas evita crash visual)
    window.appState.ranking = window.appState.ranking || [];
    // Nota: O fallback local não consegue simular perfeitamente a lógica de "Melhor Score" sem recarregar
    // por isso, dependemos do reload da API acima.
  }
  renderRanking();
}

async function renderRanking() { // Adicionei 'async' se quiser chamar API direto, mas aqui usaremos o cache ou faremos fetch novo

  // Se não houver dados ou quisermos garantir atualização, buscamos agora
  const salaId = window.appState.user?.sala_id;
  if (salaId) {
      try {
          const list = await API.listRanking(salaId);
          window.appState.ranking = list || [];
      } catch(e) { console.error(e); }
  }

  const r = window.appState.ranking || [];
  const tb = byId('a_tbRanking');
  if (!tb) return; // Proteção

  tb.innerHTML = '';

  if (r.length === 0) {
     tb.innerHTML = '<tr><td colspan="3" class="muted">Seja o primeiro a pontuar na sua turma!</td></tr>';
     return;
  }

  r.slice(0,20).forEach((x,i)=>{
    const tr = document.createElement('tr');
    // Adicionei uma classe para destacar o próprio aluno
    const isMe = x.nome === window.appState.user.nome ? 'style="font-weight:bold; color:#2ea36a;"' : '';
    tr.innerHTML = `<td ${isMe}>${i+1}º</td><td ${isMe}>${x.nome}</td><td ${isMe}>${x.score}</td>`;
    tb.appendChild(tr);
  });
}

function resetarRanking() {
  if (!confirm('Confirma resetar o ranking?')) return;
  API.deleteRanking().catch(err => {
    console.error("Erro ao tentar resetar ranking via API:", err);
    // Poderia mostrar um alerta de erro aqui
});
  window.appState.ranking = [];
  renderRanking();
  alert('Ranking resetado.');
}
// ===================================================
// --- INÍCIO DA PARTE 3: LÓGICA DO DESAFIO (RANKING) ---
// ===================================================

// 'D' (Desafio) é o nosso novo objeto de estado do quiz, separado do 'Q' (Prática)
let D = { 
  pool: [], // Um 'pool' com todas as perguntas da turma
  nivel: 'facil', 
  streak: 0, 
  pergunta: null 
};

/**
 * Chamado pelo openTab. Apenas garante que a tela de início do desafio esteja visível.
 */
async function renderDesafioView() {
  // Garante que temos os dados mais recentes das matérias
  await refreshAllSelectsAsync(); 
  
  // Mostra o botão "Começar" e esconde o quiz
  byId('d_start_view').classList.remove('hidden');
  byId('d_quiz_view').classList.add('hidden');
  
  // Limpa o feedback antigo
  byId('d_fb').textContent = '';
}

/**
 * Pega TODAS as perguntas de TODAS as matérias da sala do aluno
 * e as junta num único 'pool' de perguntas.
 */
function compilarPerguntasDaTurma() {
  const userSalaId = window.appState.user?.sala_id;
  if (!userSalaId) {
    console.error("Desafio: Aluno não está em nenhuma sala.");
    return [];
  }

  // 1. Filtra as matérias que são da sala do aluno
  const materiasDaSala = (window.appState.materias || []).filter(m => m.sala_id === userSalaId);
  
  // 2. Extrai as perguntas de cada matéria e as junta num array só
  let todasAsPerguntas = [];
  materiasDaSala.forEach(materia => {
    if (materia.perguntas && materia.perguntas.length > 0) {
      // Adiciona o nome da matéria em cada pergunta (para referência futura, se quisermos)
      const perguntasDaMateria = materia.perguntas.map(p => ({...p, materiaNome: materia.nome, materia_id: materia.id}));
      todasAsPerguntas.push(...perguntasDaMateria);
    }
  });

  console.log(`Desafio: Compiladas ${todasAsPerguntas.length} perguntas de ${materiasDaSala.length} matérias.`);
  return todasAsPerguntas;
}

/**
 * Inicia o quiz do desafio.
 */
function desafioStart() {
  const poolGeral = compilarPerguntasDaTurma();
  
  if (poolGeral.length === 0) {
    alert("A sua turma ainda não tem perguntas cadastradas nas matérias. Peça aos seus professores para adicionarem.");
    return;
  }

  // Reseta o estado do Desafio
  D = {
    pool: poolGeral,
    nivel: 'facil',
    streak: 0,
    pergunta: null
  };

  // Configura a UI
  byId('d_nivel').textContent = 'Nível: Fácil';
  desafioSetProgress(0);
  byId('d_start_view').classList.add('hidden');
  byId('d_quiz_view').classList.remove('hidden');
  
  // Inicia o jogo
  desafioNovaPergunta();
}

// Funções auxiliares do quiz "D" (Desafio)
function desafioSetProgress(pct) { byId('d_prog').style.width = (pct || 0) + '%'; }
function desafioPerguntasPorNivel(nivel) {
  // Filtra o 'pool' geral de perguntas pelo nível
  return (D.pool || []).filter(q => q.nivel === nivel);
}

/**
 * Puxa uma nova pergunta do pool do desafio.
 */
function desafioNovaPergunta() {
  const poolNivel = desafioPerguntasPorNivel(D.nivel);
  
  const qContainer = byId('d_q');
  const ansContainer = byId('d_ans');

  if (!poolNivel.length) { 
      qContainer.innerHTML = `Parabéns! Você zerou todas as perguntas do nível ${D.nivel}!`;
      ansContainer.innerHTML = '';
      
      // Se não houver mais perguntas fáceis, tenta ir pro médio, etc.
      if (D.nivel === 'facil') D.nivel = 'medio';
      else if (D.nivel === 'medio') D.nivel = 'dificil';
      
      // Tenta de novo com o próximo nível
      const proximoPool = desafioPerguntasPorNivel(D.nivel);
      if(proximoPool.length > 0) {
        byId('d_nivel').textContent = 'Nível: ' + cap(D.nivel);
        desafioNovaPergunta();
      } else {
        qContainer.innerHTML = 'Você zerou TODAS as perguntas da sua turma!';
      }
      return; 
  }

  // Sorteia uma pergunta do nível atual
  D.pergunta = poolNivel[Math.floor(Math.random() * poolNivel.length)];

  // Monta o HTML da pergunta (com imagem, se houver)
  let htmlEnunciado = '';
  if (D.pergunta.img_url) {
      htmlEnunciado += `
          <img src="${D.pergunta.img_url}" 
               alt="Imagem da pergunta" 
               style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 10px; border: 1px solid var(--borda);"
               onerror="this.style.display='none';">
      `;
  }
  htmlEnunciado += `<p>${D.pergunta.q}</p>`;
  qContainer.innerHTML = htmlEnunciado; 

  // Limpa e recria os botões de resposta
  ansContainer.innerHTML = '';
  D.pergunta.a.forEach((t, i) => {
    const b = document.createElement('button');
    b.textContent = t;
    b.onclick = () => desafioResponder(i);
    ansContainer.appendChild(b);
  });
}

function desafioResponder(i) {
  const stats = window.appState.stats || { respostas: 0 };
  
  // 1. Verifica se acertou
  const acertou = (i === D.pergunta.correta);

  // 2. --- REGISTO NO DASHBOARD ---
  if (window.appState.user && D.pergunta.materia_id) {
      API.registrarTentativa({
          user_id: window.appState.user.id,
          pergunta_id: D.pergunta.id,
          materia_id: D.pergunta.materia_id,
          acertou: acertou
      }).catch(console.error);
  }
  // -------------------------------
  
  if (acertou) {
    // --- ACERTOU ---
    D.streak++; 
    byId('d_fb').textContent = '✅ Correto! Sequência: ' + D.streak;
    
    // Avança a barra de progresso
    desafioSetProgress(Math.min(100, (D.streak % 5) * 20));
    
    if (D.streak > 0 && D.streak % 5 === 0) {
      if (D.nivel === 'facil') D.nivel = 'medio';
      else if (D.nivel === 'medio') D.nivel = 'dificil';
      byId('d_nivel').textContent = 'Nível: ' + cap(D.nivel);
    }
    
  } else {
    // --- ERROU ---
    
    const pontuacaoFinal = D.streak; 
    
    // Explicação
    const explicacaoHtml = D.pergunta.explicacao 
        ? `<br><br><strong>Explicação:</strong><br>${D.pergunta.explicacao}` 
        : '';
        
    const explicacaoAlert = D.pergunta.explicacao 
        ? `\n\nExplicação:\n${D.pergunta.explicacao}` 
        : '';

    // Feedback Visual
    byId('d_fb').innerHTML = `❌ Errou! A resposta era '${D.pergunta.a[D.pergunta.correta]}'. Sequência final: ${pontuacaoFinal} ${explicacaoHtml}`;
    
    // Salva no Ranking (Modo Desafio)
    salvarRanking(window.appState.user.nome, pontuacaoFinal);
    
    // Reseta o jogo
    D.streak = 0; 
    D.nivel = 'facil'; 
    byId('d_nivel').textContent = 'Nível: Fácil'; 
    desafioSetProgress(0);
    
    // UI
    byId('d_start_view').classList.remove('hidden');
    byId('d_quiz_view').classList.add('hidden');
    
    // Alerta Final
    alert(`Fim de jogo! Sua pontuação (${pontuacaoFinal}) foi enviada para o ranking.${explicacaoAlert}`);
    
    return; 
  }
  
  // Estatísticas globais
  stats.respostas = (stats.respostas || 0) + 1;
  window.appState.stats = stats;
  API.incrementStat({ stat_key: 'questions_answered' }).catch(console.error);

  // Próxima pergunta
  desafioNovaPergunta();
}

// ===================================================
// --- FIM DA PARTE 3 ---
// ===================================================
