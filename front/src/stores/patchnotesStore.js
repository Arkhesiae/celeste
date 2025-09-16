
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const usePatchnotesStore = defineStore('patchnotes', () => {
  // État réactif
  const patchNotes = ref([
    {
      id: '0.202509.3',
      version: 'alpha-202509.3',
      releaseDate: '15/09/2025',
      description: 'Version avec des améliorations majeures du système de substitution, sécurisation de la base de données et optimisations techniques.',
      improvements: [
        {
          title: 'Amélioration du système de switchs',
          description: 'Ajout de la fonction getCompatibleSwitches pour récupérer les jours compatibles lors des demandes de substitution, améliorant ainsi l\'expérience utilisateur.'
        },
        {
          title: 'Refactorisation du contrôleur de connexion',
          description: 'Restructuration de la réponse JSON en un objet userData pour une meilleure organisation des données utilisateur.'
        },
        {
          title: 'Amélioration de la gestion des préférences utilisateur',
          description: 'Optimisation du contrôleur utilisateur'
        },
        {
          title: 'Amélioration de l\'affichage des composants',
          description: 'Optimisation de l\'affichage des dialogues et cartes de demande dans l\'interface utilisateur pour une meilleure expérience.'
        },
        {
          title: 'Notifications par email pour les utilisateurs en attente',
          description: 'Ajout de notifications par email automatiques pour informer les utilisateurs en attente de validation de leur compte.'
        }
      ],
      bugFixes: [
        {
          title: 'Nettoyage des logs de débogage',
          description: 'Suppression des logs de débogage dans plusieurs contrôleurs et fichiers utilitaires pour améliorer la lisibilité du code.'
        },
        {
          title: 'Correction des problèmes d\'affichage',
          description: 'Résolution des problèmes d\'affichage dans l\'interface utilisateur, notamment dans les dialogues et les cartes de demande.'
        },
        {
          title: 'Amélioration de la gestion des erreurs MongoDB',
          description: 'Ajout de logs pour afficher l\'URI de connexion MongoDB en cas d\'erreur, facilitant le débogage des problèmes de connexion.'
        }
      ],
      technicalNotes: [
        {
          title: 'Sécurisation de la configuration MongoDB',
          description: 'Modification de l\'URI de connexion MongoDB pour utiliser des variables d\'environnement, améliorant la sécurité des informations sensibles.'
        },
        {
          title: 'Service de sauvegarde automatisé',
          description: 'Ajout d\'un service de sauvegarde MongoDB dans docker-compose.yml avec un script de sauvegarde associé pour automatiser les sauvegardes.'
        },
        {
          title: 'Optimisation des fichiers Docker',
          description: 'Simplification du Dockerfile en supprimant des lignes inutiles et amélioration de la configuration docker-compose pour une meilleure gestion des volumes.'
        },
        {
          title: 'Mise à jour des dépendances',
          description: 'Mise à jour des dépendances dans package-lock.json et package.json pour assurer la compatibilité avec les dernières versions.'
        }
      ],
     
    },
    {
      id: '0.202506.1',
      version: 'alpha-202506.1',
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
      id: '0.202508.1',
      version: 'alpha-202508.1',
      releaseDate: '09/08/2025',
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
        {
          title: 'Intégration des règles',
          description: 'Ajout des règles de calcul au regarde l\'arrété 2024 (3/7) pour le calcul des compatibilités.'
        },
     


      ],
      bugFixes: [
        {
          title: 'Correction du problème de synchronisation',
          description: 'Résolution du problème de synchronisation des données entre pages.'
        },
        {
          title: 'Correction des erreurs d\'affichage',
          description: 'Correction des problèmes d\'affichage sur les écrans de petite taille.'
        }
      ],
      technicalNotes: [
        {
          title: 'Tests de l\'email',
          description: 'Tests de l\'email pour la notification des utilisateurs.'
        }
      ],
      links: [
        { label: 'Documentation', url: 'https://docs.example.com/v2.1.0' },
        { label: 'Guide de migration', url: 'https://docs.example.com/migration' }
      ]
    },
    {
      id: '0.202509.1',
      version: 'alpha-202509.1',
      releaseDate: '01/09/2025',
      description: 'Nouvelle version avec des améliorations majeures de l\'interface utilisateur et de nouvelles fonctionnalités.',
      improvements: [
        {
          title: 'Ajout de la page admin panel',
          description: 'Ajout de la page admin panel pour la gestion des utilisateurs et des paramètres.'
        },
        {
          title: 'Ajout de la fonctionnalité "Absences"',
          description: 'Ajout de la fonctionnalité "Absences" pour la gestion des absences des utilisateurs.'
        },
        {
          title: 'Refactorisation des tours de service',
          description: 'Refactorisation des tours de service pour s\'adapter au nouveau format de données.'
        },
        {
          title: 'Amélioration de l\'interface du calendrier',
          description: 'Amélioration de l\'interface du calendrier pour une meilleure lisibilité et une meilleure expérience utilisateur.'
        },
        {
          title: 'Ajout des mails de notifications',
          description: 'Ajout des mails de notifications'
        },
        {
          title: 'Ajout du panel stats',
          description: 'Ajout du panel stats sur la page d\'accueil'
        },
        {
          title: 'Préparation des retours haptiques',
          description: 'Préparation des retours haptiques déploiement Android'
        }
     


      ],
      bugFixes: [
        {
          title: 'Correction de problèmes de persistence de la connexion',
          description: 'Réécriture du code pour la gestion des tokens.'
        },
        {
          title: 'Correction d\'erreurs de navigation',
          description: 'Correction des problèmes de navigation.'
        }
      ],
      technicalNotes: [
        {
          title: 'Email validés',
          description: 'Validation du fonctionnement des emails.'
        },
        {
          title: 'Permutations corrompues',
          description: 'Certaines permutations ont été corrompues.'
        }
      ],
      links: [

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