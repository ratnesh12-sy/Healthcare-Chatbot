const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const axios = require('axios');
require('dotenv').config();
const { createProxyMiddleware } = require('http-proxy-middleware');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// OpenAI Setup
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Proxy to Spring Boot (except for /ai-chat)
app.use('/api', (req, res, next) => {
    if (req.path === '/ai-chat') {
        return next();
    }
    next();
}, createProxyMiddleware({
    target: 'http://localhost:8080',
    changeOrigin: true,
}));

// AI Chatbot Route
app.post('/api/ai-chat', async (req, res) => {
    const { message, userId } = req.body;
    const authHeader = req.headers.authorization;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        // 1. Get AI Response
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are a professional healthcare assistant. Analyze symptoms and provide possible conditions, precautions, and doctor recommendations. Always advise consulting a real doctor."
                },
                { role: "user", content: message }
            ],
        });

        const aiResponse = completion.choices[0].message.content;

        // 2. Save User Message to Spring Boot
        await axios.post('http://localhost:8080/api/chat/save', {
            message: message,
            isFromAi: false
        }, {
            headers: { Authorization: authHeader }
        });

        // 3. Save AI Response to Spring Boot
        const savedAiMsg = await axios.post('http://localhost:8080/api/chat/save', {
            message: aiResponse,
            isFromAi: true
        }, {
            headers: { Authorization: authHeader }
        });

        res.json({
            message: aiResponse,
            timestamp: new Date(),
            id: savedAiMsg.data.id
        });

    } catch (error) {
        console.error('Error in AI Chat:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to process AI chat' });
    }
});

app.listen(PORT, () => {
    console.log(`Middleware Gateway running on port ${PORT}`);
});
