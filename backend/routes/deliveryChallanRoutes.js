const express = require('express');
const router = express.Router();
const deliveryChallanController = require('../controllers/deliveryChallanController');
const { protect, checkBusinessAccess } = require('../middleware/subUserAuthMiddleware');

router.use(protect);

router.get('/next-number', deliveryChallanController.getNextNumber);

router.post('/', deliveryChallanController.createDeliveryChallan);

router.get('/', deliveryChallanController.getAllDeliveryChallans);

router.get('/stats', deliveryChallanController.getDeliveryChallanStats);

router.get('/:id', deliveryChallanController.getDeliveryChallanById);

router.put('/:id', deliveryChallanController.updateDeliveryChallan);

router.delete('/:id', deliveryChallanController.deleteDeliveryChallan);

module.exports = router;
