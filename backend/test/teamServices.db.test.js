/**
 * Services d'équipe : une équipe supprimée ne se rejoint pas, les déplacements dans le cycle (échange, refus, rien à faire, retour
 * arrière, et seuls ceux qui tiennent encore l'équipe sont touchés), la lecture de la vacation d'une équipe, les équipes affichées au
 * profil et les limites de la grille.
 *
 *   node --test backend/test/teamServices.db.test.js
 *
 * Nécessite un MongoDB local en replica set (TEST_TEAM_SERVICES_MONGO_URI, par défaut
 * mongodb://127.0.0.1:27017/celeste_test_team_services), supprimé à la fin. Sans MongoDB joignable, les tests sont ignorés.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Center from '../models/Center.js';
import Team from '../models/Team.js';
import User from '../models/User.js';
import Rotation from '../models/Rotation.js';
import Shift from '../models/Shift.js';
import '../models/Variation.js';
import { createTeamShiftReader } from '../services/planning/planning.teamShift.js';
import { activationAt, activationTimelineOf, findLatestRotation } from '../services/rotation/rotation.latest.js';
import { Assignment } from '../models/CalendarEntry.js';
import { holdsAnyTeamFrom } from '../services/team/team.segments.js';
import { setTeamCyclePosition } from '../services/team/team.cycle.js';
import { getTeamGrid } from '../services/team/team.grid.js';
import { assignTeamToUser } from '../services/user/user.team.js';
import { createUserService } from '../services/user/user.create.js';
import { getUserTeamOccurrences } from '../services/user/user.teamRead.js';
import { getTeamAtDay } from '../services/team/team.atDay.js';
import { todayIn } from '../utils/dates/plainDate.js';

const URI = process.env.TEST_TEAM_SERVICES_MONGO_URI || 'mongodb://127.0.0.1:27017/celeste_test_team_services';
let available = false;
const today = todayIn('Europe/Paris');
const day = (offset) => today.add({ days: offset }).toString();
const utc = (key) => new Date(`${key}T00:00:00Z`);
const occurrence = (teamId, from, to = null) => ({ teamId, fromDate: utc(day(from)), fromDay: day(from), toDate: to === null ? null : utc(day(to)), toDay: to === null ? null : day(to) });

before(async () => {
  if (!/test/i.test(new URL(URI).pathname)) throw new Error(`TEST_TEAM_SERVICES_MONGO_URI doit viser une base de test : ${URI}`);
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

let counter = 0;
const makeUser = (centerId, label, teams) => {
  counter += 1;
  return User.create({ name: label, lastName: 'T', email: `s${counter}@x.fr`, password: 'x'.repeat(20), registrationStatus: 'verified', centerId, teams });
};
const makeCenter = () => Center.create({ name: `S${(counter += 1)}`, OACI: 'TEST', type: 'app', timeZone: 'Europe/Paris' });

test('holdsAnyTeamFrom: what counts is the team one actually holds, not an occurrence without an end', () => {
  const [a, b] = ['a'.repeat(24), 'b'.repeat(24)];
  const holds = (teams) => holdsAnyTeamFrom(teams, [a], day(0));
  assert.equal(holds([occurrence(a, -60)]), true, 'current member');
  assert.equal(holds([occurrence(b, -60), occurrence(a, 10)]), true, 'future member');
  assert.equal(holds([occurrence(b, -60), occurrence(a, 5, 8)]), true, 'future reinforcement');
  assert.equal(holds([occurrence(a, -60), occurrence(b, -3, 4)]), true, 'back after a reinforcement elsewhere');
  assert.equal(holds([occurrence(a, -60), occurrence(b, -30)]), false, 'replaced by a newer team');
  assert.equal(holds([occurrence(a, -60), occurrence(null, -5)]), false, 'left');
  assert.equal(holds([occurrence(b, -60), occurrence(a, -20, -10)]), false, 'reinforcement over');
  assert.equal(holds([]), false);
});

test('a deleted team cannot be joined, by a team change or at sign-up', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const center = await makeCenter();
  const live = await Team.create({ name: '1', center: center._id });
  const gone = await Team.create({ name: '2', center: center._id, deleted: true });
  const user = await makeUser(center._id, 'u', [occurrence(live._id, -10)]);

  for (const confirmed of [false, true]) {
    await assert.rejects(assignTeamToUser(String(user._id), { teamId: String(gone._id), fromDate: day(1) }, { confirmed }), { status: 404 });
  }
  assert.equal((await User.findById(user._id)).teams.length, 1);

  const signUp = { name: 'N', lastName: 'M', email: 'new@x.fr', password: 'x'.repeat(10), centerId: center._id };
  await assert.rejects(createUserService({ ...signUp, team: String(gone._id), approved: true }), { status: 404 });
  assert.equal(await User.countDocuments({ email: 'new@x.fr' }), 0);
  await createUserService({ ...signUp, team: String(live._id), approved: true });
  assert.equal(await User.countDocuments({ email: 'new@x.fr' }), 1);
});

test('moving a team cleans its current and future members, never its former ones (#72)', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const center = await makeCenter();
  const teams = [];
  for (const name of ['1', '2', '3', '4']) teams.push(await Team.create({ name, center: center._id }));
  const [t1, t2] = teams;
  await setTeamCyclePosition(String(t1._id), { day: 1, date: day(0), confirmed: true });

  const histories = {
    current: [occurrence(t1._id, -60)],
    future: [occurrence(t2._id, -60), occurrence(t1._id, 10)],
    replaced: [occurrence(t1._id, -60), occurrence(t2._id, -30)],
    left: [occurrence(t1._id, -60), occurrence(null, -5)],
  };
  const entries = {};
  for (const [label, history] of Object.entries(histories)) {
    const user = await makeUser(center._id, label, history);
    entries[label] = await Assignment.create({
      userId: user._id, centerId: center._id, date: day(20), subType: 'training',
      shiftData: { shift: new mongoose.Types.ObjectId(), team: t1._id },
    });
  }

  const preview = await setTeamCyclePosition(String(t1._id), { day: 2, date: day(0) });
  assert.equal(preview.needsApproval, true);
  assert.deepEqual(preview.members.map((m) => m.name.split(' ')[0]).sort(), ['current', 'future']);

  const applied = await setTeamCyclePosition(String(t1._id), { day: 2, date: day(0), confirmed: true });
  assert.equal(applied.deactivated, 2);
  const active = {};
  for (const [label, entry] of Object.entries(entries)) active[label] = (await Assignment.findById(entry._id)).active;
  assert.deepEqual(active, { current: false, future: false, replaced: true, left: true });
});

test('the grid refuses an invalid or too long period before building it', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const center = await makeCenter();
  const team = await Team.create({ name: '1', center: center._id });
  const refused = (from, to) => assert.rejects(getTeamGrid(String(team._id), from, to), { status: 400 }, `${from} → ${to}`);
  await refused('2026-02-30', '2026-03-02');
  await refused('2026-03-02', '2026-03-01');
  await refused('nope', '2026-03-01');
  await refused('2026-01-01', '2026-04-04'); // 94 days
  const started = Date.now();
  await refused('0001-01-01', '9999-12-31');
  assert.ok(Date.now() - started < 500, 'refused without listing millions of days');
  assert.equal(Object.keys((await getTeamGrid(String(team._id), '2026-01-01', '2026-04-03')).teamShifts).length, 0); // 93 days, accepted
});

test('the rotation in force: the latest activation on or before the day, the last one of a shared day', () => {
  const [first, second, third] = [
    { name: 'a', activationDays: ['2026-01-01', '2026-03-01'] },
    { name: 'b', activationDays: ['2026-02-01'] },
    { name: 'c', activationDays: ['2026-02-01'] },
  ];
  const timeline = activationTimelineOf([first, second, third]);
  const nameAt = (key) => activationAt(timeline, key)?.rotation.name ?? null;
  assert.deepEqual(['2025-12-31', '2026-01-01', '2026-01-31', '2026-02-01', '2026-02-28', '2026-03-01'].map(nameAt),
    [null, 'a', 'a', 'c', 'c', 'a']);
});

test('the team shift reader serves many days, together and one after the other, and agrees with the active rotation', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const center = await Center.create({ name: 'R', OACI: 'TEST', type: 'app', timeZone: 'Europe/Paris', cycleAnchorDay: '2026-01-01', cycleAnchorDate: new Date('2026-01-01') });
  const shifts = [];
  for (const name of ['J1', 'J2', 'N1', 'N2']) {
    shifts.push((await Shift.create({ name, order: shifts.length + 1, type: 'work', default: { startTime: '07:00', endTime: '15:00', points: 1 } }))._id);
  }
  const rotation = (name, days, from) => Rotation.create({ name, centerId: center._id, days, activationDays: [from], activationDates: [new Date(from)] });
  await rotation('first', shifts.slice(0, 2), '2026-01-01');
  await rotation('second', shifts.slice(2), '2026-01-04');
  await rotation('shared day', shifts.slice(0, 1), '2026-01-04'); // old data: two activations on one day
  const team = { _id: new mongoose.Types.ObjectId(), center: center._id, cycleOffset: 0 };

  const read = createTeamShiftReader();
  const keys = ['2025-12-31', '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05'];
  const names = (results) => results.map((shift) => shift?.name ?? null);
  const expected = [null, 'J1', 'J2', 'J1', 'J1', 'J1'];
  assert.deepEqual(names(await Promise.all(keys.map((key) => read(team, key)))), expected, 'together');
  const oneByOne = [];
  for (const key of keys) oneByOne.push(await read(team, key)); // the cached reads are awaited again
  assert.deepEqual(names(oneByOne), expected, 'one after the other');
  assert.equal((await findLatestRotation(center._id, '2026-01-04')).name, 'shared day', 'the same pick as the planning');
  assert.equal(await read({ ...team, cycleOffset: undefined }, '2026-01-02'), null, 'a team without a position');
  assert.equal(await read({ _id: team._id }, '2026-01-02'), null, 'a team without a center');
});

test('cycle moves: first positions, taken day, swap, nothing to do, and a failed write changes nothing', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const center = await makeCenter();
  const teams = [];
  for (const name of ['1', '2', '3']) teams.push(await Team.create({ name, center: center._id }));
  const [a, b, c] = teams.map((team) => String(team._id));
  const offsets = async () => (await Team.find({ center: center._id }).sort({ name: 1 })).map((team) => team.cycleOffset ?? null);
  const move = (teamId, position, extra = {}) => setTeamCyclePosition(teamId, { day: position, date: day(0), ...extra });

  await move(a, 1);
  assert.equal((await Center.findById(center._id)).cycleAnchorDay, day(0), 'the first position creates the anchor');
  await assert.rejects(move(b, 1), { status: 400, code: 'CYCLE_POSITION_TAKEN' });
  await assert.rejects(move(b, 1, { swap: true }), { status: 400 }, 'nothing to swap with');
  await move(b, 2);
  assert.deepEqual(await offsets(), [0, 2, null]);
  assert.equal((await move(a, 1)).unchanged, true);
  await assert.rejects(move(c, 4), { status: 400 }, 'three teams: three days');

  const member = await makeUser(center._id, 'member', [occurrence(teams[0]._id, -30)]);
  const entry = await Assignment.create({ userId: member._id, centerId: center._id, date: day(5), subType: 'training', shiftData: { shift: new mongoose.Types.ObjectId(), team: teams[0]._id } });

  const realBulkWrite = Team.bulkWrite;
  Team.bulkWrite = async () => { throw new Error('forced failure'); };
  try {
    await assert.rejects(move(a, 2, { swap: true, confirmed: true }), /forced failure/);
  } finally {
    Team.bulkWrite = realBulkWrite;
  }
  assert.deepEqual(await offsets(), [0, 2, null]);
  assert.equal((await Assignment.findById(entry._id)).active, true, 'the cleanup was rolled back with the positions');

  const swapped = await move(a, 2, { swap: true, confirmed: true });
  assert.equal(swapped.swappedWith, '2');
  assert.equal(swapped.deactivated, 1);
  assert.deepEqual(await offsets(), [2, 0, null]);
});

test('the current teams of the profile follow the same rule as the planning', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const center = await makeCenter();
  const [a, b, c] = await Promise.all(['a', 'b', 'c'].map((name) => Team.create({ name, center: center._id })));
  const gone = await Team.create({ name: 'gone', center: center._id, deleted: true });
  const read = async (teams) => {
    const user = await makeUser(center._id, 'card', teams);
    const card = await getUserTeamOccurrences(String(user._id));
    return {
      permanent: card.permanentTeam?.teamName ?? null,
      reinforcement: card.temporaryTeam?.teamName ?? null,
      next: card.nextOccurrences.map((o) => o.teamName),
      all: card.allOccurrences.map((o) => o.teamName),
      planning: getTeamAtDay((await User.findById(user._id)).teams, today)?.teamId.toString() ?? null,
    };
  };

  const simple = await read([occurrence(a._id, -60), occurrence(b._id, -3, 4), occurrence(c._id, 10)]);
  assert.deepEqual([simple.permanent, simple.reinforcement, simple.next, simple.all], ['a', 'b', ['c'], ['a', 'b', 'c']]);

  // two periods of a kind start the same day: the first of the list, as in the planning
  const permanentTie = await read([occurrence(a._id, -60), occurrence(b._id, -5), occurrence(c._id, -5)]);
  assert.equal(permanentTie.permanent, 'b');
  assert.equal(permanentTie.planning, String(b._id));
  assert.deepEqual(permanentTie.all, ['a', 'b', 'c'], 'both stay listed, in order');
  const reinforcementTie = await read([occurrence(a._id, -60), occurrence(b._id, -2, 3), occurrence(c._id, -2, 6)]);
  assert.equal(reinforcementTie.reinforcement, 'b');
  assert.equal(reinforcementTie.planning, String(b._id));

  const left = await read([occurrence(a._id, -60), occurrence(null, -5)]);
  assert.deepEqual([left.permanent, left.all, left.planning], [null, ['a'], null]);
  const back = await read([occurrence(null, -5), occurrence(b._id, -5)]);
  assert.equal(back.permanent, 'b', 'a team starting the day of the marker wins over it');

  // a deleted team is not listed: the previous permanent team is shown (the planning still follows the deleted one, see #71)
  const withDeleted = await read([occurrence(a._id, -60), occurrence(gone._id, -5)]);
  assert.deepEqual([withDeleted.permanent, withDeleted.all], ['a', ['a']]);
});
