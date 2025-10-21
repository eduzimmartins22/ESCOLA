// coordenador.js
const COORD_MASTER_PASSWORD = "12345"; // ainda usado só client-side se desejar; validação deve ser server-side

async function coordCriarProfessor() {
  try {
    const nome = val("c_p_nome");
    const cpf = (val("c_p_cpf") || "").replace(/[^\d]/g, "");
    const mat = val("c_p_mat");
    const senha = val("c_p_senha");

    if (!nome || !cpf || !senha) return alert("Preencha nome, CPF e senha.");
    if (!cpfRegex.test(cpf))
      return alert("CPF inválido. Use 11 dígitos numéricos.");

    // ### CORREÇÃO ABAIXO ###
    // Criamos o payload correto com o 'role' dentro do objeto
    // e chamamos a API.createUser com apenas um argumento.
    const payload = { nome, cpf, mat, senha, role: "professor" };
    await API.createUser(payload);

    ["c_p_nome", "c_p_cpf", "c_p_mat", "c_p_senha"].forEach(
      (id) => (byId(id).value = "")
    );
    await renderProfsCoord();
    await refreshAllSelectsAsync();
    alert("Professor criado!");
  } catch (err) {
    console.error(err);
    alert(err.body?.message || err.message || "Erro ao criar professor");
  }
}

async function renderProfsCoord() {
  try {
    const users = await API.listUsers("professores");
    window.appState.users.professores = users || [];
    const tb = byId("c_tbProfs");
    tb.innerHTML = "";
    if (!window.appState.users.professores.length) {
      tb.innerHTML =
        '<tr><td colspan="4">Nenhum professor cadastrado.</td></tr>';
      return;
    }
    window.appState.users.professores.forEach((p) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.nome}</td>
        <td>${p.cpf}</td>
        <td>${p.matricula || "-"}</td>
        <td>
          <button class="btn" style="background:#dc2626; color:white; padding:4px 8px;" onclick="apagarUsuario('${
            p.id
          }','professor')">Excluir</button>
          <button class="btn" style="background:#3b82f6; color:white; padding:4px 8px;" onclick="editarUsuario('${
            p.id
          }','professor')">Editar</button>
        </td>
      `;
      tb.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
  }
}

/* ========= Alunos ========= */
async function coordCriarAluno() {
  try {
    const nome = val("c_a_nome"),
      cpf = val("c_a_cpf"),
      mat = val("c_a_mat"),
      senha = val("c_a_senha");
    if (!nome || !cpf || !senha) return alert("Preencha nome, CPF e senha.");
    const cpfLimpo = cpf.replace(/[^\d]/g, "");
    if (!cpfRegex.test(cpfLimpo)) return alert("CPF inválido.");
    const payload = {
      nome,
      cpf: cpfLimpo,
      mat,
      senha,
      role: "aluno",
      salaId: null,
    };
    await API.createUser(payload);
    ["c_a_nome", "c_a_cpf", "c_a_mat", "c_a_senha"].forEach(
      (id) => (byId(id).value = "")
    );
    alert("Aluno criado!"); // Mostra o alerta
    await refreshAllSelectsAsync(); // Busca os dados atualizados PRIMEIRO
    await renderAlunosCoord(); // AGORA desenha a tabela com o novo aluno
  } catch (err) {
    console.error(err);
    alert("Erro ao criar aluno");
  }
}

async function vincularAlunoASala() {
  try {
    const alunoId = sel("c_vincular_aluno").value;
    const salaId = sel("c_vincular_sala").value;
    if (!alunoId || !salaId) return alert("Selecione um aluno e uma sala.");
    await API.updateUser("alunos", alunoId, { salaId });
    alert("Aluno vinculado à sala com sucesso!");
    await refreshAllSelectsAsync(); // Busca os dados atualizados PRIMEIRO
    await renderAlunosCoord(); // AGORA desenha a tabela com os novos dados
  } catch (err) {
    console.error(err);
    alert("Erro ao vincular aluno");
  }
}

async function renderAlunosCoord() {
  try {
    // Removemos as chamadas API.listUsers e API.listSalas daqui
    // A função agora confia que window.appState já está atualizado pela refreshAllSelectsAsync

    // Atualiza os selects de vinculação (isso está correto aqui)
    fillSelectById(
      "c_vincular_aluno",
      (window.appState.users.alunos || []).map((a) => ({
        id: a.id,
        nome: a.nome,
      }))
    );
    fillSelectById(
      "c_vincular_sala",
      (window.appState.salas || []).map((s) => ({ id: s.id, nome: s.nome }))
    );

    const tb = byId("c_tbAlunos");
    tb.innerHTML = "";

    // Garante que temos a lista de alunos antes de tentar desenhar
    const alunosParaRenderizar = window.appState.users.alunos || [];

    if (alunosParaRenderizar.length === 0) {
      tb.innerHTML = '<tr><td colspan="5">Nenhum aluno cadastrado.</td></tr>';
      return;
    }

    alunosParaRenderizar.forEach((a) => {
      console.log(
        `>> renderAlunosCoord: Renderizando aluno ${a.nome}, Sala ID: ${a.sala_id}`
      ); // LOG ADICIONADO

      // Busca o nome da sala na lista JÁ ATUALIZADA em window.appState.salas
      const sala = window.appState.salas.find((s) => s.id === a.sala_id); // Guardamos a sala encontrada
      const salaNome = sala ? sala.nome : "-"; // Usamos a sala encontrada para pegar o nome

      console.log(
        `>> renderAlunosCoord: Sala encontrada para ${a.nome}:`,
        sala
      ); // LOG ADICIONAL

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${a.nome}</td>
        <td>${a.cpf}</td>
        <td>${a.matricula || "-"}</td>
        <td>${salaNome}</td> 
        <td>
          <button class="btn" style="background:#dc2626; color:white; padding:4px 8px;" onclick="apagarUsuario('${
            a.id
          }','aluno')">Apagar</button>
          <button class="btn" style="background:#3b82f6; color:white; padding:4px 8px;" onclick="editarUsuario('${
            a.id
          }','aluno')">Editar</button>
        </td>
      `;
      tb.appendChild(tr);
    });
  } catch (err) {
    console.error("Erro ao renderizar tabela de alunos:", err);
  }
}

async function apagarUsuario(id, role) {
  try {
    if (!confirm(`Tem certeza que deseja apagar este(a) ${role}?`)) return;
    if (role === "sala") {
      if (
        !confirm(
          "Ao apagar a sala, os alunos associados a ela serão desvinculados. Deseja continuar?"
        )
      )
        return;
      // desvincular alunos e deletar sala
      const alunos = window.appState.users.alunos || [];
      for (const a of alunos.filter((a) => a.salaId === id)) {
        await API.updateUser("alunos", a.id, { salaId: null });
      }
      await API.deleteSala(id);
    } else {
      await API.deleteUser(role, id);
    }
    await refreshAllSelectsAsync();
    if (role === "aluno") renderAlunosCoord();
    if (role === "professor") renderProfsCoord();
    if (role === "sala") renderSalasCoord();
    alert("Usuário excluído!");
  } catch (err) {
    console.error(err);
    alert("Erro ao apagar usuário");
  }
}

function editarUsuario(id, role) {
  // preenche form de edição (local) — ao salvar chama updateUser
  let user;
  if (role === "aluno") {
    user = (window.appState.users.alunos || []).find((u) => u.id === id);
  } else if (role === "professor") {
    user = (window.appState.users.professores || []).find((u) => u.id === id);
  }
  if (!user) return alert("Usuário não encontrado para edição.");
  byId("edit_id").value = user.id;
  byId("edit_role").value = role;
  byId("edit_nome").value = user.nome;
  byId("edit_cpf").value = user.cpf;
  byId("edit_senha").value = ""; // Deixa o campo vazio
  byId("edit_senha").placeholder = "Digite NOVA senha (se desejar alterar)";
  byId("edit_mat").value = user.matricula || ""; // Usa a propriedade correta 'matricula'
  document.getElementById("app").style.display = "none";
  document.getElementById("c_edit_form").style.display = "block";
}

async function salvarEdicao() {
  try {
    // Lê todos os campos do formulário
    const id = val("edit_id"),
      role = val("edit_role"),
      nome = val("edit_nome"),
      cpf = val("edit_cpf"),
      senha = val("edit_senha"), // Lê a nova senha (pode ser vazia)
      mat = val("edit_mat"); // Lê a matrícula

    // Validação corrigida: Senha não é mais obrigatória aqui
    if (!nome || !cpf) return alert("Preencha pelo menos nome e CPF.");

    const cpfLimpo = cpf.replace(/[^\d]/g, "");
    if (cpfLimpo.length !== 11) return alert("CPF inválido.");

    // Cria o payload inicial com os campos sempre presentes
    const payload = { nome, cpf: cpfLimpo, mat };

    // Adiciona a senha ao payload APENAS se o usuário digitou uma nova
    if (senha) {
      payload.senha = senha;
    }

    // Envia para a API (o backend já sabe lidar com a senha opcional)
    await API.updateUser(
      role === "aluno" ? "alunos" : "professores",
      id,
      payload
    );

    alert("Dados atualizados com sucesso!");
    cancelarEdicao(); // Volta para a tela anterior

    // Busca os dados atualizados do servidor PRIMEIRO
    await refreshAllSelectsAsync();

    // AGORA atualiza a tabela na tela com os novos dados
    if (role === "aluno") renderAlunosCoord();
    if (role === "professor") renderProfsCoord();
  } catch (err) {
    console.error(err);
    alert("Erro ao salvar edição");
  }
}

function cancelarEdicao() {
  document.getElementById("c_edit_form").style.display = "none";
  document.getElementById("app").style.display = "block";
}

/* Materias e banners do coordenador (simplificados) */

async function renderMateriasCoord() {
  console.log(">> renderMateriasCoord (coordenador.js) iniciada."); // LOG INÍCIO
  try {
    // Usa as matérias já carregadas no estado global
    const materias = window.appState.materias || [];
    console.log(
      ">> renderMateriasCoord: Usando matérias do appState:",
      materias
    ); // LOG MATÉRIAS

    const tb = byId("c_m_list");
    if (!tb) {
      console.error(
        ">> renderMateriasCoord: Elemento 'c_m_list' não encontrado!"
      );
      return;
    }
    tb.innerHTML = "";

    if (!materias.length) {
      tb.innerHTML = '<span class="muted">Nenhuma matéria cadastrada.</span>';
      console.log(">> renderMateriasCoord: Nenhuma matéria encontrada."); // LOG VAZIO
      return;
    }

    materias.forEach((m, index) => {
      console.log(`>> renderMateriasCoord: Processando matéria ${index}:`, m); // LOG DENTRO DO LOOP
      const d = document.createElement("div");
      d.className = "card";

      // --- CORREÇÃO AQUI ---
      // Usa m.sala_id (snake_case) para encontrar a sala
      const sala =
        (window.appState.salas || []).find((s) => s.id === m.sala_id) || {};
      const nomeSala = sala.nome || "-";
      console.log(
        `>> renderMateriasCoord: Matéria ${index} - Sala encontrada:`,
        sala
      ); // LOG SALA

      d.innerHTML = `<strong>${m.nome}</strong><div class="muted">Sala: ${nomeSala}</div>`;
      tb.appendChild(d);
    });
  } catch (err) {
    console.error(">> ERRO em renderMateriasCoord:", err); // LOG ERRO
    // Poderíamos adicionar um alerta aqui se quiséssemos
  }
  console.log(">> renderMateriasCoord (coordenador.js) finalizada."); // LOG FIM
}

/* Banners */
async function salvarBanner() {
  try {
    const img = byId("ban_img").files[0];
    const tit = val("ban_tit"),
      data = val("ban_data"),
      hora = val("ban_hora"),
      local = val("ban_local"),
      mats = val("ban_mats"),
      dicas = val("ban_dicas");
    if (!tit) return alert("Informe o título.");
    const fd = new FormData();
    if (img) fd.append("img", img);
    fd.append("tit", tit);
    fd.append("data", data);
    fd.append("hora", hora);
    fd.append("local", local);
    fd.append("mats", mats);
    fd.append("dicas", dicas);
    await API.createBanner(fd);
    alert("Banner salvo!");
    await renderBannersCoord();
  } catch (err) {
    console.error(err);
    alert("Erro ao salvar banner");
  }
}
async function renderBannersCoord() {
  console.log(">> renderBannersCoord: Iniciando renderização..."); // Log
  try {
    const banners = await API.listBanners();
    window.appState.banners = banners || [];
    console.log(">> renderBannersCoord: Banners recebidos:", banners); // Log

    const col = byId('c_bannersList');
    if (!col) {
        console.error(">> renderBannersCoord: Elemento 'c_bannersList' não encontrado!");
        return;
    }
    col.innerHTML = ''; // Limpa a lista

    const bannersParaRenderizar = window.appState.banners || [];

    if (bannersParaRenderizar.length === 0) { 
        col.innerHTML = '<span class="muted">Nenhum banner cadastrado.</span>'; 
        console.log(">> renderBannersCoord: Nenhum banner encontrado."); // Log
        return; 
    }

    // Mostra apenas os últimos 3 (ou menos, se houver menos)
    bannersParaRenderizar.slice(-3).forEach((b, index) => { 
      console.log(`>> renderBannersCoord: Renderizando banner ${index}:`, b); // Log
      const d = document.createElement('div');
      // Usamos a classe 'banner' que já tem estilos definidos
      d.className = 'banner'; 

      // Formata a data (se existir) para dd/mm/aaaa
      let dataFormatada = '-';
      if (b.data_evento) {
          try {
              const dataObj = new Date(b.data_evento + 'T00:00:00'); // Adiciona T00:00:00 para evitar problemas de fuso horário
              dataFormatada = dataObj.toLocaleDateString('pt-BR');
          } catch (e) { console.error("Erro ao formatar data do banner:", e); }
      }

      // Formata a hora (se existir) para hh:mm
      let horaFormatada = '';
      if (b.hora) {
          // Assume que a hora vem como HH:MM:SS ou HH:MM
          horaFormatada = b.hora.substring(0, 5); 
      }

      // --- CORREÇÃO DO HTML ---
      // Adiciona a tag <img> usando b.img_url
      // Adiciona a data formatada e a hora formatada
      d.innerHTML = `
        <img src="${b.img_url || ''}" alt="${b.tit || 'Banner'}" style="width:120px; height: 90px; object-fit: cover; border-radius: 10px; border: 1px solid var(--borda);" onerror="this.style.display='none';"> 
        <div>
          <h4>${b.tit || 'Sem Título'}</h4>
          <p class="muted" style="font-size: 11px; margin-bottom: 4px;">${b.dicas || ''}</p>
          <span class="muted">
             <b>Data:</b> ${dataFormatada} ${horaFormatada ? ` ${horaFormatada}` : ''} 
          </span>
          <br> <span class="muted" style="font-size: 11px;"><b>Local:</b> ${b.local || '-'} | <b>Matérias:</b> ${b.materias || '-'}</span>
        </div>
      `;
      // --- FIM DA CORREÇÃO ---

      col.appendChild(d);
    });
  } catch(err){ 
      console.error(">> ERRO em renderBannersCoord:", err); 
  }
  console.log(">> renderBannersCoord: Renderização finalizada."); // Log
}

/* Dashboard */
async function renderDashboard() {
  console.log(">> renderDashboard: Iniciando renderização...");
  try {
    // Busca os dados mais recentes da API
    // Adicionamos listUsers aqui para ter a contagem total mais precisa
    const [logs, materias, stats, users] = await Promise.all([
      API.listLogs().catch(() => []),
      API.listMaterias().catch(() => []),
      API.stats().catch(() => ({ respostas: 0, usuarios: 0, materias: 0 })),
      // Busca todos os tipos de utilizadores para contagem total
      Promise.all([
        API.listUsers("alunos").catch(() => []),
        API.listUsers("professores").catch(() => []),
        API.listUsers("coordenadores").catch(() => []),
      ]).then((results) => [].concat(...results)), // Junta os arrays de utilizadores
    ]);
    console.log(">> renderDashboard: Dados recebidos:", {
      logs,
      materias,
      stats,
      users,
    });

    // Atualiza o estado global
    window.appState.logs = logs || [];
    window.appState.materias = materias || [];
    window.appState.stats = stats || { respostas: 0, usuarios: 0, materias: 0 };
    // Atualiza utilizadores no estado global (se necessário noutros locais)
    // window.appState.users = { alunos: ..., professores: ..., coordenadores: ... }; // Poderia separar aqui

    // --- Atualiza os cartões do Dashboard ---
    // 'd1' (Total Logins) - Agora usamos a contagem total de utilizadores
    byId("d1").textContent = users.length || 0;
    // 'd2' (Questões Respondidas)
    byId("d2").textContent = window.appState.stats.respostas || 0;
    // 'd3' (Matérias)
    byId("d3").textContent = window.appState.materias.length || 0; // Usa o comprimento do array de matérias

    // --- Atualiza a Tabela de Acessos ---
    const tbodyEl = byId('c_tbLogs'); // Obtém o elemento tbody
        if (!tbodyEl) {
            console.error(">> renderDashboard: Tabela tbody 'c_tbLogs' não encontrada!");
        } else {
            const tableEl = tbodyEl.closest('table'); // Encontra o elemento <table> pai
            if (!tableEl) {
                 console.error(">> renderDashboard: Elemento <table> pai para 'c_tbLogs' não encontrado!");
                 // Considerar retornar aqui ou lidar com o erro de outra forma
            } else {
                // Remove o cabeçalho antigo, se existir
                tableEl.tHead?.remove(); 
                // Limpa o conteúdo atual do tbody
                tbodyEl.innerHTML = ''; 

                const logsParaRenderizar = window.appState.logs || [];

                if (logsParaRenderizar.length === 0) {
                     tbodyEl.innerHTML = '<tr><td colspan="2">Nenhum registo de acesso encontrado.</td></tr>'; // colspan="2"
                } else {
                    // Cria o novo cabeçalho (<thead>) na tabela pai (tableEl)
                    const thead = tableEl.createTHead(); 
                    const headerRow = thead.insertRow();
                    headerRow.innerHTML = '<th>Usuário</th><th>Papel</th>'; // Cabeçalho com 2 colunas

                    // Adiciona as linhas de dados ao tbody existente (tbodyEl)
                    logsParaRenderizar.forEach(l=>{
                      const tr = tbodyEl.insertRow(); // Insere linha no tbody correto
                      const dataEntrada = l.in ? new Date(l.in).toLocaleString('pt-BR') : '-'; // Formata a data se existir
                      // Cria células apenas para user e role (removemos 'Entrou' e 'Saiu')
                      tr.innerHTML = `<td>${l.user || '-'}</td><td>${l.role || '-'}</td>`; 
                    });
                }
                console.log(">> renderDashboard: Tabela de logs simplificada preenchida.");
            }
        }
        // --- Fim da Atualização da Tabela ---

    // --- Atualiza o Gráfico ---
        const canvasEl = byId('c_chart'); // Pega o elemento canvas
        if (!canvasEl) {
             console.error(">> renderDashboard: Elemento canvas 'c_chart' não encontrado!");
             // Considerar retornar aqui se o gráfico for essencial
        } else {
            const ctx = canvasEl.getContext('2d');
            ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height); // Limpa o canvas

            // Reconta os papéis a partir da lista 'users' obtida no Promise.all
            const counts = { aluno: 0, professor: 0, coordenador: 0 };
            const usersArray = users || []; // Garante que é um array
            console.log(">> renderDashboard: Array 'usersArray' para contagem:", usersArray); // LOG: Verifica o array final

            usersArray.forEach((u, index) => {
                console.log(`>> renderDashboard: Verificando utilizador ${index}:`, u); // LOG: Mostra cada utilizador
                // Verifica se 'u' é um objeto válido e se tem a propriedade 'role'
                if (typeof u === 'object' && u !== null && u.hasOwnProperty('role') && counts.hasOwnProperty(u.role)) {
                   counts[u.role] = counts[u.role] + 1;
                   console.log(`>> renderDashboard: Utilizador ${index} contado como ${u.role}. Contagens atuais:`, counts); // LOG: Sucesso na contagem
                } else {
                   console.warn(`>> renderDashboard: Utilizador ${index} inválido ou sem 'role' válida encontrado:`, u); // LOG: Falha na contagem (mostra o objeto problemático)
                }
            });

            console.log(">> renderDashboard: Contagens FINAIS para gráfico:", counts); // LOG contagens finais

            const labels = ['Aluno','Professor','Coordenador'];
            const vals = [counts.aluno||0, counts.professor||0, counts.coordenador||0];
            console.log(">> renderDashboard: Valores para gráfico:", vals); // LOG valores

            const W = ctx.canvas.width, H = ctx.canvas.height;
            // Ajusta padding e largura/gap das barras se necessário
            const pad=30, numBars=3;
            const totalGapWidth = W - 2*pad;
            const barWidth = Math.max(10, Math.floor(totalGapWidth / (numBars * 1.5))); // Calcula largura da barra
            const gap = Math.floor((totalGapWidth - (numBars * barWidth)) / (numBars + 1)); // Calcula gap entre barras

            console.log(">> renderDashboard: Dimensões Canvas (W, H):", W, H, "BarWidth:", barWidth, "Gap:", gap); // LOG dimensões

            const maxVal = Math.max(...vals, 1); // Garante que maxVal é pelo menos 1
            console.log(">> renderDashboard: Valor máximo:", maxVal); // LOG maxVal

            labels.forEach((lb,i)=>{
              // Calcula posição X da barra (considerando gaps)
              const x = pad + gap + i*(barWidth + gap);
              // Calcula altura da barra
              const h = Math.max(0, (H - 2*pad) * (vals[i] / maxVal)); // Garante que h >= 0
              console.log(`>> renderDashboard: Barra ${i} (${lb}): x=${x.toFixed(1)}, h=${h.toFixed(1)}, val=${vals[i]}`); // LOG barra individual

              // Define a cor da barra
              ctx.fillStyle = i===0? '#8ecae6' : i===1? '#90be6d' : '#219ebc';
              // Desenha a barra (a partir da base y=H-pad, subindo por h)
              ctx.fillRect(x, H-pad-h, barWidth, h);

              // Desenha os rótulos e valores
              ctx.fillStyle = '#111'; // Cor do texto
              ctx.textAlign = 'center'; // Centraliza texto horizontalmente
              ctx.fillText(lb, x + barWidth/2, H-pad+14); // Rótulo abaixo da barra, centralizado
              ctx.fillText(vals[i], x + barWidth/2, H-pad-h-6); // Valor acima da barra, centralizado
            });
             console.log(">> renderDashboard: Gráfico desenhado."); // LOG final
        } // Fecha o else para canvasEl
  } catch (err) {
    console.error(">> ERRO em renderDashboard:", err);
  }
  console.log(">> renderDashboard: Renderização finalizada.");
}
