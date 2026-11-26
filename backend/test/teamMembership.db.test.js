/**
 * Fin d'appartenance à une équipe (mutation, changement de centre, centre supprimé) : le planning passé ne change pas, il n'y a plus
 * d'équipe à partir d'aujourd'hui, et la marque « sans équipe » (`teamId: null`) ne casse aucun lecteur des équipes.
 *
 *   node --test backend/test/teamMembership.db.test.js
 *
 * Nécessite un MongoDB local en replica set (TEST_MEMBERSHIP_MONGO_URI, par défaut
 * mongodb://127.0.0.1:27017/celeste_test_membership), supprimé à la fin. Sans MongoDB joignable, les tests sont ignorés.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { Temporal } from '@js-temporal/polyfill';
import Center from '../models/Center.js';
import Team from '../models/Team.js';
import Rotation from '../models/Rotation.js';
import Shift from '../models/Shift.js';
import '../models/Variation.js';
import User from '../models/User.js';
import { Assignment, Modification, HourPatch } from '../models/CalendarEntry.js';
import { endTeamMembership } from '../services/team/team.membership.js';
import { getTeamAtDay } from '../services/team/team.atDay.js';
import { buildTeamSegments, buildTeamTimeline } from '../services/team/team.segments.js';
import { getTeamGrid } from '../services/team/team.grid.js';
import { setTeamCyclePosition } from '../services/team/team.cyclePosition.js';
import { computeUserShifts } from '../services/planning/planning.userShifts.js';
import { getUserCurrentTeam, getUserTeamOccurrences, getUsersGroupedByTeam } from '../services/user/user.teamRead.js';
import { getCenterTeamsTimeline, getUserTeamTimeline } from '../services/user/user.teamTimeline.js';
import { getUsersByCenter } from '../services/user/user.list.js';
import { assignTeamToUser, deleteTeamOccurrence } from '../services/user/user.team.js';
import { assignUserToCenter } from '../services/user/user.account.js';
import { getWorkCheck } from '../services/user/user.workCheck.js';
import { createDemand } from '../services/demand/demand.creation.js';
import { acceptCenterTransfer } from '../services/centerTransfer/centerTransfer.accept.js';
import { deleteCenter } from '../controllers/center.controller.js';
import { todayIn } from '../utils/dates/plainDate.js';

const URI = process.env.TEST_MEMBERSHIP_MONGO_URI || 'mongodb://127.0.0.1:27017/celeste_test_membership';
let available = false;
const today = todayIn('Europe/Paris');
const day = (offset) => today.add({ days: offset }).toString();
const utc = (key) => new Date(`${key}T00:00:00Z`);
const occurrence = (teamId, from, to = null) => ({ teamId, fromDate: utc(from), fromDay: from, toDate: to ? utc(to) : null, toDay: to });

before(async () => {
  if (!/test/i.test(new URL(URI).pathname)) throw new Error(`TEST_MEMBERSHIP_MONGO_URI doit viser une base de test : ${URI}`);
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
/** Un centre avec son tour de service (4 jours de travail) et deux équipes */
const makeCenter = async () => {
  counter += 1;
  const center = await Center.create({ name: `C${counter}`, OACI: 'TEST', type: 'app', timeZone: 'Europe/Paris', cycleAnchorDate: utc(day(-100)), cycleAnchorDay: day(-100) });
  const shifts = [];
  for (const n of [1, 2, 3, 4]) {
    shifts.push(await Shift.create({ name: `C${counter}-J${n}`, order: n, type: 'work', default: { startTime: '07:00', endTime: '15:00', points: 1 } }));
  }
  await Rotation.create({ name: `R${counter}`, centerId: center._id, days: shifts.map((s) => s._id), activationDays: [day(-100)], activationDates: [utc(day(-100))] });
  const teams = [
    await Team.create({ name: '1', center: center._id, cycleOffset: 0, cycleStartDate: utc(day(-100)) }),
    await Team.create({ name: '2', center: center._id, cycleOffset: 1, cycleStartDate: utc(day(-99)) }),
  ];
  return { center, teams, shifts };
};
const makeUser = (centerId, teams, extra = {}) => {
  counter += 1;
  return User.create({ name: 'U', lastName: `L${counter}`, email: `u${counter}@x.fr`, password: 'x'.repeat(20), registrationStatus: 'verified', centerId, teams, ...extra });
};
const PAST = Array.from({ length: 20 }, (_, i) => day(i - 20));
const FUTURE = [0, 1, 7, 30].map(day);
const snapshot = async (userId, keys) => (await computeUserShifts(keys, userId)).map((r) => JSON.stringify({
  date: r.date, type: r.type, presence: r.presence, shift: r.shiftData?.shift?.name ?? null, team: r.shiftData?.team?.name ?? null,
  base: r.baseShift?.name ?? null, start: r.startTime ?? null, end: r.endTime ?? null, worked: r.isWorked, patched: !!r.wasPatched,
}));
const ownerOf = async (userId, key) => getTeamAtDay((await User.findById(userId)).teams, Temporal.PlainDate.from(key))?.teamId?.toString() ?? null;

/** Un agent avec une histoire : équipe permanente, renfort passé, renfort en cours et à venir, équipe permanente à venir, entrées passées */
const withHistory = async () => {
  const a = await makeCenter();
  const [t1, t2] = a.teams;
  const user = await makeUser(a.center._id, [
    occurrence(t1._id, day(-60)), occurrence(t2._id, day(-15), day(-12)), occurrence(t2._id, day(-3), day(5)),
    occurrence(t2._id, day(10), day(12)), occurrence(t2._id, day(20)),
  ]);
  const entry = { userId: user._id, centerId: a.center._id };
  const held = (await computeUserShifts([day(-8)], user._id))[0].shiftData.shift;
  await Modification.create({ ...entry, date: day(-8), subType: 'disp', shiftData: { shift: held._id, team: t1._id } });
  const patched = (await computeUserShifts([day(-7)], user._id))[0].shiftData.shift;
  await HourPatch.create({ ...entry, date: day(-7), adjustedTime: { adjustedStart: 1, adjustedEnd: 1 }, shiftData: { shift: patched._id, team: t1._id } });
  await Assignment.create({ ...entry, date: day(-6), subType: 'training', startTime: '09:00', endTime: '17:00' });
  return { ...a, user };
};

const assertEnded = async (userId, pastBefore, runningTeam) => {
  assert.deepEqual(await snapshot(userId, PAST), pastBefore, 'the past planning is identical');
  for (const r of await computeUserShifts(FUTURE, userId)) {
    assert.equal(r.baseShift, null, `no base shift on ${r.date}`);
    assert.equal(r.isWorked, false);
  }
  const user = await User.findById(userId);
  const marker = user.teams.filter((o) => o.teamId === null);
  assert.equal(marker.length, 1);
  assert.equal(marker[0].fromDay, today.toString());
  assert.ok(user.teams.filter((o) => o.teamId).every((o) => o.fromDay < today.toString()), 'nothing starts today or later');
  assert.ok(user.teams.filter((o) => o.teamId && o.toDay).every((o) => o.toDay < today.toString()), 'no reinforcement runs on');
  assert.equal(await ownerOf(userId, day(-2)), String(runningTeam._id), 'yesterday the running reinforcement was still theirs');
};

test('pure rules: past kept, running reinforcement stopped, later ones removed, one marker, idempotent', () => {
  const [x, y] = ['a'.repeat(24), 'b'.repeat(24)];
  const list = [occurrence(x, day(-60)), occurrence(y, day(-3), day(5)), occurrence(y, day(0), day(2)), occurrence(y, day(20))];
  const once = endTeamMembership(list, day(0));
  assert.deepEqual(once.map((o) => [o.teamId, o.fromDay, o.toDay]), [[x, day(-60), null], [y, day(-3), day(-1)], [null, day(0), null]]);
  assert.equal(list[1].toDay, day(5), 'the input is not modified');
  assert.deepEqual(endTeamMembership(once, day(0)), once);
  assert.deepEqual(endTeamMembership(once, day(3)), once, 'already without a team: no second marker');
  assert.deepEqual(endTeamMembership([], day(0)), []);
  assert.deepEqual(endTeamMembership([occurrence(x, day(4))], day(0)), [], 'never had a team');
  assert.deepEqual(buildTeamSegments(once).map((s) => [s.teamId, s.to]), [[x, day(-4)], [y, day(-1)]], 'no "null" segment');
  assert.ok(buildTeamTimeline(once).every((s) => s.teamId === x || s.teamId === y));
});

test('the schema accepts an explicit null team, not a missing one', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const user = await makeUser(new mongoose.Types.ObjectId(), [occurrence(null, day(0))]);
  assert.equal(user.teams[0].teamId, null);
  await assert.rejects(makeUser(new mongoose.Types.ObjectId(), [{ fromDay: day(0), fromDate: utc(day(0)) }]), { name: 'ValidationError' });
});

test('center transfer: the past is kept and every reader of teams copes with the marker', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const { teams: [t1, t2], user } = await withHistory();
  const b = await makeCenter();
  const pastBefore = await snapshot(user._id, PAST);
  assert.ok(['"patched":true', 'released', 'training'].every((mark) => pastBefore.some((r) => r.includes(mark))), 'the history is there');
  await User.updateOne({ _id: user._id }, { pendingCenterTransfer: { toCenterId: b.center._id, reason: 'x', requestedAt: new Date() } });
  const admin = await makeUser(b.center._id, [], { isAdmin: true, adminType: 'local' });
  const caller = { userId: String(admin._id), adminType: 'local', centerId: String(b.center._id) };

  await acceptCenterTransfer(String(user._id), caller);
  await assertEnded(user._id, pastBefore, t2);

  assert.ok((await getWorkCheck(String(user._id), { from: day(-10), to: day(10) })).days.length > 0);
  await assert.rejects(getUserCurrentTeam(user._id), { status: 404 });
  const occurrences = await getUserTeamOccurrences(user._id);
  assert.equal(occurrences.permanentTeam, null);
  assert.equal(occurrences.temporaryTeam, null);
  assert.deepEqual(occurrences.nextOccurrences, []);
  assert.ok(occurrences.allOccurrences.length && occurrences.allOccurrences.every((o) => o.teamId && o.teamName));
  const grouped = await getUsersGroupedByTeam(String(b.center._id));
  assert.ok(grouped.every((g) => !g.users.length && !g.renforts.length));
  const listed = await getUsersByCenter(String(b.center._id), caller);
  const rows = Array.isArray(listed) ? listed : listed.users;
  assert.equal(rows.find((u) => String(u._id) === String(user._id)).currentTeam ?? null, null);
  const own = await getUserTeamTimeline(String(user._id), {});
  assert.ok(own.teams.length && own.teams.every((g) => g.teamId !== 'null' && g.teamName));
  await getCenterTeamsTimeline(String(b.center._id), {});

  const oldGrid = await getTeamGrid(String(t1._id), day(-10), day(10));
  assert.ok(!JSON.stringify(oldGrid).includes(String(user._id)), 'no longer a member of the old center');
  await getTeamGrid(String(b.teams[0]._id), day(-5), day(5));

  await assert.rejects(
    createDemand(String(user._id), { posterShift: { date: day(3), shift: String(new mongoose.Types.ObjectId()) }, points: 1, type: 'substitution' }),
    (error) => error.status === 400 || error.status === 404,
  );

  await setTeamCyclePosition(String(t1._id), { day: 3, date: day(0), confirmed: true });
});

test('after a transfer: a new team the same day, a later one, and removing it never brings the old team back', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const { teams: [, t2], user } = await withHistory();
  const b = await makeCenter();
  const pastBefore = await snapshot(user._id, PAST);
  await assignUserToCenter(String(user._id), String(b.center._id));
  await assertEnded(user._id, pastBefore, t2);
  const [bTeam, otherTeam] = b.teams;
  const marker = async () => (await User.findById(user._id)).teams.find((o) => o.teamId === null);
  const addedTo = async (teamId) => (await User.findById(user._id)).teams.find((o) => String(o.teamId) === String(teamId));

  await assignTeamToUser(String(user._id), { teamId: String(bTeam._id), fromDate: day(0) }, { confirmed: true });
  assert.equal(await ownerOf(user._id, day(0)), String(bTeam._id));
  assert.equal(await ownerOf(user._id, day(9)), String(bTeam._id));
  assert.ok((await computeUserShifts([day(1)], user._id))[0].baseShift.name.startsWith(b.shifts[0].name.split('-')[0]), "the new center's rotation");
  assert.equal((await getUserCurrentTeam(user._id)).name, bTeam.name);
  assert.equal(String((await getUserTeamOccurrences(user._id)).permanentTeam.teamId), String(bTeam._id));
  const grouped = await getUsersGroupedByTeam(String(b.center._id));
  assert.ok(grouped.find((g) => String(g.teamId) === String(bTeam._id)).users.some((u) => String(u.userId) === String(user._id)));
  assert.deepEqual(await snapshot(user._id, PAST), pastBefore);

  await assert.rejects(deleteTeamOccurrence(String(user._id), String((await marker())._id), { confirmed: true }), { status: 404 });
  await assert.rejects(
    assignTeamToUser(String(user._id), { teamId: String(bTeam._id), fromDate: day(2) }, { confirmed: true, replaceOccurrenceId: String((await marker())._id) }),
    { status: 404 },
  );

  await deleteTeamOccurrence(String(user._id), String((await addedTo(bTeam._id))._id), { confirmed: true });
  for (const key of FUTURE) assert.equal(await ownerOf(user._id, key), null, `no team on ${key}`);

  await assignTeamToUser(String(user._id), { teamId: String(bTeam._id), fromDate: day(4) }, { confirmed: true });
  assert.equal(await ownerOf(user._id, day(3)), null);
  assert.equal(await ownerOf(user._id, day(4)), String(bTeam._id));

  await assignTeamToUser(String(user._id), { teamId: String(otherTeam._id), fromDate: day(0), toDate: day(1) }, { confirmed: true });
  assert.equal(await ownerOf(user._id, day(1)), String(otherTeam._id));
  assert.equal(await ownerOf(user._id, day(2)), null);
  assert.deepEqual(await snapshot(user._id, PAST), pastBefore);
});

test('the approval preview of a change after a transfer works (no "null" team looked up)', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const { user } = await withHistory();
  const b = await makeCenter();
  await assignUserToCenter(String(user._id), String(b.center._id));
  await Assignment.create({ userId: user._id, centerId: b.center._id, date: day(3), subType: 'training', shiftData: { shift: b.shifts[0]._id, team: b.teams[0]._id } });
  const preview = await assignTeamToUser(String(user._id), { teamId: String(b.teams[0]._id), fromDate: day(2) });
  assert.equal(preview.needsApproval, true);
  assert.ok(preview.segments.before.every((s) => s.teamId !== 'null'));
  assert.equal(preview.changes[0].oldTeam, null);
});

test('a new center whose day is behind: a team assigned from its today is not hidden by the marker', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const { teams: [t1], user } = await withHistory();
  const b = await makeCenter();
  // the marker was written with the old center's day, one day ahead of the date the new center assigns from
  await User.updateOne({ _id: user._id }, { centerId: b.center._id, teams: [occurrence(t1._id, day(-60)), occurrence(null, day(1))] });
  await assignTeamToUser(String(user._id), { teamId: String(b.teams[0]._id), fromDate: day(0) }, { confirmed: true });
  for (const key of FUTURE) assert.equal(await ownerOf(user._id, key), String(b.teams[0]._id), key);
  const added = (await User.findById(user._id)).teams.find((o) => String(o.teamId) === String(b.teams[0]._id));
  await deleteTeamOccurrence(String(user._id), String(added._id), { confirmed: true });
  for (const key of FUTURE) assert.equal(await ownerOf(user._id, key), null, key);
});

test('coming back to a former center does not bring the former team back', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const { center: a, teams: [t1], user } = await withHistory();
  const b = await makeCenter();
  const pastBefore = await snapshot(user._id, PAST);
  await assignUserToCenter(String(user._id), String(b.center._id));
  await assignUserToCenter(String(user._id), String(a._id));
  assert.equal((await User.findById(user._id)).teams.filter((o) => o.teamId === null).length, 1);
  const grouped = await getUsersGroupedByTeam(String(a._id));
  assert.ok(!grouped.find((g) => String(g.teamId) === String(t1._id)).users.some((u) => String(u.userId) === String(user._id)));
  assert.equal(await ownerOf(user._id, day(0)), null);
  assert.deepEqual(await snapshot(user._id, PAST), pastBefore);
});

test('assigning the center the user is already in changes nothing', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const { center, user } = await withHistory();
  const teams = JSON.stringify((await User.findById(user._id)).teams);
  await assert.rejects(assignUserToCenter(String(user._id), String(center._id)), { status: 400 });
  assert.equal(JSON.stringify((await User.findById(user._id)).teams), teams);
});

test('deleting a center keeps the past planning of its users', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const { center, teams: [, t2], user } = await withHistory();
  const idle = await makeUser(center._id, []);
  const pastBefore = await snapshot(user._id, PAST);
  let failure;
  await deleteCenter({ params: { id: String(center._id) } }, { json: () => {} }, (error) => (failure = error));
  assert.equal(failure, undefined);
  assert.equal((await User.findById(user._id)).centerId, undefined);
  assert.equal((await User.findById(idle._id)).teams.length, 0);
  await assertEnded(user._id, pastBefore, t2);
});
