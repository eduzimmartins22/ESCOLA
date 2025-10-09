// api.js
// Helper central para chamadas à API Flask
const API_BASE = 'http://54.210.61.239:5000/api';

// Função genérica para chamadas
async function apiFetch(url, options = {}) {
  try {
    // Configurações padrão
    const opts = {
      headers: {},
      ...options,
    };

    // Define Content-Type automático se não for FormData
    if (!(opts.body instanceof FormData)) {
      opts.headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, opts);

    if (!response.ok) {
      console.error(`❌ API error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error("Resposta do servidor:", text.substring(0, 150));
      return null;
    }

    const text = await response.text();

    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("⚠️ Resposta não é JSON válida:", text.substring(0, 100));
      return null;
    }

  } catch (error) {
    console.error("💥 Falha ao conectar com API:", error);
    return null;
  }
}

// Funções simplificadas GET / POST
async function apiGet(path) {
  return apiFetch(path, { method: "GET" });
}

async function apiPost(path, body) {
  return apiFetch(path, {
    method: "POST",
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
}

// ---------------- API ----------------
const API = {
  // ---------- AUTH ----------
  login: (cpf, senha, role) =>
    apiPost(`${API_BASE}/login`, { cpf, senha, role }),

  // ---------- USERS ----------
  // Exemplo: API.listUsers("aluno")
  listUsers: (role) => apiGet(`${API_BASE}/users/${role}`),
  createUser: (payload) => apiPost(`${API_BASE}/users`, payload),

  // ---------- SALAS ----------
  listSalas: () => apiGet(`${API_BASE}/salas`),
  createSala: (payload) => apiPost(`${API_BASE}/salas`, payload),

  // ---------- MATERIAS ----------
  listMaterias: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiGet(`${API_BASE}/materias${qs ? "?" + qs : ""}`);
  },
  createMateria: (payload) => apiPost(`${API_BASE}/materias`, payload),

  // ---------- PERGUNTAS ----------
  listPerguntas: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiGet(`${API_BASE}/perguntas${qs ? "?" + qs : ""}`);
  },
  createPergunta: (payload) => apiPost(`${API_BASE}/perguntas`, payload),

  // ---------- CONTEÚDOS ----------
  listConteudos: (materiaId) =>
    apiGet(`${API_BASE}/conteudos?materia_id=${materiaId}`),

  uploadConteudo: (materiaId, file) => {
    const formData = new FormData();
    formData.append("materia_id", materiaId);
    formData.append("file", file);
    return apiPost(`${API_BASE}/conteudos`, formData);
  },

  // ---------- BANNERS ----------
  listBanners: () => apiGet(`${API_BASE}/banners`),
  createBanner: (formData) => apiPost(`${API_BASE}/banners`, formData),

  // ---------- LOGS / RANKING / STATS ----------
  listLogs: () => apiGet(`${API_BASE}/logs`),
  listRanking: () => apiGet(`${API_BASE}/ranking`),
  pushRanking: (payload) => apiPost(`${API_BASE}/ranking`, payload),
  stats: () => apiGet(`${API_BASE}/stats`),

  // ---------- GENÉRICOS ----------
  deleteUser: (role, id) =>
    apiFetch(`${API_BASE}/users/${role}/${id}`, { method: "DELETE" }),
  updateUser: (role, id, payload) =>
    apiFetch(`${API_BASE}/users/${role}/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    }),
  deleteSala: (id) => apiFetch(`${API_BASE}/salas/${id}`, { method: "DELETE" }),
};


