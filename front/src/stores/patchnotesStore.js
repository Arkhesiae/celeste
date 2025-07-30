import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const usePatchnotesStore = defineStore('patchnotes', () => {
  // État réactif
  const patchNotes = ref([
    {
      id: '0.625',
      version: 'v0.625',
      releaseDate: '30/06/2025',
      description: 'Alpha initiale, version de test pour les utilisateurs de LFFF',
      technicalNotes: [
        {
          title: 'Mails inactif',
          description: 'Les mails sont actuellement en cours de développement, ils ne sont pas encore utilisables.'
        }
      ],
      links: [
        { label: 'Documentation', url: 'https://docs.example.com/v2.1.0' },
        { label: 'Guide de migration', url: 'https://docs.example.com/migration' }
      ]
    },
    {
      id: '0.825',
      version: 'v0.825',
      releaseDate: '15/08/2025',
      description: 'Nouvelle version avec des améliorations majeures de l\'interface utilisateur et de nouvelles fonctionnalités.',
      improvements: [
        {
          title: 'Ajout de la page de financement',
          description: 'Ajout de la page de financement pour suivre les dépenses et les campagnes de dons.'
        },
        {
          title: 'Ajout de la page de patch notes',
          description: 'Ajout de la page de patch notes pour suivre les évolutions et nouveautés de l\'application.'
        },
        {
          title: 'Optimisation des performances',
          description: 'Amélioration significative des temps de chargement des demandes et de la réactivité.'
        },
        {
          title: 'Amélioration de l\'affichage des transactions',
          description: 'Amélioration de l\'affichage des transactions pour une meilleure lisibilité et ajout des noms.'
        },
        {
          title: 'Ajout du champ téléphone',
          description: 'Ajout du champ téléphone dans le profil pour permettre aux utilisateurs de renseigner leur numéro de téléphone.'
        },
        {
          title: 'Ajout du champ date de naissance',
          description: 'Ajout du champ date de naissance dans le profil pour permettre aux utilisateurs de renseigner leur date de naissance.'
        },
        {
          title: 'Modification de l\'interface de la page d\'accueil',
          description: 'Modification de l\'interface de la page d\'accueil pour une meilleure lisibilité et une meilleure expérience utilisateur.'
        },
     



      ],
      bugFixes: [
        {
          title: 'Correction du problème de synchronisation',
          description: 'Résolution du problème de synchronisation des données entre appareils.'
        },
        {
          title: 'Correction des erreurs d\'affichage',
          description: 'Correction des problèmes d\'affichage sur les écrans de petite taille.'
        }
      ],
      technicalNotes: [
        {
          title: 'Migration vers Vue 3.4',
          description: 'Mise à jour vers la dernière version de Vue.js pour de meilleures performances.'
        }
      ],
      links: [
        { label: 'Documentation', url: 'https://docs.example.com/v2.1.0' },
        { label: 'Guide de migration', url: 'https://docs.example.com/migration' }
      ]
    },
   
  ]);

  // Computed properties
  const currentVersion = computed(() => {
    return patchNotes.value.find(v => v.status === 'current');
  });

  const futureVersions = computed(() => {
    return patchNotes.value.filter(v => v.status === 'future');
  });

  const stableVersions = computed(() => {
    return patchNotes.value.filter(v => v.status === 'stable');
  });

  const allVersions = computed(() => {
    return patchNotes.value;
  });

  // Méthodes
  const getVersionById = (id) => {
    return patchNotes.value.find(v => v.id === id);
  };

  const getVersionsByStatus = (status) => {
    return patchNotes.value.filter(v => v.status === status);
  };

  const getLatestVersion = () => {
    return patchNotes.value[0]; // La première version est la plus récente
  };

  const getVersionByNumber = (versionNumber) => {
    return patchNotes.value.find(v => v.version === versionNumber);
  };

  const addVersion = (version) => {
    patchNotes.value.unshift(version); // Ajouter au début de la liste
  };

  const updateVersion = (id, updates) => {
    const index = patchNotes.value.findIndex(v => v.id === id);
    if (index !== -1) {
      patchNotes.value[index] = { ...patchNotes.value[index], ...updates };
    }
  };

  const deleteVersion = (id) => {
    const index = patchNotes.value.findIndex(v => v.id === id);
    if (index !== -1) {
      patchNotes.value.splice(index, 1);
    }
  };

  return {
    // État
    patchNotes,
    
    // Computed
    currentVersion,
    futureVersions,
    stableVersions,
    allVersions,
    
    // Méthodes
    getVersionById,
    getVersionsByStatus,
    getLatestVersion,
    getVersionByNumber,
    addVersion,
    updateVersion,
    deleteVersion
  };
}); 