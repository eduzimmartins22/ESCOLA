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

  // ... (Resto da função que exibe conteúdos e inicia o quiz continua igual) ...
   const cont = byId('a_conteudos');
  cont.innerHTML = '';
  if (!m || !m.conteudos || m.conteudos.length === 0) {
       cont.innerHTML = '<span class="muted">Sem conteúdos cadastrados.</span>';
  } else {
      (m.conteudos || []).forEach(c => {
        const d = document.createElement('div');
        // Ajusta a classe para 'banner' para usar estilos existentes
        d.className = 'banner'; 
        // Usa b.img_url se existir, ou placeholder/esconde
        const imgHtml = c.url ? `<img src="${c.url}" alt="${c.nome || 'Conteúdo'}" style="width:120px; height: 90px; object-fit: cover; border-radius: 10px; border: 1px solid var(--borda);" onerror="this.style.display='none';">` : '';
        d.innerHTML = `${imgHtml}<div><strong>${c.nome || 'Sem Nome'}</strong><div class="muted">${c.tipo||'arquivo'}</div></div>`;
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
  const col = byId('a_bannersCol');
  col.innerHTML = '';
  await refreshAllSelectsAsync();
  const banners = window.appState.banners || [];
  banners.forEach(b => {
    const d = document.createElement('div');
    d.className = 'banner';
    d.style.cursor = 'pointer';
    d.onclick = () => showBannerInfo(b);
    d.innerHTML = `<img src="${b.img}" onerror="this.style.background='#eef2ff'"><div><strong>${b.tit}</strong><div class="muted">${b.data || ''} ${b.hora || ''}</div></div>`;
    col.appendChild(d);
  });
}
function showBannerInfo(b) {
  byId('a_bannerInfo').innerHTML = `
    <div class="banner">
      <img src="${b.img}" onerror="this.style.background='#eef2ff'">
      <div>
        <strong>${b.tit}</strong>
        <div class="muted">${b.data || ''} ${b.hora || ''} • ${b.local || ''}</div>
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
  if (!pool.length) { byId('a_q').textContent = 'Sem perguntas neste nível.'; byId('a_ans').innerHTML=''; return; }
  Q.pergunta = pool[Math.floor(Math.random()*pool.length)];
  byId('a_q').textContent = Q.pergunta.q;
  const ans = byId('a_ans');
  ans.innerHTML = '';
  Q.pergunta.a.forEach((t,i)=> {
    const b = document.createElement('button');
    b.textContent = t;
    b.onclick = () => responder(i);
    ans.appendChild(b);
  });
}
function responder(i) {
  const stats = window.appState.stats || { respostas:0 };
  if (i === Q.pergunta.correta) {
    Q.streak++; Q.best = Math.max(Q.best, Q.streak);
    byId('a_fb').textContent = '✅ Correto!';
    setProgress(Math.min(100, (Q.streak%5)*20));
    if (Q.streak>0 && Q.streak%5===0) {
      if (Q.nivel === 'facil') Q.nivel='medio';
      else if (Q.nivel === 'medio') Q.nivel='dificil';
      byId('a_nivel').textContent = 'Nível: ' + cap(Q.nivel);
    }
  } else {
    byId('a_fb').textContent = '❌ Errou! Sequência final: ' + Q.streak;
    salvarRanking(window.appState.user.nome, Q.streak);
    Q.streak = 0; Q.nivel='facil'; byId('a_nivel').textContent = 'Nível: Fácil'; setProgress(0);
  }
  stats.respostas = (stats.respostas||0) + 1;
  window.appState.stats = stats;
  // Envia o incremento para o servidor (não precisa esperar 'await' aqui)
  API.incrementStat({ stat_key: 'questions_answered' }).catch(err => {
      console.error("Erro ao incrementar 'questions_answered':", err);
  });
  novaPergunta();
}
function quizTentarNovamente() { Q.streak=0; Q.nivel='facil'; byId('a_nivel').textContent='Nível: Fácil'; setProgress(0); novaPergunta(); }
async function quizSair() { await salvarRanking(window.appState.user.nome, Q.streak); alert('Jogo encerrado. Sequência salva no ranking.'); }

async function salvarRanking(nome, score) {
  try {
    await API.pushRanking({ nome, score });
    const list = await API.listRanking();
    window.appState.ranking = list || [];
  } catch (err) {
    console.error(err);
    // fallback local
    window.appState.ranking = window.appState.ranking || [];
    window.appState.ranking.push({ nome, score });
    window.appState.ranking.sort((a,b)=>b.score-a.score);
    window.appState.ranking = window.appState.ranking.slice(0,50);
  }
  renderRanking();
}
function renderRanking() {
  const r = window.appState.ranking || [];
  const tb = byId('a_tbRanking');
  tb.innerHTML = '';
  r.slice(0,20).forEach((x,i)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${i+1}º</td><td>${x.nome}</td><td>${x.score}</td>`;
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
