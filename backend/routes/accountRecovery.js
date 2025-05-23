const express = require('express');
const router = express.Router();
const accountRecoveryController = require('../controllers/accountRecoveryController');
const { isAdmin } = require('../middleware/auth');

router.post('/', accountRecoveryController.createRequest);
router.get('/', isAdmin, accountRecoveryController.getAllRequests);
router.patch('/:id', isAdmin, accountRecoveryController.updateRequestStatus);

module.exports = router; 