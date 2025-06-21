import Rule from '../models/Rule.js';

// Messages d'erreur constants
const ERROR_MESSAGES = {
  RULE_NOT_FOUND: 'Règle non trouvée',
  RULES_ALREADY_EXIST: 'Les règles existent déjà',
  INTERNAL_SERVER_ERROR: 'Une erreur interne est survenue',
  INVALID_REQUEST: 'Requête invalide',
  RESET_SUCCESS: 'Règles réinitialisées avec succès'
};

// Règles par défaut
const DEFAULT_RULES = [
  {
    name: 'MIN_POINTS_TRANSFER',
    type: 'Number',
    value: 0,
    description: 'Points minimum requis pour effectuer un transfert'
  },
  {
    name: 'MIN_POINTS_SWITCH',
    type: 'Number',
    value: -20,
    description: 'Points minimum requis pour effectuer un remplacement'
  },
  {
    name: 'MIN_REST_7DAYS',
    type: 'Number',
    value: 1,
    description: 'Nombre minimum d\'heures de repos consécutives sur une période glissante de 7 jours'
  },
  {
    name: 'MAX_WORK_DAYS',
    type: 'Number',
    value: 5,
    description: 'Nombre maximum de jours de travail consécutifs sur une période glissante de 7 jours'
  },
  {
    name: 'MIN_REST_BETWEEN_VACATIONS',
    type: 'Number',
    value: 2,
    description: 'Nombre minimum d\'heures de repos entre deux vacations'
  },
  {
    name: 'ALLOW_MAILS',
    type: 'Boolean',
    value: true,
    description: 'Permet l\'envoi de mails'
  },
  {
    name: 'MAIL_PRIORITY_THRESHOLD',
    type: 'Number',
    value: 10,
    description: 'Nombre de points minimum pour avoir une priorité dans les mails'
  },
  {
    name: 'MAIL_PRIORITY_DELAY',
    type: 'Number',
    value: 0,
    description: 'Nombre d\'heures pour envoi différé des mails'
  },
  {
    name: 'WEEKEND_COEFFICIENT',
    type: 'Number',
    value: 1.5,
    description: 'Coefficient de majoration des heures de travail le weekend'
  },
  {
    name: 'HOLIDAY_COEFFICIENT',
    type: 'Number',
    value: 1.5,
    description: 'Coefficient de majoration des heures de travail le jour férié'
  },

];

/**
 * Récupère toutes les règles triées par nom
 * @route GET /api/rules
 * @returns {Array} Liste des règles
 */
const getAllRules = async (req, res) => {
  try {
    const rules = await Rule.find().sort({ name: 1 });
    res.json(rules);
  } catch (error) {
    console.error('Erreur lors de la récupération des règles:', error);
    res.status(500).json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

/**
 * Met à jour une règle existante
 * @route PUT /api/rules/:name
 * @param {string} name - Nom de la règle à mettre à jour
 * @param {number|boolean} value - Nouvelle valeur de la règle
 * @param {string} description - Nouvelle description de la règle
 * @returns {Object} Règle mise à jour
 */
const updateRule = async (req, res) => {
  try {
    const { name, value, description } = req.body;

    if (!name || value === undefined || !description) {
      return res.status(400).json({ message: ERROR_MESSAGES.INVALID_REQUEST });
    }

    // Trouver la règle existante pour valider le type
    const existingRule = await Rule.findOne({ name });
    if (!existingRule) {
      return res.status(404).json({ message: ERROR_MESSAGES.RULE_NOT_FOUND });
    }

    // Validation du type de valeur selon le type de la règle existante
    if (existingRule.type === 'Number') {
      if (typeof value !== 'number' || value < 0) {
        return res.status(400).json({ 
          message: `${name} doit avoir une valeur numérique positive` 
        });
      }
    } else if (existingRule.type === 'Boolean') {
      if (typeof value !== 'boolean') {
        return res.status(400).json({ 
          message: `${name} doit avoir une valeur booléenne (true ou false)` 
        });
      }
    }

    const rule = await Rule.findOneAndUpdate(
      { name },
      { 
        value,
        description,
        updatedBy: req.user._id,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    res.json(rule);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la règle:', error);
    res.status(400).json({ message: error.message || ERROR_MESSAGES.INVALID_REQUEST });
  }
};

/**
 * Initialise les règles par défaut qui n'existent pas encore
 * @route POST /api/rules/initialize
 * @returns {Array} Liste des règles créées
 */
const initializeRules = async (req, res) => {
  try {
    // Récupérer toutes les règles existantes
    const existingRules = await Rule.find();
    const existingRuleNames = existingRules.map(rule => rule.name);

    // Filtrer les règles par défaut pour ne garder que celles qui n'existent pas
    const rulesToCreate = DEFAULT_RULES.filter(rule => 
      !existingRuleNames.includes(rule.name)
    );

    // Si aucune règle à créer, retourner un message approprié
    if (rulesToCreate.length === 0) {
      return res.status(200).json({ 
        message: 'Toutes les règles par défaut existent déjà',
        createdRules: []
      });
    }

    // Préparer les règles avec les informations de l'utilisateur
    const rulesWithUserInfo = rulesToCreate.map(rule => ({
      ...rule,
      updatedBy: req.user._id,
      updatedAt: new Date()
    }));

    const createdRules = await Rule.insertMany(rulesWithUserInfo);
    
    res.status(201).json({
      message: `${createdRules.length} règle(s) initialisée(s) avec succès`,
      createdRules
    });
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des règles:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Certaines règles existent déjà' });
    } else {
      res.status(500).json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
    }
  }
};

/**
 * Réinitialise toutes les règles avec les valeurs par défaut
 * @route POST /api/rules/reset
 * @returns {Array} Liste des règles réinitialisées
 */
const resetRules = async (req, res) => {
  try {
    // Supprimer toutes les règles existantes
    await Rule.deleteMany({});

    // Préparer les règles avec les informations de l'utilisateur
    const rulesToCreate = DEFAULT_RULES.map(rule => ({
      ...rule,
      updatedBy: req.user._id,
      updatedAt: new Date()
    }));

    const rules = await Rule.insertMany(rulesToCreate);
    res.status(200).json({
      message: ERROR_MESSAGES.RESET_SUCCESS,
      rules
    });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation des règles:', error);
    res.status(500).json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

export default {
  getAllRules,
  updateRule,
  initializeRules,
  resetRules
};