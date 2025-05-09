const express = require('express');
const router = express.Router();
const workshiftController = require('../controllers/workshiftController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');


// Routes protégées par token
router.get('/', verifyToken, workshiftController.getAllWorkshifts);
router.get('/center/:centerId', verifyToken, workshiftController.getWorkshiftsByCenter);
router.get('/getAll/:centerId', verifyToken, workshiftController.getAllWorkshiftsWithStatus);
router.get('/active-at-date', verifyToken, workshiftController.getActiveWorkshiftAtDate);

// Routes protégées par token et rôle administrateur local
router.post('/save', verifyToken, isAdmin, workshiftController.saveWorkshift);
router.delete('/:id', verifyToken, isAdmin, workshiftController.deleteWorkshift);
router.post('/:id/activate', verifyToken, isAdmin, workshiftController.addActivationDate);
router.delete('/:id/activation-date', verifyToken, isAdmin, workshiftController.removeActivationDate);

// Gestion erreur globale
router.use((err, req, res, next) => {
    console.error(err);
    res.status(err.statusCode || 500).json({
        message: err.message,
        type: err.type || 'GeneralError',
    });
});

module.exports = router;