/* ========= Utilitários Gerais ========= */

// Helpers de Storage Local
const LS = {
  get(k, def) { 
    try { 
      return JSON.parse(localStorage.getItem(k)) ?? def; 
    } catch(e) { 
      return def; 
    } 
  },
  set(k, v) { 
    localStorage.setItem(k, JSON.stringify(v)); 
  },
  remove(k) {
    localStorage.removeItem(k);
  },
  clear() {
    localStorage.clear();
  }
};

// Helpers de Session Storage
const SS = {
  get(k, def) { 
    try { 
      return JSON.parse(sessionStorage.getItem(k)) ?? def; 
    } catch(e) { 
      return def; 
    } 
  },
  set(k, v) { 
    sessionStorage.setItem(k, JSON.stringify(v)); 
  },
  remove(k) {
    sessionStorage.removeItem(k);
  },
  clear() {
    sessionStorage.clear();
  }
};

// Gerador de ID único
function uid() { 
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36); 
}

// Helpers DOM
function byId(id) {
  return document.getElementById(id);
}

function sel(id) {
  return document.getElementById(id);
}

function val(id) {
  return byId(id)?.value?.trim();
}

function setText(id, text) {
  const el = byId(id);
  if (el) el.textContent = text;
}

function setHTML(id, html) {
  const el = byId(id);
  if (el) el.innerHTML = html;
}

function show(id) {
  const el = byId(id);
  if (el) el.classList.remove('hidden');
}

function hide(id) {
  const el = byId(id);
  if (el) el.classList.add('hidden');
}

function toggle(id) {
  const el = byId(id);
  if (el) el.classList.toggle('hidden');
}

// Utilitários de string
function cap(s) {
  return s && s[0] ? s[0].toUpperCase() + s.slice(1) : s;
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Utilitários de data e hora
function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('pt-BR');
}

function formatTime(time) {
  if (!time) return '';
  return time;
}

function formatDateTime(datetime) {
  if (!datetime) return '';
  return new Date(datetime).toLocaleString('pt-BR');
}

function getCurrentDateTime() {
  return new Date().toLocaleString('pt-BR');
}

function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}

function getCurrentTime() {
  return new Date().toTimeString().split(' ')[0].substring(0, 5);
}

// Utilitários de validação
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function isValidCPF(cpf) {
  if (!cpf) return false;
  const cleaned = cpf.replace(/\D/g, '');
  return cleaned.length === 11 && /^\d+$/.test(cleaned);
}

function isValidRA(ra) {
  return ra && ra.trim().length >= 3;
}

function isValidPassword(password) {
  return password && password.length >= 4;
}

function isValidName(name) {
  return name && name.trim().length >= 2;
}

// Utilitários de formatação
function formatCPF(cpf) {
  if (!cpf) return '';
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function cleanCPF(cpf) {
  return cpf ? cpf.replace(/\D/g, '') : '';
}

// Utilitários de array
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function unique(array) {
  return [...new Set(array)];
}

function groupBy(array, key) {
  return array.reduce((groups, item) => {
    const group = item[key];
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(item);
    return groups;
  }, {});
}

// Utilitários de objeto
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function isEmpty(obj) {
  return obj == null || (typeof obj === 'object' && Object.keys(obj).length === 0);
}

// Utilitários de número
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

function percentage(value, total) {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

// Utilitários de arquivo
function getFileExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}

function getFileType(filename) {
  const ext = getFileExtension(filename);
  const types = {
    pdf: 'PDF',
    doc: 'Word',
    docx: 'Word',
    xls: 'Excel',
    xlsx: 'Excel',
    ppt: 'PowerPoint',
    pptx: 'PowerPoint',
    txt: 'Texto',
    jpg: 'Imagem',
    jpeg: 'Imagem',
    png: 'Imagem',
    gif: 'Imagem',
    mp4: 'Vídeo',
    avi: 'Vídeo',
    mov: 'Vídeo',
    mp3: 'Áudio',
    wav: 'Áudio'
  };
  return types[ext] || 'Arquivo';
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Utilitários de notificação
function showAlert(message, type = 'info') {
  // Para uma implementação simples, usar alert nativo
  alert(message);
  // TODO: Implementar sistema de notificações mais sofisticado
}

function showConfirm(message) {
  return confirm(message);
}

// Utilitários de debug
function log(message, data = null) {
  console.log(`[ESTUDE] ${message}`, data || '');
}

function logError(message, error = null) {
  console.error(`[ESTUDE ERROR] ${message}`, error || '');
}

function logWarning(message, data = null) {
  console.warn(`[ESTUDE WARNING] ${message}`, data || '');
}

// Utilitários de performance
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Utilitários de URL
function createObjectURL(file) {
  return URL.createObjectURL(file);
}

function revokeObjectURL(url) {
  URL.revokeObjectURL(url);
}

// Export para uso em outros arquivos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LS, SS, uid, byId, sel, val, setText, setHTML, show, hide, toggle,
    cap, slugify, formatDate, formatTime, formatDateTime,
    getCurrentDateTime, getCurrentDate, getCurrentTime,
    isValidEmail, isValidCPF, isValidRA, isValidPassword, isValidName,
    formatCPF, cleanCPF, shuffle, unique, groupBy, deepClone, isEmpty,
    randomInt, clamp, percentage, getFileExtension, getFileType, formatFileSize,
    showAlert, showConfirm, log, logError, logWarning, debounce, throttle,
    createObjectURL, revokeObjectURL
  };
}