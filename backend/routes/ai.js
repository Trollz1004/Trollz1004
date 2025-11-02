const express = require('express');
const { GoogleGenerativeAI } = require('@google/genai');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();
router.use(authenticateToken);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/match-analysis', async (req, res) => {
    // Logic for match analysis
    res.json({ message: 'Match analysis endpoint' });
});

router.post('/date-suggestions', async (req, res) => {
    // Logic for date suggestions
    res.json({ message: 'Date suggestions endpoint' });
});

module.exports = router;
