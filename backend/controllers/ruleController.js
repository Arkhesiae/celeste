import Rule from '../models/Rule.js';

// Messages d'erreur constants
const ERROR_MESSAGES = {
  RULE_NOT_FOUND: 'Règle non trouvée',
  RULES_ALREADY_EXIST: 'Les règles existent déjà',
  INTERNAL_SERVER_ERROR: 'Une erreur interne est survenue',
  INVALID_REQUEST: 'Requête invalide'
};

// Règles par défaut
const DEFAULT_RULES = [
  {
    name: 'MIN_POINTS_TRANSFER',
    value: 100,
    description: 'Points minimum requis pour effectuer un transfert'
  },
  {
    name: 'MIN_POINTS_SWITCH',
    value: 50,
    description: 'Points minimum requis pour effectuer un échange de service'
  },
  {
    name: 'MIN_REST_DAYS_7DAYS',
    value: 1,
    description: 'Nombre minimum de jours de repos sur une période glissante de 7 jours'
  },
  {
    name: 'MAX_WORK_DAYS',
    value: 5,
    description: 'Nombre maximum de jours de travail consécutifs'
  },
  {
    name: 'MIN_REST_BETWEEN_VACATIONS',
    value: 2,
    description: 'Nombre minimum de jours de repos entre deux périodes de vacances'
  }
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
 * @param {number} value - Nouvelle valeur de la règle
 * @param {string} description - Nouvelle description de la règle
 * @returns {Object} Règle mise à jour
 */
const updateRule = async (req, res) => {
  try {
    const { name, value, description } = req.body;

    if (!name || value === undefined || !description) {
      return res.status(400).json({ message: ERROR_MESSAGES.INVALID_REQUEST });
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

    if (!rule) {
      return res.status(404).json({ message: ERROR_MESSAGES.RULE_NOT_FOUND });
    }

    res.json(rule);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la règle:', error);
    res.status(400).json({ message: error.message || ERROR_MESSAGES.INVALID_REQUEST });
  }
};

/**
 * Initialise les règles par défaut si elles n'existent pas
 * @route POST /api/rules/initialize
 * @returns {Array} Liste des règles créées
 */
const initializeRules = async (req, res) => {
  try {
    // Vérifier si des règles existent déjà
    const existingRules = await Rule.find();
    if (existingRules.length > 0) {
      return res.status(400).json({ message: ERROR_MESSAGES.RULES_ALREADY_EXIST });
    }

    // Préparer les règles avec les informations de l'utilisateur
    const rulesToCreate = DEFAULT_RULES.map(rule => ({
      ...rule,
      updatedBy: req.user._id,
      updatedAt: new Date()
    }));

    const rules = await Rule.insertMany(rulesToCreate, { ordered: false });
    res.status(201).json(rules);
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des règles:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: ERROR_MESSAGES.RULES_ALREADY_EXIST });
    } else {
      res.status(500).json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
    }
  }
  }; 

export default {
  getAllRules,
  updateRule,
  initializeRules
};