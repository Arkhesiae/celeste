import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useFundingStore = defineStore('funding', () => {
  // Reactive state
  const userCount = ref(45);
  const totalMonthlyCost = ref(180);
  const nextCampaign = ref('15 Mars 2026');
  const campaignGoal = ref(500);

  // Fixed costs
  const fixedCosts = ref([
    {
      nom: 'Domaine',
      description: 'Attribution du nom de domaine',
      cout: 10,
      icon: 'mdi-web',
      color: 'primary'
    },
    {
      nom: 'Licences logicielles',
      description: 'Coût initial licence logiciel',
      cout: 100,
      icon: 'mdi-license',
      color: 'secondary'
    }
  ]);

  // Recurring costs
  const recurringCosts = ref([
    {
      nom: 'Hébergement serveur',
      description: 'Serveur dédié',
      cout: 5,
      periodicite: 'mois',
      icon: 'mdi-server-network',
      color: 'primary'
    },
    {
      nom: 'Base de données',
      description: 'Hébergement et maintenance de la base de données',
      cout: 0.5,
      periodicite: 'mois',
      icon: 'mdi-database',
      color: 'secondary'
    },
    {
      nom: 'Nom de domaine',
      description: 'Renouvellement annuel du nom de domaine',
      cout: 8,
      periodicite: 'annuel',
      icon: 'mdi-cloud',
      color: 'info'
    },
    {
      nom: 'Développement agent IA',
      description: "Développement d'un agent IA pour la gestion des demandes",
      cout: 10,
      periodicite: 'mois',
      icon: 'mdi-robot',
      color: 'success'
    },
    {
      nom: 'Sauvegarde automatique',
      description: 'Système de sauvegarde cloud sécurisé',
      cout: 0,
      periodicite: 'mois',
      icon: 'mdi-backup-restore',
      color: 'warning'
    },
    {
      nom: 'Envoi de mail',
      description: 'Envoi de mail',
      cout: 10,
      periodicite: 'mois',
      icon: 'mdi-email',
      color: 'error'
    }
  ]);

  // Budget evolution
  const budgetEvolution = ref([
    {
      date: '2025-06-30',
      montant: 266,
      description: 'Campagne initiale',
      active: true
    },
  ]);

  // Expenses split between two campaigns
  const expenses = ref([
   
  ]);

  // Current campaign if exists
  const currentCampaign = ref(null);

  // List of campaigns with their start and end date (sorted by date)
  const campaigns = computed(() => {
    // On trie d'abord par date décroissante
    const sorted = [...budgetEvolution.value].sort((a, b) => new Date(a.date) - new Date(b.date));
    return sorted.map((campaign, idx, arr) => {
      const startDate = new Date(campaign.date);
      const endDate = arr[idx + 1] ? new Date(arr[idx + 1].date) : null;
      return {
        index: idx,
        ...campaign,
        startDate,
        endDate,
        expenses: expenses.value.filter(exp => {
          const d = new Date(exp.date);
          if (endDate) {
            return d >= startDate && d < endDate;
          } else {
            return d >= startDate;
          }
        })
      };
    });
  });

  function getCampaignsStatus(campaigns) {
    const now = new Date();
    // Trie les campagnes par date de début décroissante
    const sorted = [...campaigns].sort((a, b) => parseDate(b.startDate) - parseDate(a.startDate));
    return sorted.map((c, idx) => {
      const start = parseDate(c.startDate);
      const end = c.endDate ? parseDate(c.endDate) : null;
      console.log(start, now, start > now)
      if (start > now) {
        return { ...c, status: 'a_venir' };
      }

      if (!end && start <= now || start <= now && end >= now) {
        return { ...c, status: 'en_cours' };
      }
      return { ...c, status: 'termine' };
    });
  }

  function parseDate(dateStr) {
    // Si c'est déjà un format ISO ou reconnu, ça marche directement
    let date = new Date(dateStr);
    if (!isNaN(date)) return date;
    // Sinon, on tente le format dd/mm/yyyy
    const match = /^\d{2}\/\d{2}\/\d{4}$/.exec(dateStr);
    if (match) {
      const [day, month, year] = dateStr.split('/');
      return new Date(`${year}-${month}-${day}T00:00:00`);
    }
    return new Date(NaN);
  }

  // Campaigns with status  
  const campaignsWithStatus = computed(() => getCampaignsStatus(campaigns.value));



  // Computed properties
  // Initial budget of the current campaign (contribution + remainder of previous)
  const initialBudget = computed(() => {
    let contribution = campaigns.value[currentCampaign.value]?.montant || 0;
    let remainder = previousCampaignsRemainder.value || 0;
    return contribution + remainder;
  });

  // Budget used for the current campaign
  const usedBudget = computed(() => {
    return campaignExpenses.value.reduce((total, expense) => total + Number(expense.montant), 0);
  });

  // Current budget (remainder of the current campaign)
  const currentBudget = computed(() => initialBudget.value - usedBudget.value);


  const costPerUser = computed(() => {
    return Math.round((totalMonthlyCost.value * 12) / userCount.value);
  });

  const remainingTime = computed(() => {
    return Math.round(currentBudget.value / totalMonthlyCost.value);
  });

  const totalFixedCosts = computed(() => {
    return fixedCosts.value.reduce((total, cost) => total + cost.cout, 0);
  });

  const totalAnnualCosts = computed(() => {
    return recurringCosts.value.reduce((total, cost) => total + (cost.cout * (cost.periodicite === 'mois' ? 12 : cost.periodicite === 'annuel' ? 1 : cost.periodicite === 'semestriel' ? 2 : 1)), 0);
  });

  const totalMonthlyCosts = computed(() => {
    return recurringCosts.value.reduce((total, cost) => total + cost.cout, 0);
  });

  const totalAnnualCost = computed(() => {
    return  totalAnnualCosts.value;
  });

  const budgetUsageRate = computed(() => {
    return Math.round((currentBudget.value / initialBudget.value) * 100);
  });

  const monthlyDeficit = computed(() => {
    return totalMonthlyCost.value - (currentBudget.value / 12);
  });

  // Methods
  const updateBudget = (newBudget) => {
    // This method is deprecated as currentBudget is now computed
    // but kept for compatibility
    console.warn('updateBudget is deprecated. Use updateBudgetEvolution instead.');
  };

  const updateUserCount = (newUserCount) => {
    userCount.value = newUserCount;
  };

  const addRecurringCost = (cost) => {
    recurringCosts.value.push(cost);
  };

  const removeRecurringCost = (index) => {
    recurringCosts.value.splice(index, 1);
  };

  const addFixedCost = (cost) => {
    fixedCosts.value.push(cost);
  };

  const removeFixedCost = (index) => {
    fixedCosts.value.splice(index, 1);
  };

  const updateBudgetEvolution = (newEvolution) => {
    budgetEvolution.value = newEvolution;
  };

  const addBudgetEvolution = (evolution) => {
    budgetEvolution.value.push(evolution);
  };

  const removeBudgetEvolution = (index) => {
    budgetEvolution.value.splice(index, 1);
  };

  const getBudgetProjection = (months) => {
    return Math.max(0, currentBudget.value - (totalMonthlyCost.value * months));
  };

  const getExhaustionDate = () => {
    const monthsLeft = Math.floor(currentBudget.value / totalMonthlyCost.value);
    const date = new Date();
    date.setMonth(date.getMonth() + monthsLeft);
    return date.toLocaleDateString('fr-FR', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  const getCostEfficiency = () => {
    return Math.round((userCount.value / totalMonthlyCost.value) * 100);
  };

  return {
    // State
    initialBudget,
    currentBudget,
    userCount,
    totalMonthlyCost,
    nextCampaign,
    campaignGoal,
    fixedCosts,
    recurringCosts,
    budgetEvolution,
    expenses,
    
    // Computed

    costPerUser,
    remainingTime,
    totalFixedCosts,
    totalAnnualCosts,
    totalMonthlyCosts,
    totalAnnualCost,
    budgetUsageRate,
    monthlyDeficit,
    currentCampaign,
    campaignsWithStatus,



    
    // Methods
    updateBudget,
    updateUserCount,
    addRecurringCost,
    removeRecurringCost,
    addFixedCost,
    removeFixedCost,
    updateBudgetEvolution,
    addBudgetEvolution,
    removeBudgetEvolution,
    getBudgetProjection,
    getExhaustionDate,
    getCostEfficiency
  };
}); 