import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertUserActive, assertNoPendingCenterTransfer, checkUserStatus, ACCOUNT_INACTIVE, CENTER_TRANSFER_PENDING } from '../middleware/userStatus.js';

// Les gardes réutilisent `req.accountStatus` s'il est déjà chargé : on les teste sans base
const run = async (guard, accountStatus) => {
    let error = null;
    await guard({ accountStatus }, {}, (err) => { error = err ?? null; });
    return error;
};

test('un compte actif est accepté, y compris sans le champ (anciens comptes)', () => {
    assert.doesNotThrow(() => assertUserActive({ isActive: true }));
    assert.doesNotThrow(() => assertUserActive({}));
});

test('un compte désactivé ou introuvable est refusé en 403 ACCOUNT_INACTIVE', async () => {
    for (const user of [{ isActive: false }, null]) {
        assert.throws(() => assertUserActive(user), (err) => err.status === 403 && err.code === ACCOUNT_INACTIVE);
        assert.equal((await run(checkUserStatus(), user)).code, ACCOUNT_INACTIVE);
    }
    assert.equal(await run(checkUserStatus(), { isActive: true }), null);
});

test('une mutation en attente est refusée en 403 CENTER_TRANSFER_PENDING (jamais 409), sinon la garde laisse passer', async () => {
    const pending = { isActive: true, pendingCenterTransfer: { toCenterId: 'abc', requestedAt: new Date() } };
    assert.throws(() => assertNoPendingCenterTransfer(pending), (err) => err.status === 403 && err.code === CENTER_TRANSFER_PENDING);
    assert.equal((await run(checkUserStatus({ checkCenterTransfer: true }), pending)).code, CENTER_TRANSFER_PENDING);
    assert.equal(await run(checkUserStatus({ checkCenterTransfer: true }), { isActive: true, pendingCenterTransfer: null }), null);
    assert.equal((await run(checkUserStatus({ checkCenterTransfer: true }), { isActive: false })).code, ACCOUNT_INACTIVE);
});
