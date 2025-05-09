const express = require('express');
const router = express.Router();
const {
    getAllCenters,
    addCenter,
    updateCenter,
    deleteCenter,
    getActiveRotationOfCenter,
    getActiveRotationsByCenter,
    getUsersCountByCenter,
    getAdminsByCenter
} = require('../controllers/centerController');

// Routes pour les centres
router.get('/', getAllCenters);
router.post('/', addCenter);
router.put('/:id', updateCenter);
router.delete('/:id', deleteCenter);
router.get('/:id/active-rotation', getActiveRotationOfCenter);

router.get('/all-active-rotations', getActiveRotationsByCenter);
router.get('/users/count', getUsersCountByCenter);
router.get('/admins', getAdminsByCenter);

module.exports = router;
