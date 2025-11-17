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

/* ========= Matérias =========*/
async function criarMateria(orig) {
  console.log(">> criarMateria iniciada. Origem:", orig); // LOG INÍCIO
  try {
    const salaId = orig === 'coordenador' ? sel('c_m_selSala').value : sel('p_selSala').value;
    const nome = orig === 'coordenador' ? val('c_m_nome') : val('p_matNome');
    console.log(">> criarMateria: Sala ID:", salaId, "Nome:", nome); // LOG DADOS
    if (!salaId || !nome) { 
         console.log(">> criarMateria: Sala ou Nome em falta. Abortando."); 
         return alert('Selecione sala e informe um nome.');
    }

    const payload = {
      nome,
      sala_id: salaId, 
      owner_id: window.appState.user?.id || null, 
      quizConfig: { facil:60, medio:30, dificil:10 },
    };
    console.log(">> criarMateria: Payload:", payload); // LOG PAYLOAD

    console.log(">> criarMateria: Chamando API.createMateria..."); // LOG ANTES API
    // *** REATIVE ESTA LINHA ***
    const result = await API.createMateria(payload); 
    console.log(">> criarMateria: API.createMateria concluída. Resultado:", result); // LOG DEPOIS API

    // *** REATIVE ESTE BLOCO ***
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
    // *** FIM DO BLOCO A REATIVAR ***

  } catch (err) {
    console.error(">> ERRO CAPTURADO em criarMateria:", err); // LOG ERRO
    const errorMsg = err.body?.message || err.message || 'Erro ao criar matéria';
    alert(`Erro ao criar matéria: ${errorMsg}`);
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
  
  // 1. Popula os selects de "Criar" e "Conteúdo"
  fillSelectWithMateriasId('p_q_materia', window.appState.materias, true); 
  fillSelectWithMateriasId('p_c_materia', window.appState.materias, true); 

  // 2. Popula o NOVO select de "Filtrar"
  fillSelectWithMateriasId('p_q_filtro_materia', window.appState.materias, true, null, null); //
  // Adiciona uma opção "Selecione" no início do filtro
  const filtroSelect = sel('p_q_filtro_materia');
  if (filtroSelect) {
    filtroSelect.insertAdjacentHTML('afterbegin', '<option value="">-- Selecione para filtrar --</option>');
    filtroSelect.value = ""; // Garante que começa vazio
  }

  // 3. O select de "Criar" (p_q_materia) agora SÓ atualiza o resumo.
  sel('p_q_materia').onchange = renderResumoQuestoes; 

  // 4. O NOVO select de "Filtrar" (p_q_filtro_materia) SÓ atualiza a lista.
  if (filtroSelect) {
    filtroSelect.onchange = renderListaPerguntas;
  }
}

async function adicionarPergunta() {
  try {
    const materiaId = sel("p_q_materia").value;
    const nivel = sel("p_q_nivel").value;
    const enun = byId("p_q_enun").value.trim();
    const correta = parseInt(byId("p_q_cor").value);
    const alternativas = [
      byId("p_q_a0").value.trim(),
      byId("p_q_a1").value.trim(),
      byId("p_q_a2").value.trim(),
      byId("p_q_a3").value.trim(),
      byId("p_q_a4").value.trim(),
    ];
    const imgFile = byId("p_q_img")?.files[0];
    const explicacao = byId("p_q_expl").value.trim();

    // Validações básicas
    if (!materiaId) return alert("Selecione uma matéria.");
    if (!nivel) return alert("Selecione o nível da pergunta.");
    if (!enun) return alert("Digite o enunciado da pergunta.");
    if (alternativas.some(a => !a)) return alert("Preencha todas as alternativas.");
    if (isNaN(correta)) return alert("Selecione a alternativa correta.");

    // Montagem do FormData no formato esperado pelo backend Flask
    const fd = new FormData();
    fd.append("materia_id", materiaId);
    fd.append("nivel", nivel);
    fd.append("enunciado", enun);
    fd.append("opcao_a", alternativas[0]);
    fd.append("opcao_b", alternativas[1]);
    fd.append("opcao_c", alternativas[2]);
    fd.append("opcao_d", alternativas[3]);
    fd.append("opcao_e", alternativas[4]);
    fd.append("resposta_correta", correta);
    fd.append("explicacao", explicacao);
    if (imgFile) fd.append("imagem", imgFile);

    // Debug opcional — mostra o que será enviado
    console.log(" Dados sendo enviados para o backend:");
    for (const [k, v] of fd.entries()) console.log(`${k}:`, v);

    // Envia para a API
    await API.uploadPergunta(fd);

    // Limpa os campos após o envio
    byId("p_q_enun").value = "";
    ["p_q_a0", "p_q_a1", "p_q_a2", "p_q_a3", "p_q_a4"].forEach(id => (byId(id).value = ""));
    byId("p_q_img").value = "";
    if (byId("p_q_preview")) byId("p_q_preview").style.display = "none";

    alert("✅ Pergunta criada com sucesso!");
    await refreshAllSelectsAsync();
    renderListaPerguntas();
    renderResumoQuestoes();

  } catch (err) {
    console.error("❌ Erro ao criar pergunta:", err);
    alert("Erro ao criar a pergunta.");
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
    // --- INÍCIO DA INTERVENÇÃO CIRÚRGICA (Linha 147) ---
    const materiaId = sel('p_c_materia').value;
    if (!materiaId) return alert('Selecione a matéria.');
    
    const nome = val('p_c_nome');
    const file = byId('p_c_file').files[0]; // Pega o primeiro arquivo, se existir
    const texto = val('p_c_texto');
    const link = val('p_c_link');

    if (!nome) return alert('Por favor, dê um título ao conteúdo.');
    if (!file && !texto && !link) return alert('Adicione pelo menos um arquivo, um texto ou um link.');

    const fd = new FormData();
    fd.append('materia_id', materiaId);
    fd.append('nome', nome);
    fd.append('texto', texto);
    fd.append('link_externo', link);
    if (file) {
      fd.append('files', file); // Adiciona o arquivo apenas se ele existir
    }
    
    await API.uploadConteudo(materiaId, fd); // materiaId é adicionado dentro da API.js, mas enviaremos de novo
    
    // Limpa os campos
    byId('p_c_nome').value = '';
    byId('p_c_file').value = '';
    byId('p_c_texto').value = '';
    byId('p_c_link').value = '';
    // --- FIM DA INTERVENÇÃO CIRÚRGICA ---

    alert('Conteúdo enviado!'); // Mostra o alerta primeiro
    await refreshAllSelectsAsync(); // Espera a busca dos dados atualizados (incluindo o novo conteúdo)
    renderPConteudos(); // AGORA redesenha a lista com os dados novos
  } catch (err) {
    console.error(err);
    alert(err.body?.message || 'Erro ao enviar conteúdo');
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
    d.className = 'card'; // Usando a classe 'card' para um visual melhor
    d.style.marginBottom = '12px';
    d.style.position = 'relative'; // Para posicionar os botões

    let html = `<strong>${c.nome}</strong>`; // Título

    if (c.texto) {
      html += `<p class="muted" style="font-size: 13px; white-space: pre-wrap; margin-top: 5px;">${c.texto}</p>`;
    }
    
    if (c.link_externo) {
      html += `<a href="${c.link_externo}" target="_blank" rel="noopener noreferrer" style="font-size: 13px; margin-top: 5px; display: block;">Acessar Link</a>`;
    }

    if (c.url) {
        const isImg = c.tipo && c.tipo.startsWith('image/');
        if (isImg) {
             html += `<img src="${c.url}" style="max-width: 100%; border-radius: 8px; margin-top: 10px;" onerror="this.style.display='none'">`;
        } else {
             html += `<a href="${c.url}" target="_blank" rel="noopener noreferrer" style="font-size: 13px; margin-top: 5px; display: block;">Baixar Arquivo (${c.tipo || 'arquivo'})</a>`;
        }
    }
    
    // Adiciona os botões de ação
    html += `
      <div style="position: absolute; top: 10px; right: 10px; display: flex; flex-direction: column; gap: 5px;">
        <button class="btn" style="background:#3b82f6; color:white; padding: 4px 8px; font-size:12px;" onclick="editarConteudo('${c.id}')">Editar</button>
        <button class="btn" style="background:#dc2626; color:white; padding: 4px 8px; font-size:12px;" onclick="apagarConteudo('${c.id}', '${c.nome}')">Apagar</button>
      </div>
    `;
    
    d.innerHTML = html;
    list.appendChild(d);
  });
}

async function apagarConteudo(id, nome) {
  if (!confirm(`Tem certeza que deseja apagar o conteúdo "${nome}"?\n\nEsta ação não pode ser desfeita.`)) return;

  try {
    await API.deleteConteudo(id);
    alert('Conteúdo excluído com sucesso!');
    await refreshAllSelectsAsync(); // Atualiza os dados
    renderPConteudos(); // Redesenha a lista
  } catch (err) {
    console.error("Erro ao apagar conteúdo:", err);
    alert(err.body?.message || 'Erro ao apagar conteúdo');
  }
}

function editarConteudo(id) {
  const materiaId = sel('p_c_materia').value;
  const materia = (window.appState.materias || []).find(m => m.id === materiaId);
  if (!materia) return alert('Matéria não encontrada.');

  const conteudo = (materia.conteudos || []).find(c => c.id === id);
  if (!conteudo) return alert('Conteúdo não encontrado para edição.');

  console.log("Editando conteúdo:", conteudo);

  // Preenche o novo modal
  byId('edit_conteudo_id').value = conteudo.id;
  byId('edit_conteudo_materia_id').value = materiaId; // Guarda o ID da matéria
  byId('edit_c_nome').value = conteudo.nome;
  byId('edit_c_texto').value = conteudo.texto || '';
  byId('edit_c_link').value = conteudo.link_externo || '';
  
  // Limpa o campo de arquivo e atualiza o info
  byId('edit_c_file').value = '';
  const fileInfo = byId('edit_c_file_info');
  if (conteudo.url) {
    fileInfo.textContent = `Arquivo atual: ${conteudo.url.split('/').pop().substring(37)}`;
  } else {
    fileInfo.textContent = 'Nenhum arquivo associado. Envie um novo.';
  }

  // Exibe o modal
  document.getElementById('app').style.display = 'none';
  document.getElementById('p_edit_conteudo_form').style.display = 'block'; 
}

function cancelarEdicaoConteudo() {
  document.getElementById('p_edit_conteudo_form').style.display = 'none';
  document.getElementById('app').style.display = 'block';
}

async function salvarEdicaoConteudo() {
  try {
    const id = val('edit_conteudo_id');
    const materiaId = val('edit_conteudo_materia_id');
    const nome = val('edit_c_nome');
    const texto = val('edit_c_texto');
    const link = val('edit_c_link');
    const file = byId('edit_c_file').files[0]; // Pega o novo arquivo, se houver

    if (!nome) return alert('O título do conteúdo é obrigatório.');

    const fd = new FormData();
    fd.append('materia_id', materiaId);
    fd.append('nome', nome);
    fd.append('texto', texto);
    fd.append('link_externo', link);
    if (file) {
      fd.append('file', file); // Adiciona o novo arquivo (o backend vai usar 'file')
    }
    
    await API.updateConteudo(id, fd);

    alert('Conteúdo atualizado com sucesso!');
    cancelarEdicaoConteudo(); // Volta para a tela principal
    await refreshAllSelectsAsync(); // Atualiza os dados
    renderPConteudos(); // Redesenha a lista
  } catch(err) {
    console.error("Erro ao salvar edição do conteúdo:", err);
    alert(err.body?.message || 'Erro ao salvar edição do conteúdo');
  }
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
// Adicione estas funções ao final de professor.js

async function renderSalasProfessorSelect() {
  console.log(">> renderSalasProfessorSelect: Iniciando...");
  try {
    await refreshAllSelectsAsync(); // Garante que temos a lista de salas
    // Usa fillSelectById para preencher o select com o novo ID
    fillSelectById('p_salaView', (window.appState.salas || []).map(s => ({ id: s.id, nome: s.nome })), null); 
    // Limpa a tabela de alunos ao selecionar a tab
    const tb = byId('p_tbAlunos');
    if (tb) tb.innerHTML = '<tr><td colspan="2">Selecione uma sala e clique em "Ver alunos".</td></tr>';
  } catch (err) {
      console.error(">> ERRO em renderSalasProfessorSelect:", err);
  }
  console.log(">> renderSalasProfessorSelect: Finalizada.");
}

async function renderAlunosSalaProfessor() {
  console.log(">> renderAlunosSalaProfessor: Iniciando...");
  try {
    const salaId = sel('p_salaView').value; // Lê do select do professor
    const tb = byId('p_tbAlunos'); // Usa o tbody do professor

    if (!tb) return console.error(">> renderAlunosSalaProfessor: Tabela 'p_tbAlunos' não encontrada.");
    tb.innerHTML = ''; // Limpa a tabela

    if (!salaId) {
        tb.innerHTML = '<tr><td colspan="2">Selecione uma sala para ver os alunos.</td></tr>';
        return;
    }

    // Usa a lista de alunos já carregada em appState
    const todosAlunos = window.appState.users?.alunos || []; 
    // Filtra os alunos pela sala selecionada
    const alunosDaSala = todosAlunos.filter(a => a.sala_id === salaId); // Usa snake_case
    console.log(`>> renderAlunosSalaProfessor: Encontrados ${alunosDaSala.length} alunos para a sala ${salaId}`);

    if (alunosDaSala.length === 0) {
         tb.innerHTML = '<tr><td colspan="2">Nenhum aluno encontrado nesta sala.</td></tr>';
         return;
    }

    alunosDaSala.forEach(a => {
        const tr = tb.insertRow();
        // Mostra Nome e Matrícula (usando 'matricula')
        tr.innerHTML = `<td>${a.nome || '-'}</td><td>${a.matricula || '-'}</td>`; 
    });
  } catch(err) {
      console.error(">> ERRO em renderAlunosSalaProfessor:", err);
      const tb = byId('p_tbAlunos');
      if (tb) tb.innerHTML = '<tr><td colspan="2">Erro ao carregar alunos.</td></tr>';
  }
   console.log(">> renderAlunosSalaProfessor: Finalizada.");
}
window.adicionarPergunta = adicionarPergunta;

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btn_add_pergunta");
  if (btn) btn.addEventListener("click", adicionarPergunta);
});

// ===========================================
// NOVAS FUNÇÕES - CRUD DE PERGUNTAS
// (Cole este bloco no final de professor.js)
// ===========================================

/**
 * Renderiza a tabela de perguntas cadastradas para a matéria selecionada.
 */
function renderListaPerguntas() {
  const materiaId = sel('p_q_filtro_materia').value;
  const tbody = byId('p_q_lista_tbody');
  const info = byId('p_q_lista_info');

  // Verifica se os elementos existem (importante para evitar erros)
  if (!tbody || !info) {
      console.warn("Elementos da lista de perguntas (tbody ou info) não encontrados.");
      return;
  }
  
  tbody.innerHTML = ''; // Limpa a tabela

  if (!materiaId) {
    info.textContent = 'Selecione uma matéria acima para ver as perguntas.';
    return;
  }

  const materia = (window.appState.materias || []).find(m => m.id === materiaId);
  // As perguntas estão em materia.perguntas (como definido no app.py)
  const perguntas = materia?.perguntas || []; 

  if (perguntas.length === 0) {
    info.textContent = 'Nenhuma pergunta cadastrada para esta matéria.';
    return;
  }

  info.textContent = ''; // Limpa a mensagem de info

  perguntas.forEach(p => {
    const tr = document.createElement('tr');
    tr.id = `pergunta-row-${p.id}`; // ID para remoção fácil
    
    // 'p.q' é o enunciado (definido no app.py)
    const enunciadoCurto = p.q.length > 70 ? p.q.substring(0, 70) + '...' : p.q;

    tr.innerHTML = `
      <td>${enunciadoCurto}</td>
      <td>${cap(p.nivel)}</td>
      <td>
        <div class="table-actions">
          <button class="btn-action btn-editar" onclick="abrirModalEditarPergunta('${p.id}')">Editar</button>
          <button class="btn-action btn-apagar" onclick="apagarPergunta('${p.id}')">Apagar</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Abre o modal de edição e preenche com os dados da pergunta.
 */
function abrirModalEditarPergunta(perguntaId) {
  const materiaId = sel('p_q_filtro_materia').value;
  const materia = (window.appState.materias || []).find(m => m.id === materiaId);
  if (!materia) return alert('Matéria não encontrada.');

  const pergunta = (materia.perguntas || []).find(p => p.id === perguntaId);
  if (!pergunta) return alert('Pergunta não encontrada para edição.');

  console.log("Editando pergunta:", pergunta);

  // Preenche o modal
  byId('edit_p_id').value = pergunta.id;
  byId('edit_p_materia_id_original').value = materiaId;
  byId('edit_p_materia_nome').value = `${materia.nome} (Matéria não pode ser alterada)`;
  sel('edit_p_nivel').value = pergunta.nivel;
  byId('edit_p_enun').value = pergunta.q; // 'q' é o enunciado
  byId('edit_p_expl').value = pergunta.explicacao || '';
  
  // Alternativas (pergunta.a é o array de alternativas)
  (pergunta.a || []).forEach((alt, i) => {
    byId(`edit_p_a${i}`).value = alt;
  });
  
  sel('edit_p_cor').value = pergunta.correta; // 'correta' é o índice

  // Imagem
  byId('edit_p_img').value = ''; // Limpa o seletor de arquivo
  const preview = byId('edit_p_preview');
  const imgInfo = byId('edit_p_img_info');
  
  if (pergunta.img_url) {
    preview.src = pergunta.img_url;
    preview.style.display = 'block';
    imgInfo.textContent = 'Envie um novo arquivo para substituir o atual.';
  } else {
    preview.src = '';
    preview.style.display = 'none';
    imgInfo.textContent = 'Nenhuma imagem associada. Envie um arquivo (opcional).';
  }

  // Exibe o modal
  document.getElementById('app').style.display = 'none';
  document.getElementById('p_edit_pergunta_form').style.display = 'block'; 
}

/**
 * Fecha o modal de edição de pergunta.
 */
function cancelarEdicaoPergunta() {
  document.getElementById('p_edit_pergunta_form').style.display = 'none';
  document.getElementById('app').style.display = 'block';
}

/**
 * Salva as alterações da pergunta (chama a API PUT).
 */
async function salvarEdicaoPergunta() {
  try {
    const id = val('edit_p_id');
    const materiaId = val('edit_p_materia_id_original'); // Matéria original
    
    // Validações básicas
    if (!id || !materiaId) return alert('Erro: IDs não encontrados.');
    
    const enun = val('edit_p_enun');
    if (!enun) return alert('O enunciado é obrigatório.');

    // Monta o FormData
    const fd = new FormData();
    fd.append('materia_id', materiaId);
    fd.append('nivel', sel('edit_p_nivel').value);
    fd.append('enunciado', enun);
    fd.append('opcao_a', val('edit_p_a0'));
    fd.append('opcao_b', val('edit_p_a1'));
    fd.append('opcao_c', val('edit_p_a2'));
    fd.append('opcao_d', val('edit_p_a3'));
    fd.append('opcao_e', val('edit_p_a4'));
    fd.append('resposta_correta', sel('edit_p_cor').value);
    fd.append('explicacao', val('edit_p_expl'));

    const imgFile = byId('edit_p_img').files[0];
    if (imgFile) {
      fd.append('imagem', imgFile);
    }

    // Chama a API de atualização
    await API.updatePergunta(id, fd);

    alert('Pergunta atualizada com sucesso!');
    cancelarEdicaoPergunta(); // Fecha o modal
    
    // Atualiza os dados e a UI
    await refreshAllSelectsAsync();
    renderListaPerguntas(); // Redesenha a lista

  } catch(err) {
    console.error("Erro ao salvar edição da pergunta:", err);
    alert(err.body?.message || 'Erro ao salvar edição');
  }
}

/**
 * Apaga uma pergunta (chama a API DELETE).
 */
async function apagarPergunta(perguntaId) {
  if (!confirm('Tem certeza que deseja apagar esta pergunta?\nEsta ação não pode ser desfeita.')) return;

  try {
    await API.deletePergunta(perguntaId);
    
    // Remove a linha da tabela localmente (para feedback instantâneo)
    const row = byId(`pergunta-row-${perguntaId}`);
    if (row) row.remove();
    
    // Atualiza o appState (importante)
    await refreshAllSelectsAsync();
    // Re-renderiza a lista para garantir consistência
    renderListaPerguntas(); 

    alert('Pergunta excluída com sucesso!');
  } catch (err) {
    console.error("Erro ao apagar pergunta:", err);
    alert(err.body?.message || 'Erro ao apagar pergunta');
  }
}
// ===========================================
// NOVAS FUNÇÕES - BIBLIOTECA DE PERGUNTAS
// (Cole este bloco no final de professor.js)
// ===========================================

/**
 * Prepara a aba "Biblioteca de Perguntas".
 * Popula o menu de "Origem" (todas as matérias) e "Destino" (só as do professor).
 */
async function renderBiblioteca() {
  await refreshAllSelectsAsync(); // Garante que temos os dados mais recentes

  const selectOrigem = sel('p_bib_origem');
  const selectDestino = sel('p_bib_destino');

  // 1. Popula Origem: (onlyOwned = false)
  fillSelectWithMateriasId('p_bib_origem', window.appState.materias, false, null, null);
  selectOrigem.insertAdjacentHTML('afterbegin', '<option value="">-- Selecione uma matéria --</option>');
  selectOrigem.value = "";
  
  // 2. Popula Destino: (onlyOwned = true)
  fillSelectWithMateriasId('p_bib_destino', window.appState.materias, true, null, null);
  selectDestino.insertAdjacentHTML('afterbegin', '<option value="">-- Selecione uma das SUAS matérias --</option>');
  selectDestino.value = "";

  // 3. Liga o evento para mostrar as perguntas ao selecionar a origem
  selectOrigem.onchange = renderBibliotecaPerguntas;
  
  // 4. Limpa a tabela
  byId('p_bib_lista_tbody').innerHTML = '<tr><td colspan="3" class="muted">Selecione uma matéria de origem para ver as perguntas.</td></tr>';
}

/**
 * Mostra as perguntas da matéria de "Origem" selecionada.
 */
function renderBibliotecaPerguntas() {
  const materiaId = sel('p_bib_origem').value;
  const tbody = byId('p_bib_lista_tbody');
  tbody.innerHTML = '';

  if (!materiaId) {
    tbody.innerHTML = '<tr><td colspan="3" class="muted">Selecione uma matéria de origem para ver as perguntas.</td></tr>';
    return;
  }

  const materia = (window.appState.materias || []).find(m => m.id === materiaId);
  const perguntas = materia?.perguntas || [];

  if (perguntas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="muted">Esta matéria não possui perguntas cadastradas.</td></tr>';
    return;
  }

  perguntas.forEach(p => {
    const tr = document.createElement('tr');
    const enunciadoCurto = p.q.length > 70 ? p.q.substring(0, 70) + '...' : p.q;

    tr.innerHTML = `
      <td>${enunciadoCurto}</td>
      <td>${cap(p.nivel)}</td>
      <td>
        <div class="table-actions">
          <button class="btn-action btn-editar" onclick="copiarPergunta('${p.id}')">Copiar</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Copia a pergunta selecionada (ID) para a matéria de destino (ID).
 */
async function copiarPergunta(perguntaId) {
  const destinoMateriaId = sel('p_bib_destino').value;

  if (!destinoMateriaId) {
    alert("Erro: Por favor, selecione uma 'Matéria de Destino' (uma das suas) antes de copiar.");
    return;
  }

  const payload = {
    pergunta_id: perguntaId,
    nova_materia_id: destinoMateriaId
  };

  try {
    // Desativa o botão temporariamente
    const btn = event.target;
    btn.disabled = true;
    btn.textContent = 'Copiando...';

    await API.copyPergunta(payload);
    
    // Atualiza o cache local de perguntas
    await refreshAllSelectsAsync(); 
    
    alert('Pergunta copiada com sucesso para a sua matéria!');

    // Reativa o botão
    btn.disabled = false;
    btn.textContent = 'Copiar';

  } catch (err) {
    console.error("Erro ao copiar pergunta:", err);
    alert(err.body?.message || 'Erro ao copiar pergunta');
    // Reativa o botão em caso de erro
    const btn = event.target;
    btn.disabled = false;
    btn.textContent = 'Copiar';
  }
}
