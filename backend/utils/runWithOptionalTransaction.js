import mongoose from 'mongoose';

let supportsTransactions = null;

const isTransactionUnsupportedError = (err) => {
  const msg = err?.message || '';
  return (
    err?.codeName === 'IllegalOperation' ||
    /Transaction numbers are only allowed|replica set member|mongos/i.test(msg)
  );
};

/**
 * Exécute `work(session)` dans une transaction Mongo si disponible.
 * Sur un Mongo standalone (dev local sans replica set), exécute sans transaction.
 * @template T
 * @param {(session: import('mongoose').ClientSession | null) => Promise<T>} work
 * @returns {Promise<T>}
 */
export async function runWithOptionalTransaction (work) {
  if (supportsTransactions === false) {
    return work(null);
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    supportsTransactions = true;
    return result;
  } catch (err) {
    if (isTransactionUnsupportedError(err)) {
      supportsTransactions = false;
      console.warn('⚠️ MongoDB standalone détecté — transactions désactivées (ok en local)');
      return work(null);
    }
    throw err;
  } finally {
    await session.endSession();
  }
}
