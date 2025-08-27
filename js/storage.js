const LS = {
  get(k, def) {
    try {
      return JSON.parse(localStorage.getItem(k)) ?? def;
    } catch (e) {
      return def;
    }
  },
  set(k, v) {
    localStorage.setItem(k, JSON.stringify(v));
  },
};
function uid() {
  return Math.random().toString(36).slice(2, 9);
}
