// api.js
// Helper central para chamadas à API Flask
const API_BASE = window.API_BASE || "/api";

// Função genérica para chamadas
async function apiFetch(url, opts = {}) {
  const headers = opts.headers || {};
  if (!headers["Content-Type"] && !(opts.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const finalOpts = {
    ...opts,
    headers,
  };
  try {
    const res = await fetch(url, finalOpts);
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const err = new Error(data?.error || `HTTP ${res.status}`);
      err.status = res.status;
      err.body = data;
      throw err;
    }
    return data;
  } catch (err) {
    console.error("API error:", err);
    throw err;
  }
}

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
  listUsers: (role) => apiGet(`${API_BASE}/${role}`),
  // ---------- AUTH ----------
  login: (cpf, senha, role) =>
    apiPost(`${API_BASE}/login`, { cpf, senha, role }),

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

  // ---------- LOGS, RANKING, STATS ----------
  listLogs: () => apiGet(`${API_BASE}/logs`),
  listRanking: () => apiGet(`${API_BASE}/ranking`),
  pushRanking: (payload) => apiPost(`${API_BASE}/ranking`, payload),
  stats: () => apiGet(`${API_BASE}/stats`),

  // ---------- GENÉRICOS (podem ser necessários) ----------
  deleteUser: (role, id) =>
    apiFetch(`${API_BASE}/${role}/${id}`, { method: "DELETE" }),
  updateUser: (role, id, payload) =>
    apiFetch(`${API_BASE}/${role}/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteSala: (id) => apiFetch(`${API_BASE}/salas/${id}`, { method: "DELETE" }),
};
