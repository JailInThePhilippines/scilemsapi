const express = require('express');
const router = express.Router();
const visitorController = require('../controllers/visitorController');

// Create or upsert a visitor record
router.post('/', visitorController.createVisitor);

// Get total unique visitors
router.get('/count', visitorController.getUniqueCount);

// Get today's unique visitors
router.get('/today', visitorController.getTodayCount);

// Get visitors aggregated by country
router.get('/by-location', visitorController.getByLocation);

module.exports = router;
