// professor.js
// Funções de professor: criarSala, criarMateria, perguntas, conteúdos — todas via API

async function criarSala() {
  try {
    const nome = val('c_s_nome');
    const cap = parseInt(val('c_s_cap')||'0', 10);
    if (!nome || !cap) return alert('Preencha nome e capacidade.');
    const payload = { nome, capacidade: cap };
    const res = await API.createSala(payload);
    alert('Sala criada!');
    byId('c_s_nome').value = '';
    byId('c_s_cap').value = 30;
    await refreshAllSelectsAsync();
    renderSalasCoord();
  } catch (err) {
    console.error(err);
    alert(err.body?.message || err.message || 'Erro ao criar sala');
  }
}

async function renderSalasCoord() {
  try {
    const salas = await API.listSalas();
    window.appState.salas = salas || [];
    const list = byId('c_m_list');
    list.innerHTML = '';
    const materias = window.appState.materias || [];
    window.appState.salas.forEach((s) => {
      const bloco = document.createElement('div');
      bloco.className = 'card';
      bloco.innerHTML = `<strong>${s.nome}</strong><div class="muted">Matérias:</div>`;
      const ul = document.createElement('ul');
      materias.filter(m => m.salaId === s.id).forEach(m => {
        const li = document.createElement('li');
        li.textContent = m.nome;
        ul.appendChild(li);
      });
      bloco.appendChild(ul);
      list.appendChild(bloco);
    });
    // atualizar tabela de salas do coordenador se existir
    if (byId('c_tbSalas')) {
      const tb = byId('c_tbSalas');
      tb.innerHTML = '';
      window.appState.salas.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${s.nome}</td>
          <td>${s.capacidade}</td>
          <td>
            <button class="btn" style="background:#dc2626; color:white; padding: 4px 8px; font-size:12px;" onclick="apagarUsuario('${s.id}', 'sala')">Apagar</button>
            <button class="btn" style="background:#3b82f6; color:white; padding: 4px 8px; font-size:12px;" onclick="editarSala('${s.id}')">Editar</button>
          </td>
        `;
        tb.appendChild(tr);
      });
    }
  } catch (err) {
    console.error(err);
    alert('Erro ao obter salas');
  }
}

/* ========= Matérias ========= */
async function criarMateria(orig) {
  try {
    const salaId = orig === 'coordenador' ? sel('c_m_selSala').value : sel('p_selSala').value;
    const nome = orig === 'coordenador' ? val('c_m_nome') : val('p_matNome');
    if (!salaId || !nome) return alert('Selecione sala e informe um nome.');
    const payload = {
      nome,
      salaId,
      ownerId: window.appState.user?.id || null,
      quizConfig: { facil:60, medio:30, dificil:10 },
    };
    await API.createMateria(payload);
    if (orig === 'coordenador') {
      byId('c_m_nome').value = '';
    } else {
      byId('p_matNome').value = '';
    }
    await refreshAllSelectsAsync();
    renderProfMaterias();
    alert('Matéria criada!');
  } catch (err) {
    console.error(err);
    alert(err.body?.message || err.message || 'Erro ao criar matéria');
  }
}

async function renderProfMaterias() {
  try {
    const materias = (await API.listMaterias()) || [];
    window.appState.materias = materias;
    const container = byId('p_listaMaterias');
    container.innerHTML = '';
    const mine = materias.filter(m => m.ownerId === window.appState.user?.id);
    mine.forEach(m => {
      const c = document.createElement('div');
      c.className = 'card';
      c.innerHTML = `<strong>${m.nome}</strong><div class="muted">Sala: ${salaNome(m.salaId)}</div>
        <div class="muted">Inscritos: ${m.inscritos?.length || 0}</div>`;
      container.appendChild(c);
    });
  } catch (err) {
    console.error(err);
    alert('Erro ao listar matérias');
  }
}

async function renderPQSelects() {
  await refreshAllSelectsAsync();
  fillSelectWithMaterias('p_q_materia', window.appState.materias, true);
  fillSelectWithMaterias('p_c_materia', window.appState.materias, true);
}

async function adicionarPergunta() {
  try {
    const materiaId = sel('p_q_materia').value;
    if (!materiaId) return alert('Selecione a matéria.');
    const nivel = sel('p_q_nivel').value;
    const enun = val('p_q_enun');
    const alts = [0,1,2,3,4].map(i => val('p_q_a'+i));
    const cor = parseInt(val('p_q_cor')||'0',10);
    if (!enun || alts.some(a => !a) || cor<0 || cor>4) return alert('Preencha a pergunta corretamente.');
    const payload = { nivel, q: enun, a: alts, correta: cor };
    await API.addPergunta(materiaId, payload);
    byId('p_q_enun').value='';
    [0,1,2,3,4].forEach(i=>byId('p_q_a'+i).value='');
    byId('p_q_cor').value = 0;
    await refreshAllSelectsAsync();
    renderResumoQuestoes();
    alert('Pergunta adicionada!');
  } catch (err) {
    console.error(err);
    alert(err.body?.message || err.message || 'Erro ao adicionar pergunta');
  }
}

async function salvarDistribuicao() {
  try {
    const materiaId = sel('p_q_materia').value;
    if (!materiaId) return alert('Selecione a matéria.');
    const f = parseInt(val('p_dist_facil')||'0',10), m = parseInt(val('p_dist_medio')||'0',10), d = parseInt(val('p_dist_dificil')||'0',10);
    if (f + m + d !== 100) return alert('A soma deve ser 100%.');
    await API.updateMateria(materiaId, { quizConfig: { facil: f, medio: m, dificil: d }});
    alert('Distribuição salva!');
    await refreshAllSelectsAsync();
  } catch (err) {
    console.error(err);
    alert('Erro ao salvar distribuição');
  }
}

function renderResumoQuestoes() {
  const materiaId = sel('p_q_materia').value;
  const box = byId('p_q_resumo');
  if (!materiaId) {
    box.textContent = 'Selecione a matéria.';
    return;
  }
  const m = (window.appState.materias || []).find(x => x.id === materiaId);
  if (!m) return;
  const c = m.quizConfig || {};
  const counts = { facil:0, medio:0, dificil:0 };
  (m.perguntas || []).forEach(p => counts[p.nivel]++);
  box.innerHTML = `
    <div><span class="pill">Fácil: ${counts.facil}</span> <span class="pill">Médio: ${counts.medio}</span> <span class="pill">Difícil: ${counts.dificil}</span></div>
    <div class="muted" style="margin-top:6px">Distribuição: ${c.facil||0}% / ${c.medio||0}% / ${c.dificil||0}%</div>
  `;
}

async function adicionarConteudo() {
  try {
    const materiaId = sel('p_c_materia').value;
    if (!materiaId) return alert('Selecione a matéria.');
    const files = byId('p_c_file').files;
    if (!files.length) return alert('Selecione arquivos.');
    const fd = new FormData();
    [...files].forEach(f => fd.append('files', f));
    await API.uploadConteudo(materiaId, fd);
    byId('p_c_file').value = '';
    await refreshAllSelectsAsync();
    renderPConteudos();
    alert('Conteúdo enviado!');
  } catch (err) {
    console.error(err);
    alert('Erro ao enviar conteúdo');
  }
}

async function renderPConteudos() {
  const materiaId = sel('p_c_materia').value;
  const list = byId('p_c_lista');
  list.innerHTML = '';
  if (!materiaId) {
    list.innerHTML = '<span class="muted">Selecione a matéria.</span>';
    return;
  }
  const m = (window.appState.materias || []).find(x => x.id === materiaId);
  if (!m || !m.conteudos || !m.conteudos.length) {
    list.innerHTML = '<span class="muted">Sem arquivos.</span>';
    return;
  }
  m.conteudos.forEach(c => {
    const d = document.createElement('div');
    d.className = 'banner';
    d.innerHTML = `<img src="${c.url}" onerror="this.src=''; this.style.background='#eef2ff'">
      <div><strong>${c.nome}</strong><div class="muted">${c.tipo||'arquivo'}</div></div>`;
    list.appendChild(d);
  });
}

