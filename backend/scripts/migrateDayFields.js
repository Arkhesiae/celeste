// TEMPORARY(day-fields): script jetable : a supprimer une fois `--check` propre dans tous les environnements et les anciens champs retires.
/**
 * Migration : champs-jours `Date` (minuit UTC)  ->  jumeaux chaîne `YYYY-MM-DD`
 *
 * Ajoute / vérifie, à côté de chaque ancien champ, son jumeau (voir utils/dates/dayFields.js : registre DAY_FIELDS).
 * Les anciens champs ne sont JAMAIS modifiés : ils restent la source de vérité jusqu'à la bascule des lectures, et le
 * retour arrière consiste à retirer les jumeaux (`--rollback`).
 *
 * Sûre par construction :
 *   - par défaut c'est un DRY-RUN : rien n'est écrit, le rapport dit ce qui serait fait ;
 *   - `--apply` exige `--confirm=<nom de la base>` (qui doit être celle à laquelle le script est connecté) ;
 *   - avant d'écrire, une sauvegarde JSON des valeurs actuelles des jumeaux est écrite (scripts/backups/) ;
 *   - une valeur qui n'est pas à minuit UTC pile (elle porte une heure) ou qui n'est pas une date est une ANOMALIE :
 *     le document est ignoré et listé, sauf avec `--truncate` (on garde alors le jour UTC et on perd l'heure) ;
 *   - idempotente : seuls les documents dont le jumeau est absent ou différent sont écrits ; une relance sans
 *     changement ne fait rien ;
 *   - après l'écriture, une passe de vérification relit tout et doit trouver 0 écart (sinon code de sortie 1).
 *
 * Tant que les écritures de l'application n'alimentent pas les deux champs, de nouveaux écarts apparaissent : le
 * script sert aussi de contrôle (`--check`, code de sortie 1 s'il reste quelque chose) et se relance sans risque.
 *
 * Usage (depuis backend/) :
 *   node scripts/migrateDayFields.js                                 dry-run sur tous les champs
 *   node scripts/migrateDayFields.js --only=rotation.activationDays  un seul champ (voir DAY_FIELDS)
 *   node scripts/migrateDayFields.js --check                         contrôle : sortie 1 s'il reste des écarts
 *   node scripts/migrateDayFields.js --apply --confirm=<base>        écrit
 *   node scripts/migrateDayFields.js --apply --confirm=<base> --truncate   accepte les dates avec heure
 *   node scripts/migrateDayFields.js --rollback --apply --confirm=<base>   retire les jumeaux
 * Variable : MONGO_URI (comme le serveur ; .env chargé automatiquement).
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { DAY_FIELDS, toDay } from '../utils/dates/dayFields.js';
import { DAY_MS } from '../utils/dates/constants.js';

dotenv.config();

const args = new Map(process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
}));
const APPLY = args.has('apply');
const ROLLBACK = args.has('rollback');
const CHECK = args.has('check');
const TRUNCATE = args.has('truncate');
const ONLY = args.get('only');
const BATCH = 500;

// ── chemins pointés ───────────────────────────────────────────────────────────
const getPath = (obj, dotted) => dotted.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);

const printable = (v) => (v instanceof Date ? v.toISOString() : String(v));

/**
 * Jour d'une valeur d'ancien champ : { day, withTime } si exploitable, { anomaly } sinon.
 * Une Date devrait être à minuit UTC pile (c'est un jour, pas un instant) : sinon `withTime` est vrai, et le jour UTC
 * n'est écrit que si `--truncate` est passé (ou s'il l'a déjà été : le jumeau porte alors ce jour).
 */
const dayOf = (value) => {
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return { anomaly: 'date invalide' };
        return { day: toDay(value), withTime: value.getTime() % DAY_MS !== 0, shown: value.toISOString() };
    }
    const day = toDay(value);
    return day ? { day, withTime: false } : { anomaly: `pas une date (${printable(value)})` };
};

/** Une valeur avec heure est une anomalie tant que son jumeau ne porte pas déjà le jour UTC, et sans --truncate */
const timeAnomaly = (result, current) => (result.withTime && !TRUNCATE && current !== result.day ? `a une heure (${result.shown})` : null);

// ── analyse : une fonction par type de champ, qui renvoie des opérations d'écriture et des comptes ─────────────────
const newReport = () => ({ scanned: 0, ok: 0, fill: 0, drift: 0, anomalies: [] });

/** scalar : `from` (Date) -> `to` (chaîne) */
function analyseScalar (field, doc, report, ops) {
    const source = getPath(doc, field.from);
    if (source == null) return;                       // rien à convertir (champ absent ou nul)
    report.scanned++;
    const result = dayOf(source);
    const current = getPath(doc, field.to);
    const anomaly = result.anomaly ?? timeAnomaly(result, current);
    if (anomaly) { report.anomalies.push({ id: doc._id, detail: `${field.from} ${anomaly}` }); return; }

    const day = result.day;
    if (current === day) { report.ok++; return; }
    current == null ? report.fill++ : report.drift++;
    ops.push({
        before: { id: doc._id, [field.to]: current ?? null },
        update: { updateOne: { filter: { _id: doc._id }, update: { $set: { [field.to]: day } } } },
    });
}

/** array : `from` (tableau de Date) -> `to` (tableau de chaînes, même ordre) */
function analyseArray (field, doc, report, ops) {
    const source = getPath(doc, field.from);
    if (!Array.isArray(source) || source.length === 0) return;
    report.scanned++;

    const current = getPath(doc, field.to);
    const days = [];
    for (const [i, value] of source.entries()) {
        const result = dayOf(value);
        const anomaly = result.anomaly ?? timeAnomaly(result, Array.isArray(current) ? current[i] : undefined);
        if (anomaly) { report.anomalies.push({ id: doc._id, detail: `${field.from}[${i}] ${anomaly}` }); return; }
        days.push(result.day);
    }

    if (Array.isArray(current) && current.length === days.length && current.every((d, i) => d === days[i])) { report.ok++; return; }
    Array.isArray(current) && current.length ? report.drift++ : report.fill++;
    ops.push({
        before: { id: doc._id, [field.to]: current ?? null },
        update: { updateOne: { filter: { _id: doc._id }, update: { $set: { [field.to]: days } } } },
    });
}

/** subdocs : tableau de sous-documents, un jumeau par paire (`fromDate` -> `fromDay`...) ; une occurrence = une opération */
function analyseSubdocs (field, doc, report, ops) {
    for (const item of doc[field.array] ?? []) {
        report.scanned++;
        const set = {};
        let problem = false;
        let state = 'ok';

        for (const { from, to } of field.pairs) {
            const source = item[from];
            let day = null;                              // une borne absente / nulle (toDate d'une équipe permanente) = jour nul
            if (source != null) {
                const result = dayOf(source);
                const anomaly = result.anomaly ?? timeAnomaly(result, item[to]);
                if (anomaly) { report.anomalies.push({ id: doc._id, detail: `${field.array}[${item._id}].${from} ${anomaly}` }); problem = true; break; }
                day = result.day;
            }
            const current = item[to];
            if (current === day || (current == null && day == null && Object.hasOwn(item, to))) continue;   // déjà bon (null explicite compris)
            set[`${field.array}.$[o].${to}`] = day;
            state = current == null ? (state === 'drift' ? 'drift' : 'fill') : 'drift';
        }
        if (problem) continue;
        if (!Object.keys(set).length) { report.ok++; continue; }

        report[state]++;
        ops.push({
            before: { id: doc._id, occurrence: item._id, ...Object.fromEntries(field.pairs.map(({ to }) => [to, item[to] ?? null])) },
            update: { updateOne: { filter: { _id: doc._id }, update: { $set: set }, arrayFilters: [{ 'o._id': item._id }] } },
        });
    }
}

const ANALYSERS = { scalar: analyseScalar, array: analyseArray, subdocs: analyseSubdocs };

/** Parcourt une collection pour un champ du registre : rapport + liste des opérations à écrire */
async function analyse (db, field) {
    const report = newReport();
    const ops = [];
    const projection = field.type === 'subdocs'
        ? { [field.array]: 1 }
        : { [field.from]: 1, [field.to]: 1 };
    // Sous-documents d'un tableau : on ne lit que les documents qui ont au moins un élément ; le reste : le champ source existe
    const filter = field.type === 'subdocs' ? { [`${field.array}.0`]: { $exists: true } } : { [field.from]: { $ne: null } };

    for await (const doc of db.collection(field.collection).find(filter, { projection })) {
        ANALYSERS[field.type](field, doc, report, ops);
    }
    return { report, ops };
}

// ── rollback : retirer les jumeaux ───────────────────────────────────────────────────────────────────────────────
async function rollback (db, fields) {
    for (const field of fields) {
        const targets = field.type === 'subdocs' ? field.pairs.map((p) => `${field.array}.$[].${p.to}`) : [field.to];
        const filter = field.type === 'subdocs' ? { [`${field.array}.0`]: { $exists: true } } : { [field.to]: { $exists: true } };
        const unset = Object.fromEntries(targets.map((t) => [t, '']));
        if (APPLY) {
            const result = await db.collection(field.collection).updateMany(filter, { $unset: unset });
            console.log(`- ${field.key} : jumeaux retirés de ${result.modifiedCount} document(s)`);
        } else {
            const count = await db.collection(field.collection).countDocuments(filter);
            console.log(`- ${field.key} : retirerait les jumeaux de ${count} document(s) (dry-run)`);
        }
    }
}

// ── affichage ─────────────────────────────────────────────────────────────────────────────────────────────────────
const line = (field, { report }) => {
    const parts = [`${report.scanned} analysé(s)`, `${report.ok} à jour`];
    if (report.fill) parts.push(`${report.fill} à remplir`);
    if (report.drift) parts.push(`${report.drift} écart(s) (jumeau différent de l'ancien champ)`);
    if (report.anomalies.length) parts.push(`${report.anomalies.length} ANOMALIE(S)`);
    console.log(`- ${field.key} (${field.collection}) : ${parts.join(', ')}`);
    for (const a of report.anomalies.slice(0, 5)) console.log(`    ! ${a.id} : ${a.detail}`);
    if (report.anomalies.length > 5) console.log(`    ! ... et ${report.anomalies.length - 5} autre(s)`);
};

const pending = ({ report }) => report.fill + report.drift + report.anomalies.length;

const run = async () => {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI manquant');
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const dbName = db.databaseName;

    const fields = ONLY ? DAY_FIELDS.filter((f) => f.key === ONLY) : DAY_FIELDS;
    if (ONLY && fields.length === 0) throw new Error(`champ inconnu : ${ONLY}. Champs : ${DAY_FIELDS.map((f) => f.key).join(', ')}`);

    const mode = ROLLBACK ? 'ROLLBACK' : CHECK ? 'CHECK' : 'MIGRATION';
    console.log(`${mode} ${APPLY ? '(APPLY)' : "(dry-run : rien n'est écrit)"} - base « ${dbName} », ${fields.length} champ(s)\n`);

    if (APPLY && args.get('confirm') !== dbName) {
        throw new Error(`--apply exige --confirm=${dbName} (la base à laquelle le script est connecté) : rien n'a été écrit`);
    }

    if (ROLLBACK) { await rollback(db, fields); return; }

    const results = [];
    for (const field of fields) results.push({ field, ...(await analyse(db, field)) });
    results.forEach((r) => line(r.field, r));

    const totalOps = results.reduce((n, r) => n + r.ops.length, 0);
    const totalAnomalies = results.reduce((n, r) => n + r.report.anomalies.length, 0);
    console.log(`\n${totalOps} écriture(s) à faire, ${totalAnomalies} anomalie(s).`);

    if (CHECK) { process.exitCode = results.some((r) => pending(r) > 0) ? 1 : 0; return; }
    if (!APPLY) { console.log('Dry-run : relancer avec --apply --confirm=' + dbName + ' pour écrire.'); return; }
    if (totalOps === 0) return;

    // Sauvegarde des valeurs actuelles des jumeaux avant toute écriture
    const backupDir = path.resolve('scripts', 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const backupFile = path.join(backupDir, `day-fields-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(results.filter((r) => r.ops.length).map((r) => ({
        field: r.field.key, collection: r.field.collection, before: r.ops.map((o) => o.before),
    })), null, 2));
    console.log(`Sauvegarde : ${backupFile}`);

    for (const r of results) {
        for (let i = 0; i < r.ops.length; i += BATCH) {
            await db.collection(r.field.collection).bulkWrite(r.ops.slice(i, i + BATCH).map((o) => o.update), { ordered: false });
        }
        if (r.ops.length) console.log(`  écrit : ${r.field.key} (${r.ops.length})`);
    }

    // Vérification : tout relire, il ne doit plus rester d'écart (les anomalies ignorées restent signalées)
    const after = [];
    for (const field of fields) after.push({ field, ...(await analyse(db, field)) });
    const left = after.reduce((n, r) => n + r.report.fill + r.report.drift, 0);
    console.log(`\nVérification : ${left} écart(s) restant(s)${left ? ' !' : ' (ok)'}`);
    if (left) process.exitCode = 1;
};

run()
    .catch((err) => { console.error('Échec :', err.message); process.exitCode = 1; })
    .finally(() => mongoose.disconnect());
