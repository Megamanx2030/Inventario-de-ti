/**
 * Inventário de TI — backend gratuito em Google Apps Script.
 *
 * A planilha do Google é o banco de dados. Este script:
 *  - cria a aba "Inventario" com cabeçalho e listas de seleção (Tipo, Status);
 *  - publica o app (index.html) como Web App, se você quiser usar só o Google;
 *  - expõe uma API JSON para o mesmo index.html hospedado na Vercel.
 */

// Opcional: preencha para exigir uma chave de acesso no app. Vazio = sem chave.
const CHAVE_DE_ACESSO = '';

const ABA = 'Inventario';
const TIPOS = ['Notebook', 'Desktop', 'Monitor'];
const STATUS = ['Em Uso', 'Em Estoque', 'Manutenção'];

// Ordem das colunas da planilha. "id" e "atualizadoEm" são controlados pelo script.
const CAMPOS = [
  ['id', 'ID'],
  ['nome', 'Nome da Máquina'],
  ['tipo', 'Tipo'],
  ['serie', 'Número de Série'],
  ['empresa', 'Empresa'],
  ['usuario', 'Usuário'],
  ['setor', 'Setor'],
  ['processador', 'Processador'],
  ['ram', 'Memória RAM'],
  ['armazenamento', 'Armazenamento'],
  ['status', 'Status'],
  ['atualizadoEm', 'Atualizado em'],
];

/** Rode uma vez pelo editor (botão Executar) para montar a planilha. */
function configurar() {
  const aba = obterAba_();
  SpreadsheetApp.getActive().toast('Planilha "' + ABA + '" pronta.');
  return aba.getName();
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Inventário')
    .addItem('Configurar planilha', 'configurar')
    .addToUi();
}

// ---------- Web App ----------

function doGet(e) {
  if (e && e.parameter && e.parameter.acao) {
    return json_(executar_(e.parameter));
  }
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Inventário de TI')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// O front na Vercel envia POST com corpo text/plain (evita preflight de CORS).
function doPost(e) {
  let pedido = {};
  try {
    pedido = JSON.parse(e.postData.contents || '{}');
  } catch (err) {
    return json_({ ok: false, erro: 'JSON inválido' });
  }
  return json_(executar_(pedido));
}

// Chamado pelo index.html quando ele roda dentro do próprio Apps Script.
function api(pedido) {
  return executar_(pedido || {});
}

function executar_(pedido) {
  try {
    if (CHAVE_DE_ACESSO && pedido.chave !== CHAVE_DE_ACESSO) {
      return { ok: false, erro: 'Chave de acesso inválida', precisaChave: true };
    }
    switch (pedido.acao) {
      case 'listar':
        return { ok: true, itens: listar_() };
      case 'salvar':
        return { ok: true, item: salvar_(pedido.item || {}) };
      case 'excluir':
        excluir_(pedido.id);
        return { ok: true };
      default:
        return { ok: false, erro: 'Ação desconhecida: ' + pedido.acao };
    }
  } catch (err) {
    return { ok: false, erro: String(err && err.message ? err.message : err) };
  }
}

// ---------- Dados ----------

function listar_() {
  const aba = obterAba_();
  const ultima = aba.getLastRow();
  if (ultima < 2) return [];
  const valores = aba.getRange(2, 1, ultima - 1, CAMPOS.length).getDisplayValues();

  // Linhas digitadas direto na planilha chegam sem ID: gera um para elas.
  const semId = [];
  valores.forEach(function (linha, i) {
    if (!linha[0] && linha.slice(1).some(function (v) { return v; })) {
      linha[0] = Utilities.getUuid();
      semId.push([i + 2, linha[0]]);
    }
  });
  semId.forEach(function (par) { aba.getRange(par[0], 1).setValue(par[1]); });

  return valores
    .filter(function (linha) { return linha[0]; })
    .map(function (linha) {
      const item = {};
      CAMPOS.forEach(function (c, i) { item[c[0]] = linha[i]; });
      return item;
    });
}

function salvar_(entrada) {
  const item = validar_(entrada);
  const trava = LockService.getScriptLock();
  trava.waitLock(10000);
  try {
    const aba = obterAba_();
    const existentes = listar_();

    if (item.serie) {
      const repetido = existentes.find(function (x) {
        return x.id !== item.id && x.serie.trim().toLowerCase() === item.serie.toLowerCase();
      });
      if (repetido) throw new Error('Número de série já cadastrado em "' + repetido.nome + '"');
    }

    item.atualizadoEm = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
    let linha;
    if (item.id) {
      linha = linhaDoId_(aba, item.id);
      if (!linha) throw new Error('Item não encontrado (pode ter sido excluído)');
    } else {
      item.id = Utilities.getUuid();
      linha = aba.getLastRow() + 1;
    }
    const valores = CAMPOS.map(function (c) { return item[c[0]] || ''; });
    aba.getRange(linha, 1, 1, CAMPOS.length).setNumberFormat('@').setValues([valores]);
    return item;
  } finally {
    trava.releaseLock();
  }
}

function excluir_(id) {
  if (!id) throw new Error('ID não informado');
  const trava = LockService.getScriptLock();
  trava.waitLock(10000);
  try {
    const aba = obterAba_();
    const linha = linhaDoId_(aba, id);
    if (linha) aba.deleteRow(linha);
  } finally {
    trava.releaseLock();
  }
}

function validar_(e) {
  const texto = function (v) { return String(v == null ? '' : v).trim().slice(0, 200); };
  const item = {};
  CAMPOS.forEach(function (c) { item[c[0]] = texto(e[c[0]]); });
  if (!item.nome) throw new Error('Informe o Nome da Máquina');
  if (TIPOS.indexOf(item.tipo) < 0) throw new Error('Tipo inválido');
  if (STATUS.indexOf(item.status) < 0) throw new Error('Status inválido');
  return item;
}

function linhaDoId_(aba, id) {
  const ultima = aba.getLastRow();
  if (ultima < 2) return 0;
  const ids = aba.getRange(2, 1, ultima - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === id) return i + 2;
  }
  return 0;
}

function obterAba_() {
  const planilha = SpreadsheetApp.getActive();
  let aba = planilha.getSheetByName(ABA);
  if (aba) return aba;

  aba = planilha.insertSheet(ABA);
  const cabecalho = CAMPOS.map(function (c) { return c[1]; });
  aba.getRange(1, 1, 1, cabecalho.length)
    .setValues([cabecalho])
    .setFontWeight('bold')
    .setBackground('#1f3a5f')
    .setFontColor('#ffffff');
  aba.setFrozenRows(1);
  aba.hideColumns(1); // ID interno

  const colTipo = CAMPOS.findIndex(function (c) { return c[0] === 'tipo'; }) + 1;
  const colStatus = CAMPOS.findIndex(function (c) { return c[0] === 'status'; }) + 1;
  const linhas = aba.getMaxRows() - 1;
  aba.getRange(2, colTipo, linhas, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(TIPOS, true).setAllowInvalid(false).build());
  aba.getRange(2, colStatus, linhas, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(STATUS, true).setAllowInvalid(false).build());
  aba.autoResizeColumns(2, cabecalho.length - 1);
  return aba;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
