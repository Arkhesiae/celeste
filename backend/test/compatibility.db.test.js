/**
 * Calcul de compatibilité des permutations de bout en bout (demandService.getCompatibleSwitches) sur une base jetable.
 *
 *   node --test backend/test/compatibility.db.test.js
 *
 * Nécessite un MongoDB local (TEST_MONGO_URI, par défaut mongodb://127.0.0.1:27017/celeste_test_compat). La base est
 * supprimée à la fin. Sans MongoDB joignable, les tests sont ignorés. Les résultats du service sont comparés à un
 * oracle minute par minute, indépendant du code de production, appliqué au planning réel de l'utilisateur.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Center from '../models/Center.js';
import Team from '../models/Team.js';
import Shift from '../models/Shift.js';
import Rotation from '../models/Rotation.js';
import User from '../models/User.js';
import Variation from '../models/Variation.js';
import { getCompatibleSwitches } from '../services/substitution/substitution.switches.js';
import { generateShiftsMap } from '../services/planning/planning.shiftsMap.js';

const URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/celeste_test_compat';
let available = false;

/** Heure du centre lue comme une Date en UTC (« repère mural ») : l'oracle compte sans fuseau, valable hors changement d'heure */
const wallDate = (date, time, endsNextDay = false) => new Date(Date.parse(`${date}T${time}:00Z`) + (endsNextDay ? 86400000 : 0));
const toOracleEntry = (shift) => ({ date: shift.date, start: wallDate(shift.date, shift.startTime), end: wallDate(shift.date, shift.endTime, shift.endsNextDay) });

const addDays = (key, n) => new Date(Date.parse(`${key}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

before(async () => {
  // La base est supprimée avant et après : on refuse tout nom qui ne contienne pas « test »
  if (!/test/i.test(new URL(URI).pathname)) throw new Error(`TEST_MONGO_URI doit viser une base de test (nom contenant "test") : ${URI}`);
  try {
    await mongoose.connect(URI, { serverSelectionTimeoutMS: 2500 });
    await mongoose.connection.dropDatabase();
    available = true;
  } catch {
    available = false;
  }
});

after(async () => {
  if (available) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

/** Un centre, une équipe, un utilisateur et une rotation active dont les jours sont décrits par `pattern` */
const setup = async (pattern, { tag, anchor = '2026-01-05', timeZone = 'Europe/Paris' }) => {
  const center = await Center.create({
    name: `C-${tag}`, OACI: `T${tag}`.slice(0, 4).toUpperCase(), type: 'app', timeZone,
    cycleAnchorDate: new Date(`${anchor}T00:00:00Z`), cycleAnchorDay: anchor,
  });
  const team = await Team.create({ name: '1', center: center._id, cycleOffset: 0, cycleStartDate: new Date(`${anchor}T00:00:00Z`) });
  const shifts = [];
  for (let i = 0; i < pattern.length; i++) {
    const p = pattern[i];
    shifts.push(await Shift.create(p
      ? { name: p.name, order: i, type: 'work', default: { startTime: p.start, endTime: p.end, endsNextDay: !!p.next, points: 10 } }
      : { name: 'R', order: i, type: 'rest', default: { startTime: null, endTime: null, points: 0 } }));
  }
  const rotation = await Rotation.create({
    name: 'rot', centerId: center._id, days: shifts.map((s) => s._id),
    activationDates: [new Date(`${anchor}T00:00:00Z`)], activationDays: [anchor],
  });
  const user = await User.create({
    name: 'Test', lastName: 'User', email: `u${tag}@example.com`, password: 'x', centerId: center._id,
    teams: [{ teamId: team._id, fromDate: new Date('2025-12-01T00:00:00Z'), fromDay: '2025-12-01', toDate: null, toDay: null }],
  });
  return { center, team, shifts, rotation, user, anchor };
};

/** Oracle : mêmes règles (11h / 35h / 48h sur fenêtres de 7 jours alignées sur minuit UTC), écrites minute par minute */
const oracleOk = (entries, targetDate) => {
  const minutes = (d) => Math.round(d.getTime() / 60000);
  const T0 = Date.parse(`${targetDate}T00:00:00Z`) / 60000;
  const from = T0 - 20 * 1440;
  const span = 45 * 1440;
  const busy = new Uint8Array(span);
  for (const e of entries) {
    for (let m = Math.max(0, minutes(e.start) - from); m < Math.min(span, minutes(e.end) - from); m++) busy[m] = 1;
  }
  const target = entries.find((e) => e.date === targetDate);
  const reasons = [];
  for (const e of entries) {
    if (e === target) continue;
    if (minutes(e.end) > minutes(target.start) - 660 && minutes(e.start) < minutes(target.end) + 660) { reasons.push('insufficientRest'); break; }
  }
  let rest35 = true; let work48 = true;
  for (let i = 0; i < 13; i++) {
    const ws = T0 + (i - 6) * 1440 - from; const we = ws + 7 * 1440;
    let longest = 0; let run = 0; let worked = 0;
    for (let m = ws; m < we; m++) { if (busy[m]) { worked++; run = 0; } else { run++; longest = Math.max(longest, run); } }
    if (longest < 2100) rest35 = false;
    if (worked > 2880) work48 = false;
  }
  if (!rest35) reasons.push('35limit');
  if (!work48) reasons.push('48hLimit');

  // Jours consécutifs et contrôles de nuit (travail entre 00h00 et 06h00), écrits indépendamment du code de production
  const dayKey = (n) => new Date(n * 86400000).toISOString().slice(0, 10);
  const dayNumber = (key) => Date.parse(`${key}T00:00:00Z`) / 86400000;
  const isNight = (e) => {
    for (let m = minutes(e.start); m < minutes(e.end); m++) {
      const minuteOfDay = ((m % 1440) + 1440) % 1440;
      if (minuteOfDay < 360) return true;
    }
    return false;
  };
  const byStart = [...entries].sort((a, b) => a.start - b.start);
  const at = byStart.findIndex((e) => e === target);
  const days = new Set(entries.map((e) => e.date));
  const nights = new Set(entries.filter(isNight).map((e) => e.date));
  const streakLength = (set) => {
    let n = 1;
    for (let d = dayNumber(targetDate) - 1; set.has(dayKey(d)); d--) n++;
    for (let d = dayNumber(targetDate) + 1; set.has(dayKey(d)); d++) n++;
    return n;
  };
  if (streakLength(days) > 5) reasons.push('consecutiveDaysLimit');
  const restAfter = (i) => (i >= 0 && i + 1 < byStart.length ? minutes(byStart[i + 1].start) - minutes(byStart[i].end) : Infinity);
  if ([at - 1, at].some((i) => i >= 0 && isNight(byStart[i]) && restAfter(i) < 720)) reasons.push('nightControlRestLimit');
  if (nights.has(targetDate) && streakLength(nights) > 2) reasons.push('consecutiveNightLimit');
  for (let i = 0; i + 2 < byStart.length; i++) {
    const [a, b] = [byStart[i], byStart[i + 1]];
    if (isNight(a) && isNight(b) && dayNumber(b.date) === dayNumber(a.date) + 1 && at >= i && at <= i + 2 && restAfter(i + 1) < 2880) {
      reasons.push('restAfterTwoNightsLimit');
      break;
    }
  }
  return reasons;
};

const patterns = {
  // 5 jours 07-15 puis 2 repos
  semaine52: [...Array(5).fill({ name: 'M', start: '07:00', end: '15:00' }), null, null],
  // matin, soir, nuit, 3 repos
  matinSoirNuit: [{ name: 'M', start: '06:00', end: '14:00' }, { name: 'S', start: '14:00', end: '22:00' }, { name: 'N', start: '22:00', end: '06:00', next: true }, null, null, null],
  // 4 jours de 10h puis 3 repos
  quatreDix: [...Array(4).fill({ name: 'L', start: '07:00', end: '17:00' }), null, null, null],
  // rotation avec deux horaires différents : le candidat peut être un autre horaire que celui du jour
  mixte: [{ name: 'A', start: '05:00', end: '13:00' }, { name: 'B', start: '13:00', end: '21:00' }, { name: 'C', start: '20:00', end: '04:00', next: true }, { name: 'D', start: '08:00', end: '16:00' }, null, null, null, null],
};

for (const [label, pattern] of Object.entries(patterns)) {
  test(`getCompatibleSwitches (${label}) : concorde avec l'oracle sur chaque jour de la rotation`, async (t) => {
    if (!available) return t.skip('MongoDB indisponible');
    const ctx = await setup(pattern, { tag: label.slice(0, 3) + Math.floor(Math.random() * 90) });
    let compared = 0;
    const mismatches = [];
    for (let n = 14; n < 14 + pattern.length * 2; n++) {
      const date = addDays(ctx.anchor, n);
      const userMap = await generateShiftsMap([new Date(`${date}T00:00:00Z`)], ctx.user._id);
      const result = await getCompatibleSwitches(date, ctx.user._id);
      const workDays = pattern.filter(Boolean).length;
      assert.equal(result.length, workDays, 'une entrée par jour travaillé de la rotation');
      for (const r of result) {
        const day = ctx.shifts.find((s) => s._id.equals(r._id));
        // Informations affichées par le front
        assert.equal(r.name, day.name);
        assert.equal(r.startTime, day.default.startTime);
        assert.equal(r.endTime, day.default.endTime);
        // Oracle : le planning réel de l'utilisateur, avec la vacation candidate à la date demandée
        const entries = [...userMap.values()].filter((e) => e.date !== date).map(toOracleEntry);
        entries.push(toOracleEntry({ date, startTime: day.default.startTime, endTime: day.default.endTime, endsNextDay: day.default.endsNextDay }));
        const expected = oracleOk(entries, date);
        compared++;
        const got = [...r.limit].sort().join(',');
        if (got !== [...expected].sort().join(',')) mismatches.push({ date, candidate: `${day.name} ${day.default.startTime}-${day.default.endTime}`, got, expected: expected.join(',') });
        assert.equal(r.compatible, expected.length === 0);
      }
    }
    assert.ok(compared > 0);
    assert.deepEqual(mismatches, []);
  });
}

test('getCompatibleSwitches : refuse une date absente et un utilisateur sans rotation active', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  await assert.rejects(() => getCompatibleSwitches('', new mongoose.Types.ObjectId()), /Date manquante/);
  const ctx = await setup(patterns.semaine52, { tag: 'nor' + Math.floor(Math.random() * 90) });
  await assert.rejects(() => getCompatibleSwitches('2025-06-01', ctx.user._id), /Tour de service actif non trouvé/);
});

test('getCompatibleSwitches : une rotation à variantes est évaluée sur ses horaires par défaut seulement', { todo: true }, async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  // Un jour avec une variante plus tardive (ex. 07-15 / variante 11-19) : la compatibilité devrait refléter chaque variante
  // (au moins signaler celles qui échouent). Le service ne regarde que `default`.
  const ctx = await setup([{ name: 'M', start: '07:00', end: '15:00' }, null, null], { tag: 'var' + Math.floor(Math.random() * 90) });
  const v = await Variation.create({ name: 'tard', startTime: '23:00', endTime: '07:00', endsNextDay: true, points: 10 });
  await Shift.updateOne({ _id: ctx.shifts[0]._id }, { $set: { variations: [v._id] } });
  const res = await getCompatibleSwitches(addDays(ctx.anchor, 10), ctx.user._id);
  assert.ok(res[0].variations, 'la réponse devrait détailler la compatibilité par variante');
});

test('getCompatibleSwitches : les vacations sont placées dans le fuseau du centre (changement d’heure de printemps)', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  // 28 mars : soir 14:00-22:00 ; 29 mars (passage à l'heure d'été à 02:00) : matin 09:00-17:00 possible
  // anchor + 24 jours = 28 mars, jour 0 de la rotation de 6 jours
  const pattern = [{ name: 'S', start: '14:00', end: '22:00' }, { name: 'M', start: '09:00', end: '17:00' }, null, null, null, null];
  const paris = await setup(pattern, { tag: 'par' + Math.floor(Math.random() * 90), anchor: '2026-03-04', timeZone: 'Europe/Paris' });
  const utc = await setup(pattern, { tag: 'utc' + Math.floor(Math.random() * 90), anchor: '2026-03-04', timeZone: 'UTC' });
  const morningIn = async (ctx) => (await getCompatibleSwitches('2026-03-29', ctx.user._id)).find((r) => r.name === 'M');
  // 22:00 le 28 -> 09:00 le 29 : 11h d'horloge, 10h réelles à Paris (le 29 mars la nuit dure 7h)
  assert.deepEqual((await morningIn(paris)).limit, ['insufficientRest']);
  assert.deepEqual((await morningIn(utc)).limit, []);
});
