import bcrypt from 'bcrypt';
import Center from '../models/Center.js';
import Team from '../models/Team.js';
import User from '../models/User.js';
import Rotation from '../models/Rotation.js';
import Shift from '../models/Shift.js';
import Variation from '../models/Variation.js';
import { createLocalAdmin } from './seedAdmin.js';

const CENTER = {
  name: 'Bordeaux',
  OACI: 'LFBB',
  type: 'crna',
  zone: 'west',
};

const AGENTS_PER_TEAM = 2;
const ROTATION_NAME = 'Densifié Ete';
const TEAM_COUNT = 12;

const endsNextDay = (start, end) => {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return eh * 60 + em <= sh * 60 + sm;
};

const workDay = (name, { start, end, optional = false, variations = [] } = {}) => {
  const defaultStart = start || variations[0]?.start;
  const defaultEnd = end || variations[0]?.end;

  return {
    name,
    type: 'work',
    optional,
    default: {
      startTime: defaultStart,
      endTime: defaultEnd,
      endsNextDay: endsNextDay(defaultStart, defaultEnd),
    },
    variations: variations.map((v) => ({
      name: v.name,
      startTime: v.start,
      endTime: v.end,
      endsNextDay: endsNextDay(v.start, v.end),
    })),
  };
};

const restDay = (name) => ({
  name,
  type: 'rest',
  optional: false,
  default: {
    startTime: null,
    endTime: null,
    endsNextDay: false,
  },
  variations: [],
});

/** Cycle Densifié Été (LFBB) — 12 jours */
const DENSIFIE_ETE_DAYS = [
  workDay('J0', {
    optional: true,
    variations: [
      { name: 'A', start: '08:00', end: '14:30' },
      { name: 'BC', start: '08:00', end: '16:00' },
    ],
  }),
  workDay('J1', { start: '06:15', end: '14:00' }),
  workDay('J2', {
    variations: [
      { name: 'AB', start: '13:00', end: '21:00' },
      { name: 'CD', start: '15:00', end: '23:30' },
    ],
  }),
  workDay('N', { start: '19:15', end: '06:15' }),
  restDay('R1'),
  restDay('R2'),
  restDay('R3'),
  workDay('J3', {
    variations: [
      { name: 'A', start: '06:45', end: '15:00' },
      { name: 'B', start: '07:00', end: '15:00' },
    ],
  }),
  workDay('J4', {
    variations: [
      { name: 'A', start: '10:30', end: '18:30' },
      { name: 'B', start: '11:00', end: '18:30' },
      { name: 'C', start: '11:00', end: '19:30' },
    ],
  }),
  workDay('S', {
    variations: [
      { name: 'A', start: '15:00', end: '23:30' },
      { name: 'B', start: '16:00', end: '00:00' },
      { name: 'C', start: '16:00', end: '00:30' },
    ],
  }),
  restDay('R5'),
  restDay('R6'),
];

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

async function upsertCenter () {
  let center = await Center.findOne({ OACI: CENTER.OACI });
  let created = false;

  if (!center) {
    center = await Center.create({
      name: CENTER.name,
      OACI: CENTER.OACI,
      type: CENTER.type,
      zone: CENTER.zone,
      relatedCenters: [],
    });
    created = true;
  }

  return { center, created };
}

async function ensureTeams (center, activationDate) {
  const existing = await Team.find({ center: center._id, deleted: false });
  const byName = new Map(existing.map((t) => [t.name, t]));
  const teams = [];
  let created = 0;

  for (let i = 1; i <= TEAM_COUNT; i++) {
    const name = String(i);
    // Décalage d'1 jour entre équipes : équipe 1 = J0, équipe 2 = J1, etc.
    const cycleStartDate = addUtcDays(activationDate, -(i - 1));

    let team = byName.get(name);
    if (!team) {
      team = await Team.create({
        name,
        center: center._id,
        order: i,
        cycleStartDate,
        startDate: activationDate,
      });
      created += 1;
    } else if (!team.cycleStartDate) {
      team.cycleStartDate = cycleStartDate;
      await team.save();
    }
    teams.push(team);
  }

  return { teams, created };
}

async function ensureAgents (center, teams) {
  const passwordHash = await bcrypt.hash('user', 10);
  let created = 0;
  let repaired = 0;

  for (const team of teams) {
    // fromDate = début de cycle (pas "aujourd'hui") : sinon J1/J2 avant une N
    // récente sont absents de la map et le contrôle 35h devient un faux compatible.
    const desiredFrom = utcMidnight(
      team.cycleStartDate || team.startDate || addUtcDays(utcMidnight(), -90)
    );

    for (let n = 1; n <= AGENTS_PER_TEAM; n++) {
      const email = `agent${team.name}-${n}@lfbb.com`;
      const existing = await User.findOne({ email });

      if (existing) {
        let changed = false;
        for (const occ of existing.teams || []) {
          if (occ.teamId?.toString() !== team._id.toString()) continue;
          const normalized = occ.fromDate ? utcMidnight(occ.fromDate) : null;
          // Reculer un fromDate trop récent qui tronque l'historique utile aux 35h
          if (!normalized || normalized.getTime() > desiredFrom.getTime()) {
            occ.fromDate = desiredFrom;
            changed = true;
          } else if (new Date(occ.fromDate).getTime() !== normalized.getTime()) {
            occ.fromDate = normalized;
            changed = true;
          }
        }
        if (!existing.centerId) {
          existing.centerId = center._id;
          changed = true;
        }
        if (changed) {
          await existing.save();
          repaired += 1;
        }
        continue;
      }

      await User.create({
        email,
        password: passwordHash,
        name: `Agent${n}`,
        lastName: `Équipe ${team.name}`,
        centerId: center._id,
        teams: [{ teamId: team._id, fromDate: desiredFrom }],
        registrationStatus: 'verified',
        isActive: true,
        points: 10,
      });
      created += 1;
    }
  }

  return { created, repaired };
}

async function createShiftWithVariations (dayDef, order) {
  const isRest = dayDef.type === 'rest';
  const shift = await Shift.create({
    name: dayDef.name,
    order,
    type: dayDef.type,
    optional: Boolean(dayDef.optional),
    default: {
      startTime: dayDef.default.startTime,
      endTime: dayDef.default.endTime,
      points: isRest ? 0 : 10,
      endsNextDay: Boolean(dayDef.default.endsNextDay),
    },
    variations: [],
  });

  for (const variant of dayDef.variations || []) {
    const variation = await Variation.create({
      name: variant.name,
      startTime: variant.startTime,
      endTime: variant.endTime,
      points: 10,
      endsNextDay: Boolean(variant.endsNextDay),
    });
    shift.variations.push(variation._id);
  }

  if (shift.variations.length) {
    await shift.save();
  }

  return shift;
}

async function ensureRotation (center, activationDate) {
  let rotation = await Rotation.findOne({
    centerId: center._id,
    name: ROTATION_NAME,
    deleted: false,
  });

  if (rotation) {
    const dates = [...(rotation.activationDates || [])];
    let changed = false;
    const hasActivation = dates.some(
      (d) => new Date(d).getTime() === activationDate.getTime()
    );
    if (!hasActivation) {
      dates.push(activationDate);
      changed = true;
    }
    if (changed) {
      rotation.activationDates = dates;
      await rotation.save();
    }
    return { rotation, created: false };
  }

  const shiftIds = [];
  for (let i = 0; i < DENSIFIE_ETE_DAYS.length; i++) {
    const shift = await createShiftWithVariations(DENSIFIE_ETE_DAYS[i], i + 1);
    shiftIds.push(shift._id);
  }

  rotation = await Rotation.create({
    name: ROTATION_NAME,
    centerId: center._id,
    days: shiftIds,
    activationDates: [activationDate],
  });

  return { rotation, created: true };
}

/**
 * Seed idempotent : centre LFBB, équipes 1–12, agents, TDS Densifié Ete.
 */
export async function seedDefaultConfig () {
  // Activation antérieure à "aujourd'hui" : sinon findLatestRotation renvoie null
  // pour J1/J2 avant une N du jour, et le 35h devient un faux compatible.
  const activationDate = addUtcDays(utcMidnight(), -60);

  const { center, created: centerCreated } = await upsertCenter();
  const { teams, created: teamsCreated } = await ensureTeams(center, activationDate);
  const { created: agentsCreated, repaired: agentsRepaired } = await ensureAgents(center, teams);
  const { rotation, created: rotationCreated } = await ensureRotation(center, activationDate);

  await createLocalAdmin();

  return {
    success: true,
    message: 'Configuration LFBB créée / mise à jour',
    center: {
      id: center._id,
      name: center.name,
      OACI: center.OACI,
      created: centerCreated,
    },
    teams: { count: teams.length, created: teamsCreated },
    agents: {
      created: agentsCreated,
      repaired: agentsRepaired,
      perTeam: AGENTS_PER_TEAM,
      password: 'user',
      emailPattern: 'agent{équipe}-{n}@lfbb.com',
    },
    rotation: {
      id: rotation._id,
      name: rotation.name,
      days: DENSIFIE_ETE_DAYS.length,
      created: rotationCreated,
      activatedAt: activationDate,
    },
    localAdmin: {
      email: 'admin-lfbb@celeste-app.fr',
      password: 'admin-lfbb',
    },
  };
}

export default seedDefaultConfig;
