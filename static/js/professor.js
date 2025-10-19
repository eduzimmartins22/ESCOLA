console.log("--- PROFESSOR.JS CARREGADO ---");
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
  console.log(">> criarMateria iniciada. Origem:", orig); // LOG INÍCIO
  try {
    const salaId = orig === 'coordenador' ? sel('c_m_selSala').value : sel('p_selSala').value;
    const nome = orig === 'coordenador' ? val('c_m_nome') : val('p_matNome');
    console.log(">> criarMateria: Sala ID:", salaId, "Nome:", nome); // LOG DADOS
    if (!salaId || !nome) return alert('Selecione sala e informe um nome.');

    const payload = {
      nome,
      // Corrigido para sala_id como no backend
      sala_id: salaId, 
      owner_id: window.appState.user?.id || null, // Usando owner_id
      quizConfig: { facil:60, medio:30, dificil:10 },
    };
    console.log(">> criarMateria: Payload:", payload); // LOG PAYLOAD

    console.log(">> criarMateria: Chamando API.createMateria..."); // LOG ANTES API
    await API.createMateria(payload);
    console.log(">> criarMateria: API.createMateria concluída."); // LOG DEPOIS API

    if (orig === 'coordenador') {
      byId('c_m_nome').value = '';
    } else {
      byId('p_matNome').value = '';
    }

    console.log(">> criarMateria: Chamando refreshAllSelectsAsync..."); // LOG ANTES REFRESH
    await refreshAllSelectsAsync();
    console.log(">> criarMateria: refreshAllSelectsAsync concluído."); // LOG DEPOIS REFRESH

    // Chama a função de renderização correta dependendo da origem
    if (orig === 'coordenador') {
        console.log(">> criarMateria: Chamando renderMateriasCoord..."); // LOG antes (Coordenador)
        renderMateriasCoord(); // Chama a função do Coordenador para atualizar a lista na tab c_materias
        console.log(">> criarMateria: renderMateriasCoord chamada."); // LOG depois (Coordenador)
    } else { // Assume 'professor'
        console.log(">> criarMateria: Chamando renderProfMaterias..."); // LOG antes (Professor)
        renderProfMaterias(); // Chama a função do Professor para atualizar a lista na tab p_materias
        console.log(">> criarMateria: renderProfMaterias chamada."); // LOG depois (Professor)
    }

    alert('Matéria criada!'); // Mostra o alerta após a renderização
  } catch (err) {
    console.error(">> ERRO em criarMateria:", err); // LOG ERRO
    alert(err.body?.message || err.message || 'Erro ao criar matéria');
  }
  console.log(">> criarMateria finalizada."); // LOG FIM
}

async function renderProfMaterias() {
  console.log(">> renderProfMaterias iniciada."); // LOG INÍCIO
  try {
    const materias = window.appState.materias || []; // Usar dados já buscados
    console.log(">> renderProfMaterias: Matérias recebidas:", materias); // LOG MATÉRIAS

    const container = byId('p_listaMaterias');
    if (!container) { // Verifica se o container existe
      console.error(">> renderProfMaterias: Container 'p_listaMaterias' não encontrado!");
      return;
    }
    container.innerHTML = '';

    const userId = window.appState.user?.id;
    console.log(">> renderProfMaterias: Filtrando para user ID:", userId); // LOG USER ID
    const mine = materias.filter(m => m.owner_id === userId); // Confirme se o backend retorna owner_id
    console.log(">> renderProfMaterias: Matérias do professor:", mine); // LOG FILTRADAS

    if (mine.length === 0) {
        container.innerHTML = '<span class="muted">Nenhuma matéria cadastrada por você.</span>';
        console.log(">> renderProfMaterias: Nenhuma matéria encontrada para este professor."); // LOG VAZIO
        return;
    }

    mine.forEach((m, index) => { // Adiciona index para depuração
      console.log(`>> renderProfMaterias: Processando matéria ${index}:`, m); // LOG DENTRO DO LOOP
      const c = document.createElement('div');
      c.className = 'card';

      const sala = window.appState.salas.find(s => s.id === m.sala_id); 
      const nomeSala = sala ? sala.nome : '-'; 
      console.log(`>> renderProfMaterias: Matéria ${index} - Sala encontrada:`, sala); // LOG SALA ENCONTRADA

      c.innerHTML = `<strong>${m.nome}</strong><div class="muted">Sala: ${nomeSala}</div>
          <div class="muted">Inscritos: ${m.inscritos?.length || 0}</div>`; 

      container.appendChild(c);
    });
  } catch (err) {
    console.error(">> ERRO em renderProfMaterias:", err); // LOG ERRO
    alert('Erro ao listar matérias');
  }
  console.log(">> renderProfMaterias finalizada."); // LOG FIM
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

function editarSala(id) {
  // Encontra a sala na lista global do appState
  const sala = (window.appState.salas || []).find(s => s.id === id);
  if (!sala) return alert('Sala não encontrada para edição.');

  // ### LOGS ADICIONADOS ###
  console.log("Tentando editar sala:", sala);
  const inputId = byId('edit_sala_id');
  const inputNome = byId('edit_sala_nome');
  const inputCap = byId('edit_sala_cap');
  console.log("Elemento edit_sala_id:", inputId);
  console.log("Elemento edit_sala_nome:", inputNome);
  console.log("Elemento edit_sala_cap:", inputCap);
  // ### FIM DOS LOGS ###

  // Preenche os campos de um formulário de edição (que precisaremos criar no HTML)
  // Usaremos IDs como 'edit_sala_id', 'edit_sala_nome', 'edit_sala_cap'
  inputId.value = sala.id; // Linha 221 ou próxima pode ser esta
  inputNome.value = sala.nome;
  inputCap.value = sala.capacidade;

  // Esconde a aplicação principal e mostra o formulário de edição da sala
  document.getElementById('app').style.display = 'none';
  document.getElementById('c_edit_sala_form').style.display = 'block'; 
}

// Função para cancelar a edição da sala (precisaremos criar o botão no HTML)
function cancelarEdicaoSala() {
  document.getElementById('c_edit_sala_form').style.display = 'none';
  document.getElementById('app').style.display = 'block';
}

// Função para salvar a edição da sala (precisaremos criar no HTML e implementar a chamada API)
async function salvarEdicaoSala() {
  try {
    const id = val('edit_sala_id');
    const nome = val('edit_sala_nome');
    const capacidade = parseInt(val('edit_sala_cap') || '0', 10);

    if (!nome || !capacidade) return alert('Preencha nome e capacidade.');

    const payload = { nome, capacidade };

    // !!! ATENÇÃO: Precisamos criar a função API.updateSala no api.js e a rota no app.py !!!
    await API.updateSala(id, payload); 

    //alert('Dados da sala atualizados com sucesso! (Função ainda não implementada no backend)'); // Alerta temporário

    cancelarEdicaoSala(); // Volta para a tela principal
    await refreshAllSelectsAsync(); // Atualiza os dados
    renderSalasCoord(); // Redesenha a tabela de salas
  } catch(err) {
    console.error(err);
    alert('Erro ao salvar edição da sala');
  }
}