const Rule = require('../models/Rule');


// Récupérer toutes les règles
exports.getAllRules = async (req, res) => {
  try {
    const rules = await Rule.find().sort({ name: 1 });
    res.json(rules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mettre à jour une règle
exports.updateRule = async (req, res) => {
  try {


    const { name, value, description } = req.body;
    
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
      return res.status(404).json({ message: 'Règle non trouvée' });
    }

    res.json(rule);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Initialiser les règles par défaut
exports.initializeRules = async (req, res) => {
  try {


    const defaultRules = [
      {
        name: 'MIN_POINTS_TRANSFER',
        value: 100,
        description: 'Points minimum requis pour effectuer un transfert',
        updatedBy: req.user._id
      },
      {
        name: 'MIN_POINTS_SWITCH',
        value: 50,
        description: 'Points minimum requis pour effectuer un échange de service',
        updatedBy: req.user._id
      },
      {
        name: 'MIN_REST_DAYS_7DAYS',
        value: 1,
        description: 'Nombre minimum de jours de repos sur une période glissante de 7 jours',
        updatedBy: req.user._id
      },
      {
        name: 'MAX_WORK_DAYS',
        value: 5,
        description: 'Nombre maximum de jours de travail consécutifs',
        updatedBy: req.user._id
      },
      {
        name: 'MIN_REST_BETWEEN_VACATIONS',
        value: 2,
        description: 'Nombre minimum de jours de repos entre deux périodes de vacances',
        updatedBy: req.user._id
      }
    ];

    const rules = await Rule.insertMany(defaultRules, { ordered: false });
    res.status(201).json(rules);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Les règles existent déjà' });
    } else {
      res.status(500).json({ message: error.message });
    }
  }
}; 