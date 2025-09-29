function byId(id) {
  return document.getElementById(id);
}
function sel(id) {
  return document.getElementById(id);
}
function val(id) {
  return byId(id)?.value?.trim();
}
function cap(s) {
  return s[0].toUpperCase() + s.slice(1);
}
function refreshAllSelects() {
  // auth aluno
  populateLoginSalaSelects();
  // aluno
  fillSelect("a_selSala", LS.get("salas"), state.user?.salaId || "");
  fillSelectWithMaterias("a_selMateria", false, state.user?.salaId);
  fillSelect("a_salaView", LS.get("salas"), state.user?.salaId || "");
  // professor
  fillSelect("p_selSala", LS.get("salas"));
  fillSelectWithMaterias("p_q_materia", true);
  fillSelectWithMaterias("p_c_materia", true);
  // coordenador
  fillSelect("c_m_selSala", LS.get("salas"));
  // Adiciona a chamada para as funções de renderização que atualizam as tabelas
  renderProfsCoord();
  renderAlunosCoord();
  renderSalasCoord();
}
function populateLoginSalaSelects() {
  fillSelect("a_salaSelect", LS.get("salas"));
}
function fillSelect(id, arr, selectedId) {
  const el = sel(id);
  if (!el) return;
  el.innerHTML =
    (arr.length ? "" : "") +
      arr
        .map(
          (o) =>
            `<option value="${o.id}" ${o.id === selectedId ? "selected" : ""}>${
              o.nome
            }</option>`
        )
        .join("") || '<option value="">(sem itens)</option>';
}
function fillSelectWithMaterias(id, onlyOwned = false, salaFilter = null) {
  const el = sel(id);
  if (!el) return;
  let mats = LS.get("materias");
  if (onlyOwned) mats = mats.filter((m) => m.ownerId === state.user.id);
  if (salaFilter) mats = mats.filter((m) => m.salaId === salaFilter);
  el.innerHTML = mats.length
    ? mats
        .map(
          (m) =>
            `<option value="${m.id}">${m.nome} — ${salaNome(m.salaId)}</option>`
        )
        .join("")
    : '<option value="">(sem matérias)</option>';
}
function salaNome(id) {
  return LS.get("salas").find((s) => s.id === id)?.nome || "-";
}