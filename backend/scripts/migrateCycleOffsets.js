/**
 * Migration : Team.cycleStartDate  ->  Center.cycleAnchorDate + Team.cycleOffset
 *
 * Sûre par construction :
 *   - par défaut c'est un DRY-RUN : rien n'est écrit, le rapport dit ce qui serait fait ;
 *   - `cycleStartDate` n'est jamais modifié ni supprimé : le retour arrière consiste à retirer les nouveaux champs
 *     (`--rollback`), le code relit alors l'ancien champ (voir utils/teamCycle.js) ;
 *   - un centre n'est migré que s'il ne présente aucune anomalie (équipe sans date, nombre d'équipes différent du
 *     nombre de jours de la rotation, dates qui ne sont pas à minuit UTC, offsets en double) ;
 *   - avant d'écrire, l'équivalence est VÉRIFIÉE : pour chaque équipe, l'ancien et le nouveau calcul donnent le même
 *     jour de rotation sur une longue plage de dates, sinon le centre est refusé ;
 *   - avec --apply, une sauvegarde JSON des champs concernés est écrite avant toute écriture ;
 *   - idempotente : un centre déjà migré et cohérent est ignoré.
 *
 * Usage (depuis backend/) :
 *   node scripts/migrateCycleOffsets.js                      dry-run sur tous les centres
 *   node scripts/migrateCycleOffsets.js --center=<id>        un seul centre
 *   node scripts/migrateCycleOffsets.js --apply              écrit (centres sans anomalie uniquement)
 *   node scripts/migrateCycleOffsets.js --rollback [--apply] retire cycleAnchorDate / cycleOffset
 * Variable : MONGO_URI (comme le serveur ; .env chargé automatiquement).
 */
import dotenv from 'dotenv';
import { mod } from '../utils/math.js';
import { daysBetween, toMongoDate, toPlainDate } from '../utils/dates/plainDate.js';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { Temporal } from '@js-temporal/polyfill';
import Center from '../models/Center.js';
import Team from '../models/Team.js';
import '../models/Rotation.js';
import { findLatestRotation } from '../services/planning/findLatestRotation.js';
import { cycleDayIndex } from '../utils/teamCycle.js';

dotenv.config();

const args = new Map(process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
}));
const APPLY = args.has('apply');
const ROLLBACK = args.has('rollback');
const ONLY_CENTER = args.get('center');

// Vérification sur la valeur brute stockée (un instant) : l'heure compte ici, c'est ce qu'on cherche à repérer
const isUtcMidnight = (d) => new Date(d).getTime() % (24 * 60 * 60 * 1000) === 0;
const iso = (d) => toPlainDate(d).toString();

/** Même résultat entre l'ancien calcul (cycleStartDate seul) et le nouveau (ancre + offset) sur une longue plage ? */
const verifyEquivalence = (legacyTeam, migratedTeam, center, total, from) => {
    for (let i = -4 * total; i <= 2 * 366; i++) {
        const date = from.add({ days: i });
        const before = cycleDayIndex({ cycleStartDate: legacyTeam.cycleStartDate }, null, date, total);
        const after = cycleDayIndex(migratedTeam, center, date, total);
        if (before !== after) return { ok: false, date: date.toString(), before, after };
    }
    return { ok: true };
};

/** Analyse un centre ; renvoie { status, anomalies, plan } */
const analyse = async (center) => {
    const teams = await Team.find({ center: center._id, deleted: false }).sort({ order: 1 });
    const anomalies = [];

    const rotation = await findLatestRotation(center._id, new Date());
    const total = rotation?.days?.length ?? 0;
    if (!total) {
        return { status: 'skipped', reason: 'aucune rotation active (longueur du cycle inconnue)', teams, anomalies };
    }
    if (teams.length === 0) return { status: 'skipped', reason: 'aucune équipe', teams, anomalies };

    // Déjà migré et cohérent ?
    const migrated = center.cycleAnchorDate && teams.every((t) => Number.isInteger(t.cycleOffset));
    if (migrated) {
        const bad = teams.filter((t) => t.cycleStartDate
            && cycleDayIndex({ cycleStartDate: t.cycleStartDate }, null, Temporal.Now.plainDateISO('UTC'), total) !== cycleDayIndex(t, center, Temporal.Now.plainDateISO('UTC'), total));
        if (bad.length === 0) return { status: 'already-migrated', teams, anomalies, total };
        anomalies.push(`déjà migré mais ${bad.length} équipe(s) incohérente(s) avec cycleStartDate : ${bad.map((t) => t.name).join(', ')}`);
    }

    const missing = teams.filter((t) => !t.cycleStartDate);
    if (missing.length) anomalies.push(`équipe(s) sans cycleStartDate : ${missing.map((t) => t.name).join(', ')}`);

    if (teams.length !== total) {
        anomalies.push(`${teams.length} équipe(s) pour ${total} jour(s) de rotation (elles devraient être égaux)`);
    }

    const dated = teams.filter((t) => t.cycleStartDate);
    const offMidnight = dated.filter((t) => !isUtcMidnight(t.cycleStartDate));
    if (offMidnight.length) {
        anomalies.push(`cycleStartDate pas à minuit UTC : ${offMidnight.map((t) => `${t.name} (${new Date(t.cycleStartDate).toISOString()})`).join(', ')}`);
    }

    if (anomalies.length) return { status: 'blocked', anomalies, teams, total };

    // Ancre = plus ancien début de cycle ; offset = écart en jours modulo la longueur du cycle
    const anchor = dated.map((t) => toPlainDate(t.cycleStartDate)).reduce((min, d) => (Temporal.PlainDate.compare(d, min) < 0 ? d : min));
    const plan = dated.map((t) => ({ team: t, offset: mod(daysBetween(anchor, t.cycleStartDate), total) }));

    const seen = new Map();
    for (const { team, offset } of plan) {
        if (seen.has(offset)) anomalies.push(`équipes ${seen.get(offset)} et ${team.name} ont le même offset (${offset})`);
        else seen.set(offset, team.name);
    }

    const futureCenter = { cycleAnchorDate: anchor };
    const today = Temporal.Now.plainDateISO('UTC');
    for (const { team, offset } of plan) {
        const check = verifyEquivalence(team, { cycleOffset: offset }, futureCenter, total, today);
        if (!check.ok) {
            anomalies.push(`équivalence non vérifiée pour l'équipe ${team.name} le ${check.date} (${check.before} -> ${check.after})`);
        }
    }

    if (anomalies.length) return { status: 'blocked', anomalies, teams, total };
    return { status: 'ready', anomalies, teams, total, anchor, plan };
};

const run = async () => {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI manquant');
    await mongoose.connect(process.env.MONGO_URI);

    const filter = { deleted: { $ne: true }, ...(ONLY_CENTER ? { _id: ONLY_CENTER } : {}) };
    const centers = await Center.find(filter).sort({ name: 1 });
    console.log(`${ROLLBACK ? 'ROLLBACK' : 'MIGRATION'} ${APPLY ? '(APPLY)' : '(dry-run : rien n\'est écrit)'} - ${centers.length} centre(s)\n`);

    if (ROLLBACK) {
        for (const center of centers) {
            const teams = await Team.countDocuments({ center: center._id, cycleOffset: { $exists: true } });
            console.log(`- ${center.name} : retirer cycleAnchorDate et cycleOffset de ${teams} équipe(s)`);
            if (APPLY) {
                await Team.updateMany({ center: center._id }, { $unset: { cycleOffset: '' } });
                await Center.updateOne({ _id: center._id }, { $unset: { cycleAnchorDate: '' } });
            }
        }
        return;
    }

    const results = [];
    for (const center of centers) results.push({ center, ...(await analyse(center)) });

    for (const r of results) {
        const label = `- ${r.center.name} (${r.center._id})`;
        if (r.status === 'ready') {
            console.log(`${label} : PRÊT - rotation de ${r.total} jours, ancre ${iso(r.anchor)}`);
            for (const { team, offset } of r.plan) console.log(`    équipe ${team.name} : cycleStartDate ${iso(team.cycleStartDate)} -> offset ${offset}`);
        } else if (r.status === 'already-migrated') {
            console.log(`${label} : déjà migré, rien à faire`);
        } else if (r.status === 'skipped') {
            console.log(`${label} : ignoré - ${r.reason}`);
        } else {
            console.log(`${label} : BLOQUÉ`);
            r.anomalies.forEach((a) => console.log(`    ! ${a}`));
        }
    }

    const ready = results.filter((r) => r.status === 'ready');
    console.log(`\n${ready.length} centre(s) prêt(s), ${results.filter((r) => r.status === 'blocked').length} bloqué(s), `
        + `${results.filter((r) => r.status === 'already-migrated').length} déjà migré(s), `
        + `${results.filter((r) => r.status === 'skipped').length} ignoré(s).`);

    if (!APPLY) {
        console.log('Dry-run : relancer avec --apply pour écrire.');
        return;
    }
    if (ready.length === 0) return;

    // Sauvegarde avant toute écriture
    const backupDir = path.resolve('scripts', 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const backupFile = path.join(backupDir, `cycle-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(ready.map((r) => ({
        centerId: r.center._id,
        cycleAnchorDate: r.center.cycleAnchorDate ?? null,
        teams: r.teams.map((t) => ({ teamId: t._id, cycleStartDate: t.cycleStartDate ?? null, cycleOffset: t.cycleOffset ?? null })),
    })), null, 2));
    console.log(`Sauvegarde : ${backupFile}`);

    for (const r of ready) {
        // Équipes d'abord, ancre ensuite : tant que l'ancre est absente, la lecture reste sur cycleStartDate
        await Team.bulkWrite(r.plan.map(({ team, offset }) => ({
            updateOne: { filter: { _id: team._id }, update: { $set: { cycleOffset: offset } } },
        })));
        await Center.updateOne({ _id: r.center._id }, { $set: { cycleAnchorDate: toMongoDate(r.anchor) } });
        console.log(`  migré : ${r.center.name}`);
    }
};

run()
    .catch((err) => { console.error('Échec :', err.message); process.exitCode = 1; })
    .finally(() => mongoose.disconnect());
