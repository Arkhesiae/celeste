/**
 * Un ajustement d'horaires (MDDA) ne s'applique qu'à la vacation sur laquelle il a été saisi, et jamais ne fait échouer le calcul.
 *
 *   node --test backend/test/hourPatch.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { applyEntries } from '../services/planning/planning.userShifts.js';

const id = () => new mongoose.Types.ObjectId();
const team = { _id: id() };
const shift = (extra) => ({ _id: id(), name: 'J', type: 'work', default: { startTime: '13:00', endTime: '21:00' }, ...extra });
const patchOn = (shiftId) => [{ adjustedTime: { adjustedStart: 1, adjustedEnd: -1 }, shiftData: { shift: shiftId } }];
const resolve = (base, patches) => applyEntries({ shift: base, team: base ? team : null }, [], [], patches).resolvedShift;

test('a patch shifts the hours of its own shift', () => {
  const held = shift();
  const result = resolve(held, patchOn(held._id));
  assert.deepEqual([result.startTime, result.endTime, result.wasPatched], ['14:00', '20:00', true]);
});

test('a patch of another shift changes nothing', () => {
  const result = resolve(shift(), patchOn(id()));
  assert.deepEqual([result.startTime, result.endTime, result.wasPatched], ['13:00', '21:00', undefined]);
});

test('a patch never throws on a day without hours', () => {
  const rest = shift({ type: 'rest', default: { startTime: null, endTime: null } });
  assert.equal(resolve(rest, patchOn(id())).wasPatched, undefined);
  assert.equal(resolve(rest, patchOn(rest._id)).wasPatched, undefined, 'its own shift, turned into a rest day');
  assert.equal(resolve(null, patchOn(id())).wasPatched, undefined);
});
