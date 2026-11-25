// Corps d'un changement d'équipe : un identifiant d'équipe mal formé et une fin avant le début sont refusés en 400, avant toute requête.
import test from 'node:test';
import assert from 'node:assert/strict';
import { assignTeamToUser } from '../services/user/user.team.js';

const ID = '0123456789abcdef01234567';
const refused = (body) => assignTeamToUser(ID, body).then(() => 'accepted', (error) => `${error.status} ${error.message}`);

test('a malformed team id is a 400, not a Mongoose cast error', async () => {
  assert.match(await refused({ teamId: 'not-an-id', fromDate: '2026-01-01' }), /^400 /);
});

test('an end before the start is a 400', async () => {
  assert.match(await refused({ teamId: ID, fromDate: '2026-02-01', toDate: '2026-01-01' }), /^400 La date de fin/);
});

test('the required fields are still required', async () => {
  assert.match(await refused({ fromDate: '2026-01-01' }), /^400 teamId and fromDate/);
});
