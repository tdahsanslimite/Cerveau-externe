/**
 * Réception des données envoyées depuis Cerveau Externe (« Transmettre mes données à Valentin »).
 * À coller dans le Google Sheet « Cerveau Externe — données reçues » (compte Google TDAH),
 * menu Extensions › Apps Script, puis déployer en « Application Web » (voir claude/export-coach.md).
 * Chaque envoi ajoute une ligne dans l'onglet « Envois » et t'envoie un e-mail.
 */
const CLE = 'ce-coach-2026'; // même valeur que COACH_INBOX.key dans l'appli (src/coach/model.ts)
const ONGLET = 'Envois';
const ENTETES = ['Reçu le', 'Prénom', 'Téléphone', 'Période (jours)', 'Version appli', 'Données'];

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.key !== CLE) return reponse({ ok: false, erreur: 'clé' });
    const prenom = String(d.prenom || '').slice(0, 80);
    const tel = String(d.telephone || '').slice(0, 30);
    const texte = String(d.texte || '').slice(0, 20000);
    const classeur = SpreadsheetApp.getActiveSpreadsheet();
    let feuille = classeur.getSheetByName(ONGLET);
    if (!feuille) {
      feuille = classeur.insertSheet(ONGLET);
      feuille.appendRow(ENTETES);
      feuille.setFrozenRows(1);
    }
    // L'apostrophe garde le « 0 » du téléphone et empêche une formule.
    feuille.appendRow([new Date(), "'" + prenom, "'" + tel, Number(d.jours) || '', String(d.version || ''), "'" + texte]);
    MailApp.sendEmail(
      Session.getEffectiveUser().getEmail(),
      'Cerveau Externe : données reçues de ' + (prenom || 'quelqu’un'),
      prenom + ' (' + tel + ') vient de te transmettre ses données.\n\n' + texte + '\n\n' + classeur.getUrl()
    );
    return reponse({ ok: true });
  } catch (err) {
    return reponse({ ok: false, erreur: String(err) });
  }
}

function reponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
