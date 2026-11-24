// Chaque modèle de mail (templates/content) se rend avec ses données d'exemple : MJML ne signale rien, aucune variable
// Handlebars ne reste dans le HTML, le texte libre est échappé, et chaque modèle a au moins un aperçu.
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMail, listTemplates } from '../services/email/email.renderer.js';
import { MAIL_SAMPLES, sampleTemplate } from '../services/email/email.samples.js';

test('every template has a preview sample and every sample points to a template', () => {
  const templates = listTemplates();
  const sampled = new Set(Object.keys(MAIL_SAMPLES).map(sampleTemplate));
  assert.deepEqual([...sampled].sort(), templates);
});

for (const [key, { data }] of Object.entries(MAIL_SAMPLES)) {
  test(`renders ${key}`, () => {
    const errors = [];
    const original = console.error;
    console.error = (...args) => errors.push(args.join(' '));
    let html;
    try {
      html = renderMail(sampleTemplate(key), data);
    } finally {
      console.error = original;
    }
    assert.deepEqual(errors, [], 'MJML reports no error');
    assert.match(html, /^<!doctype html>/i);
    assert.doesNotMatch(html, /\{\{/);
    assert.match(html, /Céleste/);
  });
}

test('free text is escaped and keeps its line breaks', () => {
  const html = renderMail('ticketReply', { ticketId: '1', title: 't', replyContent: '<script>alert(1)</script>\nsuite' });
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;<br>suite/);
});

test('every demand mail links to Celeste', () => {
  const demandMails = ['availableDemand', 'acceptedDemand', 'withdrawal', 'cancelledDemand', 'unacceptedDemand', 'systemCancel', 'replacementReminder', 'administrationRequest'];
  for (const key of Object.keys(MAIL_SAMPLES).filter((k) => demandMails.includes(sampleTemplate(k)))) {
    assert.match(renderMail(sampleTemplate(key), MAIL_SAMPLES[key].data), /<a\s[^>]*href="https:\/\/celeste-app\.fr"/, key);
  }
});

test('points mails say what they should for each recipient and reason', () => {
  const html = (key) => renderMail(sampleTemplate(key), MAIL_SAMPLES[key].data);
  assert.match(html('pointsTransferDemandReceiver'), /\+12/);
  assert.match(html('pointsTransferDemandSender'), /&minus;12/);
  assert.match(html('pointsTransferManualSender'), /Nouveau solde : <strong>0 points/); // un solde nul s'affiche
  assert.match(html('pointsTransferCancelledBalance'), /solde minimum autorisé : -40 points/);
  assert.doesNotMatch(html('pointsTransferCancelledBalance'), /\+12|&minus;12/); // annulé : pas de signe
  assert.match(html('pointsTransferCancelledByUser'), /annulé avant son exécution/);
  assert.match(html('pointsTransferCancelledError'), /erreur technique/);
});

test('demand mails give the contact details of the other person, the phone only when known', () => {
  const html = (key) => renderMail(sampleTemplate(key), MAIL_SAMPLES[key].data);
  for (const key of ['availableDemand', 'acceptedDemand', 'withdrawal', 'cancelledDemand', 'systemCancel', 'systemCancelPoster', 'replacementReminder', 'administrationRequest']) {
    assert.match(html(key), /href="mailto:[^"]+@example\.com"/, key);
  }
  assert.match(html('availableDemand'), /href="tel:06 12 34 56 78"/);
  assert.doesNotMatch(html('withdrawal'), /href="tel:/); // Camille n'a pas de téléphone
  assert.doesNotMatch(renderMail('withdrawal', { accepterName: 'X' }), /mailto:/); // sans adresse : pas de fiche
});
