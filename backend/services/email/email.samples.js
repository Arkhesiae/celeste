import { OTP_VALIDITY_MINUTES, PASSWORD_RESET_VALIDITY_HOURS } from '../../config/auth.js';
import { MIN_POINTS_BALANCE } from '../../config/points.js';

// Données d'exemple de chaque mail, pour la page d'aperçu (`/preview`) et pour le test qui rend tous les modèles.
// Une clé par aperçu ; `template` nomme le fichier de `templates/content` quand il diffère de la clé (deux variantes d'un
// même mail), `label` est le nom affiché dans la navigation et `group` la rubrique où il est rangé.
const alex = { name: 'Alex MARTIN', email: 'alex.martin@example.com', phone: '06 12 34 56 78' };
const camille = { name: 'Camille DUPONT', email: 'camille.dupont@example.com', phone: null };

const demand = {
  demandDate: 'jeudi 26 novembre',
  typeText: 'Remplacement',
  demandType: 'substitution',
  shift: 'Matin',
  startTime: '06:30',
  endTime: '14:30',
  teamName: 'Équipe B',
  points: 12,
  comment: '',
  acceptedSwitches: [],
};

export const MAIL_SAMPLES = {
  otp: { label: 'Code de vérification', group: 'Compte', data: { otpCode: '482913', validityMinutes: OTP_VALIDITY_MINUTES } },
  resetPassword: {
    label: 'Mot de passe oublié',
    group: 'Compte',
    data: { userName: 'Camille', resetLink: 'https://celeste-app.fr/reset-password?token=exemple', validityHours: PASSWORD_RESET_VALIDITY_HOURS },
  },
  userApproval: { label: 'Inscription approuvée', group: 'Compte', data: { userName: 'Camille' } },
  userRejection: { label: 'Inscription rejetée', group: 'Compte', data: { userName: 'Camille' } },
  rotationChange: {
    label: 'Changement de tour de service',
    group: 'Planning',
    data: {
      userName: 'Camille',
      centerName: 'Paris CRNA',
      rotationName: 'Tour de service hiver 2026',
      activationDate: '1er décembre 2026',
      previousRotationName: 'Tour de service automne 2026',
      daysCount: 8,
      demandsAffected: true,
    },
  },
  centerTransferAccepted: {
    label: 'Mutation acceptée',
    group: 'Compte',
    data: { userName: 'Camille', centerName: 'Marseille ACC', previousCenterName: 'Paris CRNA' },
  },
  accountDeactivated: {
    label: 'Compte désactivé',
    group: 'Compte',
    data: { userName: 'Camille', centerName: 'Paris CRNA' },
  },
  ticketReceived: {
    label: 'Ticket reçu (accusé de réception)',
    group: 'Support',
    data: { userName: 'Camille', ticketId: '1c2a9f', title: 'Je ne vois pas mes demandes', typeLabel: 'Assistance', creationDate: '24/11/2026' },
  },
  pointsTransferDemandReceiver: {
    template: 'pointsTransferDemand',
    label: 'Points : demande acceptée (reçus)',
    group: 'Points',
    data: { userName: 'Camille', role: 'receiver', amount: 12, counterpartName: 'Alex M.', date: '27 novembre 2026', demandDate: 'jeudi 26 novembre', shift: 'Matin', typeText: 'Remplacement', balance: 38 },
  },
  pointsTransferDemandSender: {
    template: 'pointsTransferDemand',
    label: 'Points : demande acceptée (débités)',
    group: 'Points',
    data: { userName: 'Alex', role: 'sender', amount: 12, counterpartName: 'Camille D.', date: '27 novembre 2026', demandDate: 'jeudi 26 novembre', shift: 'Matin', typeText: 'Remplacement', balance: -4 },
  },
  pointsTransferManualReceiver: {
    template: 'pointsTransferManual',
    label: 'Points : transfert manuel (reçus)',
    group: 'Points',
    data: { userName: 'Camille', role: 'receiver', amount: 5, counterpartName: 'Alex M.', date: '24 novembre 2026', description: 'Merci pour le coup de main !\nÀ charge de revanche.', balance: 43 },
  },
  pointsTransferManualSender: {
    template: 'pointsTransferManual',
    label: 'Points : transfert manuel (envoyés)',
    group: 'Points',
    data: { userName: 'Alex', role: 'sender', amount: 5, counterpartName: 'Camille D.', date: '24 novembre 2026', description: 'Merci pour le coup de main !', balance: 0 },
  },
  pointsTransferCancelledDemand: {
    template: 'pointsTransferCancelled',
    label: 'Points : annulé (demande annulée)',
    group: 'Points',
    data: { userName: 'Camille', role: 'receiver', amount: 12, counterpartName: 'Alex M.', date: '27 novembre 2026', reason: 'demandNoLongerAccepted' },
  },
  pointsTransferCancelledBalance: {
    template: 'pointsTransferCancelled',
    label: 'Points : annulé (solde insuffisant)',
    group: 'Points',
    data: { userName: 'Alex', role: 'sender', amount: 12, counterpartName: 'Camille D.', date: '27 novembre 2026', reason: 'insufficientBalance', minBalance: MIN_POINTS_BALANCE },
  },
  pointsTransferCancelledByUser: {
    template: 'pointsTransferCancelled',
    label: "Points : annulé (par l'utilisateur)",
    group: 'Points',
    data: { userName: 'Camille', role: 'receiver', amount: 5, counterpartName: 'Alex M.', date: '30 novembre 2026', reason: 'cancelledByUser' },
  },
  pointsTransferCancelledCenter: {
    template: 'pointsTransferCancelled',
    label: 'Points : annulé (changement de centre)',
    group: 'Points',
    data: { userName: 'Alex', role: 'sender', amount: 5, counterpartName: 'Camille D.', date: '30 novembre 2026', reason: 'centerTransfer' },
  },
  pointsTransferCancelledError: {
    template: 'pointsTransferCancelled',
    label: 'Points : annulé (erreur technique)',
    group: 'Points',
    data: { userName: 'Alex', role: 'sender', amount: 5, counterpartName: 'Camille D.', date: '30 novembre 2026', reason: 'error' },
  },
  adminNotification: {
    label: 'Nouvelle inscription (admin)',
    group: 'Administration',
    data: {
      newUserName: 'Camille',
      newUserLastName: 'DUPONT',
      newUserEmail: 'camille.dupont@example.com',
      newUserCenter: 'Paris CRNA',
      newUserCenterOACI: 'LFFF',
      newUserCreatedAt: '24/11/2026',
    },
  },
  availableDemand: {
    label: 'Nouvelle demande disponible',
    group: 'Demandes',
    data: { ...demand, userName: 'Camille', posterName: 'Alex MARTIN', posterContact: alex, canSwitch: true, canReplace: true },
  },
  availableDemandSwitch: {
    template: 'availableDemand',
    label: 'Nouvelle demande : permutation',
    group: 'Demandes',
    data: {
      ...demand,
      userName: 'Camille',
      posterName: 'Alex MARTIN',
      posterContact: alex,
      typeText: 'Permutation',
      demandType: 'switch',
      canSwitch: true,
      comment: 'Plutôt un matin le week-end suivant.',
      acceptedSwitches: [
        { shift: 'Soir', startTime: '14:00', endTime: '22:00', points: 10 },
        { shift: 'Matin', startTime: '06:30', endTime: '14:30', points: 12 },
      ],
    },
  },
  acceptedDemand: {
    label: 'Demande acceptée',
    group: 'Demandes',
    data: {
      userName: 'Alex',
      accepterName: 'Camille DUPONT',
      typeText: 'Permutation',
      posterShiftDate: 'jeudi 26 novembre',
      posterShift: 'Matin',
      accepterShift: 'Soir',
      accepterTeam: 'Équipe C',
      accepterContact: camille,
    },
  },
  withdrawal: {
    label: 'Désistement',
    group: 'Demandes',
    data: { userName: 'Alex', accepterName: 'Camille DUPONT', accepterContact: camille, posterShiftDate: 'jeudi 26 novembre' },
  },
  cancelledDemand: {
    label: 'Demande annulée par son auteur',
    group: 'Demandes',
    data: {
      userName: 'Camille',
      posterName: 'Alex',
      posterLastName: 'MARTIN',
      posterShiftDate: 'jeudi 26 novembre',
      creationDate: '20/11/2026',
      youWereAccepter: true,
      accepters: 'Camille DUPONT',
      posterContact: alex,
    },
  },
  unacceptedDemand: {
    label: 'Demande non acceptée',
    group: 'Demandes',
    data: { userName: 'Alex', posterShiftDate: 'jeudi 26 novembre', creationDate: '20/11/2026' },
  },
  systemCancel: {
    label: 'Demande annulée (accepteur)',
    group: 'Demandes',
    data: { userName: 'Camille', role: 'accepter', typeText: 'Remplacement', counterpartName: 'Alex MARTIN', counterpartContact: alex, posterShiftDate: 'jeudi 26 novembre' },
  },
  systemCancelPoster: {
    template: 'systemCancel',
    label: 'Demande annulée (auteur)',
    group: 'Demandes',
    data: { userName: 'Alex', role: 'poster', typeText: 'Remplacement', counterpartName: 'Camille DUPONT', counterpartContact: camille, posterShiftDate: 'jeudi 26 novembre' },
  },
  replacementReminder: {
    label: 'Rappel de la veille',
    group: 'Demandes',
    data: {
      ...demand,
      userName: 'Camille',
      posterName: 'Alex MARTIN',
      effectiveTypeText: 'permutation',
      effectiveTypeLower: 'une permutation',
      exchangedShift: 'Soir',
      posterContact: alex,
      demandType: 'switch',
      typeText: 'Permutation',
    },
  },
  administrationRequest: {
    label: "Demande à l'administration",
    group: 'Demandes',
    data: { ...demand, centerName: 'Paris CRNA', posterName: 'Alex MARTIN', posterContact: alex, accepterName: 'Camille DUPONT', accepterContact: camille },
  },
  announcement: {
    label: 'Annonce du centre',
    group: 'Communication',
    data: {
      userName: 'Camille',
      isGlobal: false,
      centerName: 'Paris CRNA',
      title: 'Changement de tour de service au 1er décembre',
      message: 'Un nouveau tour de service entre en vigueur le 1er décembre.\nVérifiez votre planning dans Céleste.',
      announcementDate: '24/11/2026',
      announcementAuthor: 'Jean Responsable',
      announcementDetails: 'Toutes les équipes sont concernées.',
      announcementUrl: 'https://celeste-app.fr',
    },
  },
  newTicket: {
    label: 'Nouveau ticket (admin)',
    group: 'Support',
    data: {
      isLocal: true,
      ticketId: '1c2a9f',
      typeLabel: 'Assistance',
      userName: 'Camille DUPONT',
      creationDate: '24/11/2026',
      title: 'Je ne vois pas mes demandes',
      centerName: 'Paris CRNA',
      centerOACI: 'LFFF',
      userEmail: 'camille.dupont@example.com',
      content: 'Bonjour,\nDepuis ce matin la liste est vide.\nMerci !',
    },
  },
  ticketReply: {
    label: 'Réponse à un ticket',
    group: 'Support',
    data: {
      userName: 'Camille',
      ticketId: '65f1c2a9',
      title: 'Je ne vois pas mes demandes',
      replyContent: 'Bonjour,\nLe problème est corrigé, merci de recharger la page.',
    },
  },
};

/** Fichier de `templates/content` que rend un aperçu : sa clé, sauf s'il en nomme un autre */
export const sampleTemplate = (key) => MAIL_SAMPLES[key].template || key;
