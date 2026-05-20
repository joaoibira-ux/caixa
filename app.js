const firebaseConfig = {
  apiKey: "AIzaSyBaqROPsywPgtKjQU7cs1ke1WaqDFhWwn0",
  authDomain: "sistema-gw-36566.firebaseapp.com",
  projectId: "sistema-gw-36566",
  storageBucket: "sistema-gw-36566.firebasestorage.app",
  messagingSenderId: "472820177992",
  appId: "1:472820177992:web:2e1b98c9f6ac3a823d0c7d"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const col = db.collection("lancamentos");

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

function escHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

let docsCache = {};

function render(docs) {
  const lista = document.getElementById("lista");
  let totalE = 0, totalS = 0, cefE = 0, cefS = 0, interE = 0, interS = 0;
  docsCache = {};

  docs.forEach(doc => {
    docsCache[doc.id] = doc.data();
    const r = doc.data();
    if (r.origem === "ANE->JOAO") {
      // transferência interna: saldo total inalterado, CEF cai, INTER sobe
      cefS   += r.saida || 0;
      interE += r.saida || 0;
    } else {
      totalE += r.entrada || 0;
      totalS += r.saida || 0;
      if (r.origem === "ANE") {
        cefE += r.entrada || 0;
        cefS += r.saida || 0;
      } else if (r.origem === "JOAO") {
        interE += r.entrada || 0;
        interS += r.saida || 0;
      }
    }
  });

  const saldo = totalE - totalS;
  document.getElementById("tot-entrada").textContent = fmtMoeda(totalE);
  document.getElementById("tot-saida").textContent = fmtMoeda(totalS);
  const saldoEl = document.getElementById("tot-saldo");
  saldoEl.textContent = fmtMoeda(saldo);
  saldoEl.className = "value " + (saldo >= 0 ? "saldo-pos" : "saldo-neg");

  const cef = cefE - cefS;
  const cefEl = document.getElementById("tot-cef");
  cefEl.textContent = fmtMoeda(cef);
  cefEl.className = "value " + (cef >= 0 ? "saldo-pos" : "saldo-neg");

  const inter = interE - interS;
  const interEl = document.getElementById("tot-inter");
  interEl.textContent = fmtMoeda(inter);
  interEl.className = "value " + (inter >= 0 ? "saldo-pos" : "saldo-neg");

  if (docs.length === 0) {
    lista.innerHTML = '<p class="empty">Nenhum lançamento ainda.</p>';
    return;
  }

  lista.innerHTML = docs.map(doc => {
    const r = doc.data();
    const isTransf = r.origem === "ANE->JOAO";
    const tipo  = isTransf ? "transferencia" : (r.entrada > 0 ? "entrada" : "saida");
    const valor = isTransf ? r.saida : (r.entrada > 0 ? r.entrada : r.saida);
    const prefix = isTransf ? "⇄" : (tipo === "entrada" ? "+" : "−");
    return `
      <div class="card ${tipo}">
        <button class="btn-del" onclick="deletar('${doc.id}')" title="Excluir">✕</button>
        <div class="card-top">
          <div class="card-desc">${escHtml(r.descricao)}</div>
          <div class="card-valor ${tipo}">${prefix} ${fmtMoeda(valor)}</div>
        </div>
        <div class="card-meta">
          <span>${escHtml(r.data)}</span>
          <span class="badge">${escHtml(r.origem)}</span>
        </div>
      </div>`;
  }).join("");

  lista.lastElementChild.scrollIntoView({ behavior: "smooth", block: "end" });
}

let deletarId = null;

function deletar(id) {
  const r = docsCache[id];
  if (!r) return;
  deletarId = id;

  const isTransf = r.origem === "ANE->JOAO";
  const valor = isTransf ? r.saida : (r.entrada > 0 ? r.entrada : r.saida);
  const tipo  = isTransf ? "Transferência" : (r.entrada > 0 ? "Entrada" : "Saída");

  document.getElementById("modal-detalhe").innerHTML = `
    <div class="detalhe-linha"><span>Data</span><span>${escHtml(r.data)}</span></div>
    <div class="detalhe-linha"><span>Origem</span><span>${escHtml(r.origem)}</span></div>
    <div class="detalhe-linha"><span>Descrição</span><span>${escHtml(r.descricao)}</span></div>
    <div class="detalhe-linha"><span>Tipo</span><span>${tipo}</span></div>
    <div class="detalhe-linha"><span>Valor</span><span>${fmtMoeda(valor)}</span></div>
  `;
  document.getElementById("modal-senha").value = "";
  document.getElementById("modal-erro").textContent = "";
  document.getElementById("modal-del").classList.add("active");
  setTimeout(() => document.getElementById("modal-senha").focus(), 100);
}

function fecharModal() {
  document.getElementById("modal-del").classList.remove("active");
  deletarId = null;
}

function confirmarDelete() {
  const senha = document.getElementById("modal-senha").value;
  if (senha !== "4512") {
    document.getElementById("modal-erro").textContent = "Senha incorreta.";
    document.getElementById("modal-senha").value = "";
    document.getElementById("modal-senha").focus();
    return;
  }
  const r = docsCache[deletarId];
  db.collection("deletados").add({
    ...r,
    idOriginal: deletarId,
    deletadoEm: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => col.doc(deletarId).delete());
  fecharModal();
}

// Escuta em tempo real — atualiza os dois iPhones automaticamente
col.orderBy("criadoEm", "asc").onSnapshot(snapshot => {
  render(snapshot.docs);
}, err => {
  console.error(err);
  document.getElementById("lista").innerHTML =
    '<p class="empty">Erro ao conectar. Verifique sua internet.</p>';
});

document.getElementById("form").addEventListener("submit", function(e) {
  e.preventDefault();
  const data   = document.getElementById("f-data").value.trim();
  const origem = document.getElementById("f-origem").value.trim().toUpperCase();
  const desc   = document.getElementById("f-desc").value.trim();
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

  col.add({ data, origem, descricao: desc, entrada, saida, criadoEm: firebase.firestore.FieldValue.serverTimestamp() });

  document.getElementById("f-desc").value = "";
  document.getElementById("f-entrada").value = "";
  document.getElementById("f-saida").value = "";
  toggleForm();
});

["f-entrada", "f-saida"].forEach(id => {
  document.getElementById(id).addEventListener("blur", function() {
    const v = parseMoeda(this.value);
    if (v > 0) this.value = v.toFixed(2).replace(".", ",");
  });
});

document.getElementById("modal-senha").addEventListener("keydown", function(e) {
  if (e.key === "Enter") confirmarDelete();
});

document.getElementById("btn-cancelar").addEventListener("click", function(e) {
  e.stopPropagation();
  fecharModal();
});

document.getElementById("btn-excluir").addEventListener("click", function(e) {
  e.stopPropagation();
  confirmarDelete();
});

// fechar ao tocar no fundo cinza (fora do modal)
document.getElementById("modal-del").addEventListener("click", function(e) {
  if (e.target === this) fecharModal();
});

// impede que cliques dentro do modal fechem o modal
document.querySelector(".modal").addEventListener("click", function(e) {
  e.stopPropagation();
});

document.getElementById("f-data").value = hoje();

document.getElementById("f-origem").addEventListener("change", function() {
  const desc = document.getElementById("f-desc");
  if (this.value === "ANE->JOAO") {
    desc.value = "Transferência Pix: CEF -> INTER";
  } else if (desc.value === "Transferência Pix: CEF -> INTER") {
    desc.value = "";
  }
});

function toggleForm() {
  const form = document.getElementById("form");
  const fab  = document.getElementById("fab");
  const open = form.style.display === "none" || form.style.display === "";
  form.style.display = open ? "block" : "none";
  fab.classList.toggle("open", open);
  if (open) document.getElementById("f-desc").focus();
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}
