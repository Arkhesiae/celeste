import express from 'express';
const router = express.Router();

import {
    getAllCenters,
    addCenter,
    updateCenter,
    deleteCenter,
    getActiveRotationOfCenter,

    getActiveRotationsByCenter,
    getUsersCountByCenter,
    getAdminsByCenter
} from '../controllers/centerController.js';

// Routes pour les centres
router.get('/', getAllCenters);
router.post('/', addCenter);
router.put('/:id', updateCenter);
router.delete('/:id', deleteCenter);
router.get('/:id/active-rotation', getActiveRotationOfCenter);

router.get('/all-active-rotations', getActiveRotationsByCenter);
router.get('/users/count', getUsersCountByCenter);
router.get('/admins', getAdminsByCenter);

export default router;
