const express = require('express');
const router = express.Router();
const axios = require('axios');
const logger = require('../utils/logger');

// POST /api/ai/chat - Chat with Gemini AI
router.post('/chat', async (req, res) => {
    try {
        const { message, conversationHistory } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            return res.status(503).json({ error: 'AI service not configured' });
        }

        const prompt = conversationHistory
            ? `${conversationHistory}\n\nUser: ${message}\n\nAssistant:`
            : message;

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [{
                    parts: [{ text: prompt }]
                }]
            }
        );

        const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

        res.json({
            success: true,
            reply,
            model: 'gemini-pro'
        });

    } catch (error) {
        logger.error('AI chat error:', error);
        res.status(500).json({ error: 'AI service error' });
    }
});

// POST /api/ai/match-analysis - Analyze compatibility
router.post('/match-analysis', async (req, res) => {
    try {
        const { matchId } = req.body;

        // Get match details
        const matchResult = await req.app.locals.pool.query(
            `SELECT m.*,
                    pa.bio as bio_a, pa.interests as interests_a,
                    pb.bio as bio_b, pb.interests as interests_b
             FROM matches m
             JOIN user_profiles pa ON m.user_id_a = pa.user_id
             JOIN user_profiles pb ON m.user_id_b = pb.user_id
             WHERE m.id = $1`,
            [matchId]
        );

        if (matchResult.rows.length === 0) {
            return res.status(404).json({ error: 'Match not found' });
        }

        const match = matchResult.rows[0];

        const prompt = `Analyze the compatibility between these two dating profiles:

Profile A: ${match.bio_a}
Profile B: ${match.bio_b}

Provide a compatibility score (0-100) and a brief analysis.`;

        if (!process.env.GEMINI_API_KEY) {
            return res.status(503).json({ error: 'AI service not configured' });
        }

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [{
                    parts: [{ text: prompt }]
                }]
            }
        );

        const analysis = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

        res.json({
            success: true,
            analysis,
            matchId
        });

    } catch (error) {
        logger.error('Match analysis error:', error);
        res.status(500).json({ error: 'Analysis failed' });
    }
});

// POST /api/ai/date-suggestions - Get AI date ideas (Premium feature)
router.post('/date-suggestions', async (req, res) => {
    try {
        const { matchId, location, budget } = req.body;

        const prompt = `Suggest 3 unique date ideas for a couple in ${location || 'their city'}
        with a ${budget || 'moderate'} budget. Be creative and specific.`;

        if (!process.env.GEMINI_API_KEY) {
            return res.status(503).json({ error: 'AI service not configured' });
        }

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [{
                    parts: [{ text: prompt }]
                }]
            }
        );

        const suggestions = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

        // Save to database
        await req.app.locals.pool.query(
            `INSERT INTO ai_date_plans (match_id, generated_by_user_id, date_ideas, gemini_prompt)
             VALUES ($1, $2, $3, $4)`,
            [matchId, req.userId, JSON.stringify({ suggestions }), prompt]
        );

        res.json({
            success: true,
            suggestions
        });

    } catch (error) {
        logger.error('Date suggestions error:', error);
        res.status(500).json({ error: 'Failed to generate suggestions' });
    }
});

module.exports = router;
