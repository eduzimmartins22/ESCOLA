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
    const payload = { nome, cpf: cpfLimpo, mat, senha, role: 'aluno', salaId: null };
    await API.createUser(payload);
    ["c_a_nome", "c_a_cpf", "c_a_mat", "c_a_senha"].forEach(
      (id) => (byId(id).value = "")
    );
    alert('Aluno criado!'); // Mostra o alerta
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
    alert('Aluno vinculado à sala com sucesso!');
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
    fillSelectById('c_vincular_aluno', (window.appState.users.alunos || []).map(a => ({ id: a.id, nome: a.nome })));
    fillSelectById('c_vincular_sala', (window.appState.salas || []).map(s => ({ id: s.id, nome: s.nome })));

    const tb = byId('c_tbAlunos');
    tb.innerHTML = '';

    // Garante que temos a lista de alunos antes de tentar desenhar
    const alunosParaRenderizar = window.appState.users.alunos || [];

    if (alunosParaRenderizar.length === 0) {
        tb.innerHTML = '<tr><td colspan="5">Nenhum aluno cadastrado.</td></tr>';
        return;
    }

    alunosParaRenderizar.forEach(a => {
      console.log(`>> renderAlunosCoord: Renderizando aluno ${a.nome}, Sala ID: ${a.sala_id}`); // LOG ADICIONADO

      // Busca o nome da sala na lista JÁ ATUALIZADA em window.appState.salas
      const sala = window.appState.salas.find(s => s.id === a.sala_id); // Guardamos a sala encontrada
      const salaNome = sala ? sala.nome : '-'; // Usamos a sala encontrada para pegar o nome

      console.log(`>> renderAlunosCoord: Sala encontrada para ${a.nome}:`, sala); // LOG ADICIONAL

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${a.nome}</td>
        <td>${a.cpf}</td>
        <td>${a.matricula||'-'}</td>
        <td>${salaNome}</td> 
        <td>
          <button class="btn" style="background:#dc2626; color:white; padding:4px 8px;" onclick="apagarUsuario('${a.id}','aluno')">Apagar</button>
          <button class="btn" style="background:#3b82f6; color:white; padding:4px 8px;" onclick="editarUsuario('${a.id}','aluno')">Editar</button>
        </td>
      `;
      tb.appendChild(tr);
    });
  } catch(err) {
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
  byId('edit_senha').value = ''; // Deixa o campo vazio
  byId('edit_senha').placeholder = 'Digite NOVA senha (se desejar alterar)';
  byId('edit_mat').value = user.matricula || ''; // Usa a propriedade correta 'matricula'
  document.getElementById("app").style.display = "none";
  document.getElementById("c_edit_form").style.display = "block";
}

async function salvarEdicao() {
  try {
    // Lê todos os campos do formulário
    const id = val('edit_id'), 
          role = val('edit_role'), 
          nome = val('edit_nome'), 
          cpf = val('edit_cpf'), 
          senha = val('edit_senha'), // Lê a nova senha (pode ser vazia)
          mat = val('edit_mat');     // Lê a matrícula

    // Validação corrigida: Senha não é mais obrigatória aqui
    if (!nome || !cpf) return alert('Preencha pelo menos nome e CPF.'); 

    const cpfLimpo = cpf.replace(/[^\d]/g,'');
    if (cpfLimpo.length !== 11) return alert('CPF inválido.');

    // Cria o payload inicial com os campos sempre presentes
    const payload = { nome, cpf: cpfLimpo, mat }; 

    // Adiciona a senha ao payload APENAS se o usuário digitou uma nova
    if (senha) { 
      payload.senha = senha;
    }
    
    // Envia para a API (o backend já sabe lidar com a senha opcional)
    await API.updateUser(role === 'aluno' ? 'alunos' : 'professores', id, payload); 

    alert('Dados atualizados com sucesso!');
    cancelarEdicao(); // Volta para a tela anterior
    
    // Busca os dados atualizados do servidor PRIMEIRO
    await refreshAllSelectsAsync(); 

    // AGORA atualiza a tabela na tela com os novos dados
    if (role === 'aluno') renderAlunosCoord(); 
    if (role === 'professor') renderProfsCoord();
  } catch(err) {
    console.error(err);
    alert('Erro ao salvar edição');
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
    console.log(">> renderMateriasCoord: Usando matérias do appState:", materias); // LOG MATÉRIAS

    const tb = byId('c_m_list');
    if (!tb) {
         console.error(">> renderMateriasCoord: Elemento 'c_m_list' não encontrado!");
         return;
    }
    tb.innerHTML = '';

    if (!materias.length) { 
        tb.innerHTML = '<span class="muted">Nenhuma matéria cadastrada.</span>'; 
        console.log(">> renderMateriasCoord: Nenhuma matéria encontrada."); // LOG VAZIO
        return; 
    }

    materias.forEach((m, index) => {
      console.log(`>> renderMateriasCoord: Processando matéria ${index}:`, m); // LOG DENTRO DO LOOP
      const d = document.createElement('div');
      d.className = 'card';

      // --- CORREÇÃO AQUI ---
      // Usa m.sala_id (snake_case) para encontrar a sala
      const sala = (window.appState.salas || []).find(s => s.id === m.sala_id) || {}; 
      const nomeSala = sala.nome || '-';
      console.log(`>> renderMateriasCoord: Matéria ${index} - Sala encontrada:`, sala); // LOG SALA

      d.innerHTML = `<strong>${m.nome}</strong><div class="muted">Sala: ${nomeSala}</div>`;
      tb.appendChild(d);
    });
  } catch(err){ 
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
  try {
    const banners = await API.listBanners();
    window.appState.banners = banners || [];
    const col = byId("c_bannersList");
    col.innerHTML = "";
    if (!window.appState.banners.length) {
      col.innerHTML = '<span class="muted">Nenhum banner cadastrado.</span>';
      return;
    }
    window.appState.banners.slice(-3).forEach((b) => {
      const d = document.createElement("div");
      d.className = "banner-item";
      d.innerHTML = `<div class="banner-head"><h4>${
        b.tit
      }</h4></div><div class="banner-body"><p>${
        b.dicas || ""
      }</p><span class="muted"><b>Data:</b> ${b.data || ""}</span></div>`;
      col.appendChild(d);
    });
  } catch (err) {
    console.error(err);
  }
}

/* Dashboard */
async function renderDashboard() {
  try {
    const logs = await API.listLogs();
    window.appState.logs = logs || [];
    const materias = await API.listMaterias();
    window.appState.materias = materias || [];
    const stats = await API.stats();
    window.appState.stats = stats || { respostas: 0 };
    byId("d1").textContent = (window.appState.logs || []).filter(
      (l) => l.in
    ).length;
    byId("d2").textContent = window.appState.stats.respostas || 0;
    byId("d3").textContent = window.appState.materias.length;
    const tb = byId("c_tbLogs");
    tb.innerHTML = "";
    (window.appState.logs || [])
      .slice(-15)
      .reverse()
      .forEach((l) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${l.user}</td><td>${l.role}</td><td>${
          l.in
        }</td><td>${l.out || "-"}</td>`;
        tb.appendChild(tr);
      });
    // gráfico simples (canvas)
    const ctx = byId("c_chart").getContext("2d");
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const counts = { aluno: 0, professor: 0, coordenador: 0 };
    (window.appState.logs || []).forEach(
      (l) => (counts[l.role] = (counts[l.role] || 0) + 1)
    );
    const labels = ["Aluno", "Professor", "Coordenador"];
    const vals = [
      counts.aluno || 0,
      counts.professor || 0,
      counts.coordenador || 0,
    ];
    const W = ctx.canvas.width,
      H = ctx.canvas.height,
      pad = 30,
      bw = 40,
      gap = 40;
    const max = Math.max(...vals, 1);
    labels.forEach((lb, i) => {
      const x = pad + i * (bw + gap);
      const h = (H - 2 * pad) * (vals[i] / max);
      ctx.fillStyle = i === 0 ? "#8ecae6" : i === 1 ? "#90be6d" : "#219ebc";
      ctx.fillRect(x, H - pad - h, bw, h);
      ctx.fillStyle = "#111";
      ctx.fillText(lb, x, H - pad + 14);
      ctx.fillText(vals[i], x + 12, H - pad - h - 6);
    });
  } catch (err) {
    console.error(err);
  }
}
