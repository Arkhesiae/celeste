// Les mails d'un transfert de points : qui les reçoit, quel modèle, quelle raison (fonction pure, sans base ni envoi).
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPointTransferMails } from '../services/email/email.pointTransfer.js';

const user = (name, extra = {}) => ({ name, lastName: 'Test', email: `${name.toLowerCase()}@example.com`, isActive: true, points: 10, ...extra });
const base = () => ({ sender: user('Alex'), receiver: user('Camille'), amount: 12, effectiveDate: new Date('2026-11-26T00:00:00Z'), description: '' });
const demand = { type: 'substitution', posterShift: { day: '2026-11-26', date: new Date('2026-11-26T00:00:00Z'), shift: { name: 'Matin' } } };

test('a transfer settled for a demand mails both people, credit and debit', () => {
  const mails = buildPointTransferMails({ ...base(), request: 'demandId' }, { event: 'completed', demand });
  assert.deepEqual(mails.map((m) => m.to), ['camille@example.com', 'alex@example.com']);
  assert.match(mails[0].subject, /Points reçus : \+12/);
  assert.match(mails[1].subject, /Points débités : −12/);
  assert.match(mails[0].html, /Remplacement/);
});

test('a manual transfer mails the receiver only', () => {
  const mails = buildPointTransferMails({ ...base(), description: 'Merci' }, { event: 'completed' });
  assert.deepEqual(mails.map((m) => m.to), ['camille@example.com']);
  assert.match(mails[0].html, /Merci/);
});

test('a cancelled transfer mails both people with the reason', () => {
  const mails = buildPointTransferMails(base(), { event: 'cancelled', reason: 'insufficientBalance' });
  assert.equal(mails.length, 2);
  assert.match(mails[0].html, /solde minimum autorisé : -40 points/);
  assert.match(mails[1].html, /Votre solde ne permettait pas/);
  assert.match(mails[0].text, /minimum autorisé/);
});

test('unknown reason reads as a technical error', () => {
  const [mail] = buildPointTransferMails(base(), { event: 'cancelled', reason: 'error' });
  assert.match(mail.html, /erreur technique/);
});

test('people without an address, inactive or unsubscribed get nothing', () => {
  const transaction = { ...base(), request: 'demandId', sender: user('Alex', { email: '' }), receiver: user('Camille', { preferences: { emails: { all: false } } }) };
  assert.deepEqual(buildPointTransferMails(transaction, { event: 'completed', demand }), []);
  const inactive = { ...base(), request: 'demandId', sender: user('Alex', { isActive: false }) };
  assert.deepEqual(buildPointTransferMails(inactive, { event: 'completed', demand }).map((m) => m.to), ['camille@example.com']);
  const noPoints = { ...base(), request: 'demandId', receiver: user('Camille', { preferences: { emails: { all: true, categories: { points: false } } } }) };
  assert.deepEqual(buildPointTransferMails(noPoints, { event: 'completed', demand }).map((m) => m.to), ['alex@example.com']);
});
