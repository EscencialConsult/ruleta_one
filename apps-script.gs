/**
 * RULETA VIRTUAL → BACKEND EN GOOGLE SHEETS (multi-ruleta)
 * -------------------------------------------------------
 * Guarda TODO en un solo archivo de Google Sheets:
 *   - Pestaña "Ruletas" → una fila por ruleta/evento:
 *        id | creado | evento | publicada | participantes | config(JSON)
 *   - Pestaña "Jugadas" → una fila por participante:
 *        evento | fecha | premio | (campos del formulario...) | ruleta_id
 * Valida la contraseña de administrador del lado del servidor.
 *
 * INSTALACIÓN
 * 1. Hoja de cálculo nueva → Extensiones → Apps Script.
 * 2. Pegá TODO este archivo (reemplazando lo anterior).
 * 3. Cambiá ADMIN_PASSWORD por tu contraseña.
 * 4. Guardá.
 * 5. Implementar → Administrar implementaciones → editar (lápiz) →
 *    Versión: NUEVA VERSIÓN → Acceso: Cualquier usuario → Implementar.
 *    (La URL se mantiene. Editar el código NO alcanza: hay que crear versión nueva.)
 */

var ADMIN_PASSWORD = "cambia-esta-clave"; // <-- PONÉ TU CONTRASEÑA AQUÍ

// ---------- Lecturas (GET, vía JSONP) ----------
function doGet(e) {
  var p = e.parameter || {};
  var action = p.action;

  if (action === "ruleta") {          // una ruleta puntual (para los participantes)
    return reply({ ok: true, ruleta: getRuleta(p.id) }, p.callback);
  }
  if (action === "ruletas") {         // todas las ruletas (para el admin)
    if (p.pass !== ADMIN_PASSWORD) return reply({ ok: false, error: "auth" }, p.callback);
    return reply({ ok: true, ruletas: listRuletas() }, p.callback);
  }
  if (action === "login") {
    return reply({ ok: p.pass === ADMIN_PASSWORD }, p.callback);
  }
  return ContentService.createTextOutput("Ruleta Web App activa.");
}

// ---------- Escrituras (POST) ----------
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;

    if (action === "saveRuleta") {
      if (body.pass !== ADMIN_PASSWORD) return reply({ ok: false, error: "auth" });
      saveRuleta(body.config || {});
      return reply({ ok: true });
    }
    if (action === "deleteRuleta") {
      if (body.pass !== ADMIN_PASSWORD) return reply({ ok: false, error: "auth" });
      deleteRuleta(body.id);
      return reply({ ok: true });
    }
    if (action === "play") {
      appendPlay(body.data || {});
      return reply({ ok: true });
    }
    return reply({ ok: false, error: "accion desconocida" });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  }
}

// ---------- Ruletas (pestaña "Ruletas") ----------
function ruletasSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("Ruletas");
  if (!sh) {
    sh = ss.insertSheet("Ruletas");
    sh.getRange(1, 1, 1, 6).setValues([["id", "creado", "evento", "publicada", "participantes", "config"]]);
  }
  return sh;
}

function listRuletas() {
  var sh = ruletasSheet();
  var last = sh.getLastRow();
  if (last < 2) return [];
  var rows = sh.getRange(2, 1, last - 1, 6).getValues();
  var counts = countByRuleta();
  return rows.map(function (r) {
    var cfg = {};
    try { cfg = JSON.parse(r[5] || "{}"); } catch (e) {}
    return { config: cfg, participants: counts[cfg.id] || 0 };
  });
}

function getRuleta(id) {
  var list = listRuletas();
  for (var i = 0; i < list.length; i++) {
    if (list[i].config && list[i].config.id === id) return list[i];
  }
  return null;
}

function saveRuleta(cfg) {
  if (!cfg.id) return;
  var sh = ruletasSheet();
  var last = sh.getLastRow();
  var ids = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map(function (x) { return x[0]; }) : [];
  var idx = ids.indexOf(cfg.id);
  var row = [
    cfg.id,
    cfg.createdAt || new Date().toISOString(),
    cfg.eventName || "",
    !!cfg.published,
    countByRuleta()[cfg.id] || 0,
    JSON.stringify(cfg)
  ];
  if (idx === -1) sh.appendRow(row);
  else sh.getRange(idx + 2, 1, 1, 6).setValues([row]);
}

function deleteRuleta(id) {
  var sh = ruletasSheet();
  var last = sh.getLastRow();
  if (last < 2) return;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues().map(function (x) { return x[0]; });
  var idx = ids.indexOf(id);
  if (idx !== -1) sh.deleteRow(idx + 2);
}

// ---------- Jugadas (pestaña "Jugadas") ----------
function playsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName("Jugadas") || ss.insertSheet("Jugadas");
}

function appendPlay(data) {
  var sheet = playsSheet();
  var lastCol = sheet.getLastColumn();
  var headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  Object.keys(data).forEach(function (key) {
    if (headers.indexOf(key) === -1) headers.push(key);
  });
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  var row = headers.map(function (h) { return data[h] !== undefined ? data[h] : ""; });
  sheet.appendRow(row);
}

// Cuenta participantes por ruleta usando la columna "ruleta_id" de Jugadas.
function countByRuleta() {
  var sh = playsSheet();
  var last = sh.getLastRow(), lastCol = sh.getLastColumn();
  if (last < 2 || lastCol < 1) return {};
  var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  var ci = headers.indexOf("ruleta_id");
  if (ci === -1) return {};
  var vals = sh.getRange(2, ci + 1, last - 1, 1).getValues();
  var m = {};
  vals.forEach(function (v) { var id = v[0]; if (id) m[id] = (m[id] || 0) + 1; });
  return m;
}

// ---------- Respuesta (JSON o JSONP) ----------
function reply(obj, callback) {
  var json = JSON.stringify(obj);
  if (callback) {
    return ContentService.createTextOutput(callback + "(" + json + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
