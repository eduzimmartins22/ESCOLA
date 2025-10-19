// static/js/api.js
// Helper central para chamadas à API Flask

// Define a base da sua API (HTTPS e domínio)
const API_BASE = 'https://quizescola.comm.seg.br/api';

// Função genérica para chamadas
async function apiFetch(path, options = {}) { // Recebe o 'path' relativo (ex: '/login')
  // Constrói a URL completa usando a constante API_BASE
  // Garante que não haja barras duplas e que o path comece com / se não começar
  const urlPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE}${urlPath}`;
  console.log(`>> apiFetch: Chamando ${options.method || 'GET'} ${url}`); // LOG: Mostra qual URL está a ser chamada

  try {
    // Configurações padrão para a requisição
    const opts = {
      headers: {},
      ...options,
    };

    // Define Content-Type como JSON automaticamente se não for FormData e se houver um corpo na requisição
    if (!(opts.body instanceof FormData) && opts.body) {
      opts.headers["Content-Type"] = "application/json";
    }

    // Faz a chamada à API
    const response = await fetch(url, opts);
    console.log(`>> apiFetch: Resposta recebida para ${url}. Status: ${response.status}`); // LOG: Mostra o status da resposta

    // Lê a resposta como texto primeiro
    const text = await response.text();
    console.log(`>> apiFetch: Texto recebido de ${url}:`, text.substring(0, 200)); // LOG: Mostra o início do texto da resposta

    // Verifica se a resposta NÃO foi bem-sucedida (status diferente de 2xx)
    if (!response.ok) {
      console.error(`❌ API error: ${response.status} ${response.statusText} para ${url}`); // Adiciona URL ao erro
      console.error("Resposta completa do servidor (texto):", text); // LOG: Mostra o texto completo em caso de erro

      let errorBody = null;
      try { errorBody = JSON.parse(text); } catch(e) {}

      // Rejeita a Promise com um objeto de erro estruturado
      return Promise.reject({ status: response.status, body: errorBody || { message: text } });
    }

    // Se a resposta foi OK (status 2xx), tenta analisar como JSON
    try {
      // Se a resposta estiver vazia (ex: DELETE bem-sucedido), retorna um objeto vazio
      if (!text) {
          console.log(`>> apiFetch: Resposta vazia (OK) para ${url}.`);
          return {};
      }
      const jsonData = JSON.parse(text);
      console.log(`>> apiFetch: JSON parseado com sucesso para ${url}.`); // LOG: Confirma que o JSON é válido
      return jsonData; // Retorna os dados JSON
    } catch (e) {
      console.error(`⚠️ Resposta OK (${response.status}), mas não é JSON válido para ${url}:`, text.substring(0, 100)); // LOG: Indica que a resposta não era JSON
      // Rejeita a Promise indicando que a resposta do servidor foi inválida
      return Promise.reject({ status: response.status, body: { message: "Resposta inválida do servidor (não JSON)" } });
    }

  } catch (error) { // Captura erros de rede ou outros erros inesperados
    console.error(`💥 Falha na conexão ou processamento da API para ${url}:`, error); // LOG: Mostra o erro de rede/conexão
    // Rejeita a Promise com um erro genérico de rede/conexão
    return Promise.reject({ status: 0, body: { message: `Falha de rede ou conexão: ${error.message || error}` } });
  }
}

// Funções simplificadas GET / POST que usam apiFetch com o path relativo
async function apiGet(path) {
  return apiFetch(path, { method: "GET" }); // Passa apenas o path
}

async function apiPost(path, body) {
  return apiFetch(path, { // Passa apenas o path
    method: "POST",
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
}

// ---------------- API ----------------
// Define as funções específicas da API, passando apenas o PATH relativo
const API = {
  // ---------- AUTH ----------
  login: (cpf, senha, role) =>
    apiPost(`/login`, { cpf, senha, role }), // CORRIGIDO

  // ---------- USERS ----------
  listUsers: (role) => apiGet(`/users/${role}`), // CORRIGIDO
  createUser: (payload) => apiPost(`/users`, payload), // CORRIGIDO

  // ---------- SALAS ----------
  listSalas: () => apiGet(`/salas`), // CORRIGIDO
  createSala: (payload) => apiPost(`/salas`, payload), // CORRIGIDO

  // ---------- MATERIAS ----------
  listMaterias: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiGet(`/materias${qs ? "?" + qs : ""}`); // CORRIGIDO
  },
  createMateria: (payload) => apiPost('/materias', payload), // CORRIGIDO

  // ---------- PERGUNTAS ----------
  listPerguntas: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiGet(`/perguntas${qs ? "?" + qs : ""}`); // CORRIGIDO
  },
  createPergunta: (payload) => apiPost(`/perguntas`, payload), // CORRIGIDO

  // ---------- CONTEÚDOS ----------
  listConteudos: (materiaId) =>
    apiGet(`/conteudos?materia_id=${materiaId}`), // CORRIGIDO

  uploadConteudo: (materiaId, file) => {
    const formData = new FormData();
    formData.append("materia_id", materiaId);
    formData.append("file", file);
    return apiPost(`/conteudos`, formData); // CORRIGIDO
  },

  // ---------- BANNERS ----------
  listBanners: () => apiGet(`/banners`), // CORRIGIDO
  createBanner: (formData) => apiPost(`/banners`, formData), // CORRIGIDO

  // ---------- LOGS / RANKING / STATS ----------
  listLogs: () => apiGet(`/logs`), // CORRIGIDO
  listRanking: () => apiGet(`/ranking`), // CORRIGIDO
  pushRanking: (payload) => apiPost(`/ranking`, payload), // CORRIGIDO
  stats: () => apiGet(`/stats`), // CORRIGIDO

  // ---------- GENÉRICOS (DELETE, PUT usam apiFetch diretamente com o path) ----------
  deleteUser: (role, id) =>
    apiFetch(`/users/${role}/${id}`, { method: "DELETE" }), // CORRIGIDO
  updateUser: (role, id, payload) =>
    apiFetch(`/users/${role}/${id}`, { // CORRIGIDO
      method: "PUT",
      body: JSON.stringify(payload)
      // Header Content-Type é adicionado automaticamente por apiFetch
    }),
  deleteSala: (id) => apiFetch(`/salas/${id}`, { method: "DELETE" }), // CORRIGIDO
  updateSala: (id, payload) =>
    apiFetch(`/salas/${id}`, { // CORRIGIDO
      method: "PUT",
      body: JSON.stringify(payload)
    }),
};

// Disponibiliza o objeto API globalmente (se necessário por outros scripts)
window.API = API;