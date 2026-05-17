const STORE_KEY = "caixa_lancamentos";

function load() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
  catch { return []; }
}

function save(data) {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

function fmtMoeda(v) {
  return "R$ " + v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseMoeda(s) {
  const v = parseFloat(s.replace(/[^\d,]/g, "").replace(",", "."));
  return isNaN(v) ? 0 : v;
}

function hoje() {
  const d = new Date();
  return [
    String(d.getDate()).padStart(2, "0"),
    String(d.getMonth() + 1).padStart(2, "0"),
    d.getFullYear()
  ].join("/");
}

function render() {
  const data = load();
  const lista = document.getElementById("lista");
  const totalE = data.reduce((s, r) => s + (r.entrada || 0), 0);
  const totalS = data.reduce((s, r) => s + (r.saida || 0), 0);
  const saldo = totalE - totalS;

  document.getElementById("tot-entrada").textContent = fmtMoeda(totalE);
  document.getElementById("tot-saida").textContent = fmtMoeda(totalS);
  const saldoEl = document.getElementById("tot-saldo");
  saldoEl.textContent = fmtMoeda(saldo);
  saldoEl.className = "value " + (saldo >= 0 ? "saldo-pos" : "saldo-neg");

  if (data.length === 0) {
    lista.innerHTML = '<p class="empty">Nenhum lançamento ainda.</p>';
    return;
  }

  lista.innerHTML = [...data].reverse().map((r, ri) => {
    const idx = data.length - 1 - ri;
    const tipo = r.entrada > 0 ? "entrada" : "saida";
    const valor = r.entrada > 0 ? r.entrada : r.saida;
    return `
      <div class="card ${tipo}">
        <button class="btn-del" onclick="deletar(${idx})" title="Excluir">✕</button>
        <div class="card-top">
          <div class="card-desc">${escHtml(r.descricao)}</div>
          <div class="card-valor ${tipo}">${tipo === "entrada" ? "+" : "−"} ${fmtMoeda(valor)}</div>
        </div>
        <div class="card-meta">
          <span>${escHtml(r.data)}</span>
          <span class="badge">${escHtml(r.origem)}</span>
        </div>
      </div>`;
  }).join("");
}

function escHtml(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function deletar(idx) {
  if (!confirm("Excluir este lançamento?")) return;
  const data = load();
  data.splice(idx, 1);
  save(data);
  render();
}

document.getElementById("form").addEventListener("submit", function(e) {
  e.preventDefault();
  const data  = document.getElementById("f-data").value.trim();
  const origem = document.getElementById("f-origem").value.trim().toUpperCase();
  const desc  = document.getElementById("f-desc").value.trim();
  const entrada = parseMoeda(document.getElementById("f-entrada").value);
  const saida   = parseMoeda(document.getElementById("f-saida").value);

  if (!data || !origem || !desc) {
    alert("Data, Origem e Descrição são obrigatórios.");
    return;
  }
  if (entrada === 0 && saida === 0) {
    alert("Informe ao menos um valor de Entrada ou Saída.");
    return;
  }

  const list = load();
  list.push({ data, origem, descricao: desc, entrada, saida });
  save(list);

  document.getElementById("f-desc").value = "";
  document.getElementById("f-entrada").value = "";
  document.getElementById("f-saida").value = "";
  document.getElementById("f-desc").focus();
  render();
});

// Formato automático de valor (vírgula como separador decimal)
["f-entrada", "f-saida"].forEach(id => {
  document.getElementById(id).addEventListener("blur", function() {
    const v = parseMoeda(this.value);
    if (v > 0) this.value = v.toFixed(2).replace(".", ",");
  });
});

// Init
document.getElementById("f-data").value = hoje();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}

render();
