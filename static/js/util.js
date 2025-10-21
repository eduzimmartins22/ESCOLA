// util.js
function byId(id) { return document.getElementById(id); }
function sel(id) { return document.getElementById(id); }
function val(id) { return byId(id)?.value?.trim(); }
function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : ""; }

function uid() { return Math.random().toString(36).slice(2, 9); }

// session helpers (sessionStorage)
function saveSession(userObj) {
  sessionStorage.setItem('sessionUser', JSON.stringify(userObj));
}
function clearSession() {
  sessionStorage.removeItem('sessionUser');
}
function getSession() {
  const u = sessionStorage.getItem('sessionUser');
  return u ? JSON.parse(u) : null;
}

// fillSelect helpers (synchronous HTML update)
function fillSelectById(id, arr, selectedId) {
  const el = sel(id);
  if (!el) return;
  el.innerHTML = arr.length
    ? arr.map(o => `<option value="${o.id}" ${o.id === selectedId ? 'selected' : ''}>${o.nome}</option>`).join('')
    : '<option value="">(sem itens)</option>';
}
function fillSelectWithMateriasId(id, materias, onlyOwned = false, salaFilter = null, selected = null) {
  console.log(`>> fillSelectWithMateriasId: Chamada para ID='${id}', onlyOwned=${onlyOwned}`); // LOG: Início da função
  const el = sel(id);
  if (!el) {
      console.error(`>> fillSelectWithMateriasId: Elemento com ID='${id}' não encontrado!`); // LOG: Erro elemento
      return;
  }

  let mats = materias || [];
  console.log(`>> fillSelectWithMateriasId ('${id}'): Matérias recebidas (antes de filtrar):`, JSON.parse(JSON.stringify(mats))); // LOG: Matérias iniciais (copia para evitar modificar original no log)

  if (onlyOwned && window.appState?.user) {
      const userId = window.appState.user.id;
      console.log(`>> fillSelectWithMateriasId ('${id}'): Aplicando filtro onlyOwned para user ID: ${userId}`); // LOG: ID do Utilizador
      // Certifique-se que está a comparar com 'owner_id' (snake_case)
      mats = mats.filter(m => {
          console.log(`>> fillSelectWithMateriasId ('${id}'): Comparando m.owner_id (${m.owner_id}) === userId (${userId}) para matéria "${m.nome}"`); // LOG: Comparação
          return m.owner_id === userId; 
      });
      console.log(`>> fillSelectWithMateriasId ('${id}'): Matérias após filtro onlyOwned:`, JSON.parse(JSON.stringify(mats))); // LOG: Matérias após filtro
  }

  // Filtro de sala (se aplicável)
  if (salaFilter) {
      console.log(`>> fillSelectWithMateriasId ('${id}'): Aplicando filtro sala ID: ${salaFilter}`); // LOG: Filtro Sala
      // Certifique-se que está a comparar com 'sala_id' (snake_case)
      mats = mats.filter(m => m.sala_id === salaFilter);
      console.log(`>> fillSelectWithMateriasId ('${id}'): Matérias após filtro sala:`, JSON.parse(JSON.stringify(mats))); // LOG: Após filtro sala
  }

  // Preenche o select HTML
  if (mats.length > 0) {
      // Ajusta para usar sala_id para encontrar nomeSala
      el.innerHTML = mats.map(m => {
          const sala = window.appState.salas.find(s => s.id === m.sala_id);
          const nomeSala = sala ? sala.nome : (m.sala_id || 'ID desconhecido'); // Mostra ID se não encontrar nome
          // Monta a string da opção
          return `<option value="${m.id}" ${m.id === selected ? 'selected' : ''}>${m.nome} — ${nomeSala}</option>`;
      }).join('');
  } else {
      el.innerHTML = '<option value="">(sem matérias)</option>';
  }
  console.log(`>> fillSelectWithMateriasId ('${id}'): Preenchimento concluído. ${mats.length} matérias exibidas.`); // LOG: Fim
}

// small UI helpers
function showApp() { byId('auth').style.display='none'; byId('app').style.display='block'; }
function showAuth() { byId('auth').style.display='block'; byId('app').style.display='none'; }

// global simple state (cached lists to avoid multiple roundtrips inside a single UI render)
window.appState = {
  salas: [],
  materias: [],
  users: { alunos: [], professores: [], coordenadores: [] },
  banners: [],
  logs: [],
  ranking: [],
  stats: { respostas: 0 },
  user: getSession()
};

// refreshAllSelectsAsync() – atualiza appState com dados do servidor
async function refreshAllSelectsAsync() {
  try {
    const [salas, materias, alunos, profs, coords, banners, logs, ranking, stats] = await Promise.all([
      API.listSalas().catch(()=>[]),
      API.listMaterias().catch(()=>[]),
      API.listUsers('alunos').catch(()=>[]),
      API.listUsers('professores').catch(()=>[]),
      API.listUsers('coordenadores').catch(()=>[]),
      API.listBanners().catch(()=>[]),
      API.listLogs().catch(()=>[]),
      API.listRanking().catch(()=>[]),
      API.stats().catch(()=>({ respostas:0 })),
    ]);
    window.appState.salas = salas || [];
    window.appState.materias = (materias || []).map(m => ({...m, salaNome: (salas || []).find(s=>s.id===m.salaId)?.nome || '-'}));
    window.appState.users = { alunos: alunos||[], professores: profs||[], coordenadores: coords||[] };
    console.log(">> refreshAllSelectsAsync: Alunos recebidos:", window.appState.users.alunos); // LOG ADICIONADO
    window.appState.banners = banners || [];
    window.appState.logs = logs || [];
    window.appState.ranking = ranking || [];
    window.appState.stats = stats || { respostas: 0 };
    // atualiza selects nas telas abertas
    try {
      fillSelectById('a_selSala', window.appState.salas, window.appState.user?.salaId || '');
      fillSelectById('p_selSala', window.appState.salas);
      fillSelectWithMateriasId('p_q_materia', window.appState.materias, true);
      fillSelectWithMateriasId('p_c_materia', window.appState.materias, true);
      fillSelectById('c_m_selSala', window.appState.salas);
      fillSelectById('c_vincular_aluno', (window.appState.users.alunos||[]).map(a=>({id:a.id,nome:a.nome})));
      fillSelectById('c_vincular_sala', (window.appState.salas||[]).map(s=>({id:s.id,nome:s.nome})));
    } catch(e){console.error("Erro ao preencher selects:", e);}
  } catch(err) {
    console.error('Erro no refreshAllSelectsAsync', err);
  }
}
