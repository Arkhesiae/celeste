import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertUserActive, hasNoPendingCenterTransfer } from '../middleware/userStatus.js';

// hasNoPendingCenterTransfer ne lit que `req.accountStatus` : on le teste sans base (verifyUserActive et l'application aux routes
// sont couverts par accountStatus.db.test.js, sur de vraies requêtes)
const run = (accountStatus) => {
    let error = null;
    hasNoPendingCenterTransfer({ accountStatus }, {}, (err) => { error = err ?? null; });
    return error;
};

test('un compte actif est accepté, y compris sans le champ (anciens comptes) ; inactif ou introuvable : 403 ACCOUNT_INACTIVE', () => {
    assert.doesNotThrow(() => assertUserActive({ isActive: true }));
    assert.doesNotThrow(() => assertUserActive({}));
    for (const user of [{ isActive: false }, null, undefined]) {
        assert.throws(() => assertUserActive(user), (err) => err.status === 403 && err.code === 'ACCOUNT_INACTIVE');
    }
});

test('sans mutation en attente, la route passe', () => {
    assert.equal(run({ isActive: true, pendingCenterTransfer: null }), null);
    assert.equal(run({ isActive: true }), null);
});

test('mutation en attente : 403 CENTER_TRANSFER_PENDING (jamais 409)', () => {
    const refused = run({ isActive: true, pendingCenterTransfer: { toCenterId: 'abc', requestedAt: new Date() } });
    assert.equal(refused.status, 403);
    assert.equal(refused.code, 'CENTER_TRANSFER_PENDING');
});

test("sans verifyToken devant, le middleware refuse plutôt que de laisser passer", () => {
    assert.equal(run(undefined).status, 500);
});
