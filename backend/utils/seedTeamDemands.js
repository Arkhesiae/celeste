import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Team from '../models/Team.js';
import Center from '../models/Center.js';
import Substitution from '../models/Substitution.js';
import '../models/Variation.js';
import '../models/Shift.js';
import '../models/Rotation.js';
import { createDemand } from '../services/substitution/request.creation.js';
import { computeUserShifts } from './computeUserShifts.js';

dotenv.config({ path: '.env.development' });
dotenv.config();

/** Observateur : voit les demandes des autres équipes */
const EXCLUDED_TEAM = '9';
/** Assez de jours pour atteindre ~200 demandes (1 rempla / agent / jour travail) */
const LOOKAHEAD_DAYS = 90;
const AGENTS_PER_TEAM = [1, 2];
const TARGET_DEMANDS = 200;
const SEED_COMMENT_PREFIX = '[seed]';

const utcMidnight = (date = new Date()) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const addUtcDays = (date, days) => {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
};

/**
 * Remplis le centre LFBB de demandes ouvertes (~TARGET_DEMANDS) pour stress-tester
 * la catégorisation côté agent9-1 (mix compatible / incompatible selon son planning).
 * Équipes 1–12 sauf 9 ; agents 1 et 2 ; une demande par jour de travail (sans variante).
 */
export default async function seedTeamDemands ({
  replacePrevious = true,
  target = TARGET_DEMANDS,
} = {}) {
  const center = await Center.findOne({ OACI: 'LFBB' });
  if (!center) {
    throw new Error('Centre LFBB introuvable — lance d\'abord seed-default-config');
  }

  if (replacePrevious) {
    const del = await Substitution.deleteMany({
      centerId: center._id,
      comment: { $regex: `^\\${SEED_COMMENT_PREFIX}` },
    });
    console.log(`🗑️  ${del.deletedCount} ancienne(s) demande(s) seed supprimée(s)`);
  }

  const teams = await Team.find({
    center: center._id,
    deleted: false,
    name: { $in: Array.from({ length: 12 }, (_, i) => String(i + 1)) },
  }).sort({ order: 1 });

  const created = [];
  const skipped = [];
  const today = utcMidnight();

  // Round-robin par offset de jour pour diversifier dates / types de vac
  outer: for (let offset = 0; offset < LOOKAHEAD_DAYS; offset++) {
    const date = addUtcDays(today, offset);
    const dateStr = date.toISOString().slice(0, 10);

    for (const team of teams) {
      if (team.name === EXCLUDED_TEAM) continue;

      for (const agentN of AGENTS_PER_TEAM) {
        if (created.length >= target) break outer;

        const agent = await User.findOne({
          email: `agent${team.name}-${agentN}@lfbb.com`,
          centerId: center._id,
        });
        if (!agent) {
          skipped.push({ team: team.name, agent: agentN, reason: 'agent introuvable' });
          continue;
        }

        const results = await computeUserShifts(dateStr, agent._id);
        const entry = results[0];
        const shift = entry?.shiftData?.shift;

        if (!shift || shift.type !== 'work' || entry.isOff) continue;
        if (shift.optional) continue;
        if (!shift.name) continue;

        try {
          const demand = await createDemand({
            posterId: agent._id,
            posterShift: {
              date,
              selectedVariation: null,
            },
            comment: SEED_COMMENT_PREFIX, // marqueur technique — pas un commentaire agent
            points: 0,
            acceptedSwitches: [],
            isTrueSwitch: false,
          });

          created.push({
            team: team.name,
            agent: agent.email,
            date: dateStr,
            shift: shift.name,
            demandId: demand._id.toString(),
          });
        } catch (err) {
          const msg = err.message || String(err);
          if (!/demande en attente existe déjà/i.test(msg)) {
            skipped.push({
              team: team.name,
              agent: agent.email,
              shift: shift.name,
              date: dateStr,
              reason: msg,
            });
          }
        }
      }
    }
  }

  const byShift = {};
  for (const c of created) {
    byShift[c.shift] = (byShift[c.shift] || 0) + 1;
  }

  return {
    success: true,
    message: `${created.length} demande(s) créée(s) (cible ${target}), ${skipped.length} ignorée(s)`,
    target,
    createdCount: created.length,
    skippedCount: skipped.length,
    byShift,
    byTeam: Object.fromEntries(
      [...new Set(created.map((c) => c.team))].map((t) => [
        t,
        created.filter((c) => c.team === t).length,
      ])
    ),
    skipped: skipped.slice(0, 30),
  };
}

const TARGET_SWITCHES = 40;
const SWITCH_COMMENT_MARKER = `${SEED_COMMENT_PREFIX} switch`;

/**
 * Demandes de permutation (type switch / hybrid) dont acceptedSwitches
 * contient la vacation de agent9-1 le même jour → canSwitch côté observateur.
 */
export async function seedSwitchDemands ({
  replacePrevious = true,
  target = TARGET_SWITCHES,
  observerEmail = 'agent9-1@lfbb.com',
} = {}) {
  const center = await Center.findOne({ OACI: 'LFBB' });
  if (!center) {
    throw new Error('Centre LFBB introuvable — lance d\'abord seed-default-config');
  }

  const observer = await User.findOne({ email: observerEmail, centerId: center._id });
  if (!observer) {
    throw new Error(`Observateur ${observerEmail} introuvable`);
  }

  if (replacePrevious) {
    const del = await Substitution.deleteMany({
      centerId: center._id,
      comment: { $regex: `^\\${SEED_COMMENT_PREFIX} switch` },
    });
    console.log(`🗑️  ${del.deletedCount} ancienne(s) permutation(s) seed supprimée(s)`);
  }

  const teams = await Team.find({
    center: center._id,
    deleted: false,
    name: { $in: Array.from({ length: 12 }, (_, i) => String(i + 1)) },
  }).sort({ order: 1 });

  const today = utcMidnight();
  const created = [];
  const skipped = [];

  // Jours de travail de l'observateur
  const observerWorkDays = [];
  for (let offset = 0; offset < LOOKAHEAD_DAYS; offset++) {
    const date = addUtcDays(today, offset);
    const dateStr = date.toISOString().slice(0, 10);
    const results = await computeUserShifts(dateStr, observer._id);
    const entry = results[0];
    const shift = entry?.shiftData?.shift;
    if (!shift || shift.type !== 'work' || entry.isOff) continue;
    if (shift.optional) continue;
    observerWorkDays.push({ date, dateStr, shift });
  }

  outer: for (const { date, dateStr, shift: observerShift } of observerWorkDays) {
    for (const team of teams) {
      if (team.name === EXCLUDED_TEAM) continue;
      if (created.length >= target) break outer;

      for (const agentN of AGENTS_PER_TEAM) {
        if (created.length >= target) break outer;

        const agent = await User.findOne({
          email: `agent${team.name}-${agentN}@lfbb.com`,
          centerId: center._id,
        });
        if (!agent) continue;

        const results = await computeUserShifts(dateStr, agent._id);
        const entry = results[0];
        const posterShift = entry?.shiftData?.shift;
        if (!posterShift || posterShift.type !== 'work' || entry.isOff) continue;
        if (posterShift.optional) continue;

        // Alterner switch pur / hybrid (rempla + permutation acceptée)
        const asHybrid = created.length % 3 === 0;

        try {
          const demand = await createDemand({
            posterId: agent._id,
            posterShift: {
              date,
              selectedVariation: null,
            },
            comment: asHybrid ? `${SWITCH_COMMENT_MARKER} hybrid` : SWITCH_COMMENT_MARKER,
            points: 0,
            acceptedSwitches: [
              { shift: observerShift._id, points: 0 },
            ],
            isTrueSwitch: !asHybrid,
          });

          created.push({
            team: team.name,
            agent: agent.email,
            date: dateStr,
            posterShift: posterShift.name,
            acceptedShift: observerShift.name,
            type: demand.type,
            demandId: demand._id.toString(),
          });
        } catch (err) {
          const msg = err.message || String(err);
          // Date déjà prise par un rempla seed → on passe
          if (!/demande en attente existe déjà/i.test(msg)) {
            skipped.push({
              team: team.name,
              agent: agent.email,
              date: dateStr,
              reason: msg,
            });
          }
        }
      }
    }
  }

  return {
    success: true,
    message: `${created.length} permutation(s) créée(s) (cible ${target}) pour ${observerEmail}`,
    target,
    createdCount: created.length,
    skippedCount: skipped.length,
    byType: {
      switch: created.filter((c) => c.type === 'switch').length,
      hybrid: created.filter((c) => c.type === 'hybrid').length,
    },
    sample: created.slice(0, 8),
    skipped: skipped.slice(0, 20),
  };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const mode = process.argv[2];
    const result = mode === 'switches-only'
      ? await seedSwitchDemands()
      : {
          remplas: await seedTeamDemands(),
          switches: await seedSwitchDemands({ replacePrevious: true }),
        };
    console.log(JSON.stringify(result, null, 2));
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
