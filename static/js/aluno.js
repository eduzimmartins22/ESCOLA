// aluno.js
async function renderAlunoMaterias() {
  await refreshAllSelectsAsync();
  fillSelect('a_selSala', window.appState.salas, window.appState.user?.salaId || '');
  if (window.appState.user?.salaId) {
    const materias = (window.appState.materias || []).filter(m => m.salaId === window.appState.user.salaId);
    fillSelectWithMaterias('a_selMateria', materias, false);
  } else {
    byId('a_selMateria').innerHTML = '<option value="">Selecione uma sala</option>';
  }
  byId('a_materiaView').classList.add('hidden');
}

async function abrirMateriaAluno() {
  const salaId = sel('a_selSala').value;
  const materiaId = sel('a_selMateria').value;
  if (!salaId || !materiaId) return alert('Selecione sala e matéria.');
  const m = (window.appState.materias || []).find(x => x.id === materiaId);
  const cont = byId('a_conteudos');
  cont.innerHTML = '';
  if (!m || !m.conteudos || m.conteudos.length === 0) cont.innerHTML = '<span class="muted">Sem conteúdos cadastrados.</span>';
  (m.conteudos || []).forEach(c => {
    const d = document.createElement('div');
    d.className = 'banner';
    d.innerHTML = `<img src="${c.url}" onerror="this.style.background='#eef2ff'"><div><strong>${c.nome}</strong><div class="muted">${c.tipo||'arquivo'}</div></div>`;
    cont.appendChild(d);
  });
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
  API.delete(`${ENDPOINTS.ranking}/all`).catch(()=>{}); // opcional, depende do backend
  window.appState.ranking = [];
  renderRanking();
  alert('Ranking resetado.');
}
