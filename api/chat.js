// api/chat.js
// Versão "Conhecimento Geral" (Sem leitura de arquivo local)

export default async function handler(req, res) {
    // 1. CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Chave API ausente.' });

    const { message } = req.body || {};

    // 2. Modelo (Use o 2.5-flash ou 1.5-flash, o que estiver funcionando pra você)
    const modelName = "gemini-2.5-flash"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    
    // 3. Prompt de Especialista (Sem pedir dados locais)
    const systemPrompt = `Você é o 'Professor pokémon', um especialista em Pokémons.
    Diretrizes:
    1. Responda perguntas sobre Pokémon, ataques, evoluções, fraquezas, itens e como encontra-los, estratégias e etc mas somente sobre Pokémon.
    2. Use todo o seu conhecimento da internet/base de dados sobre a franquia Pokémon.
    3. Seja direto, resumido e responda sempre na lingua que a pessoa fez a pergunta.
    4. Se perguntarem sobre stats, use os valores padrão dos jogos oficiais (Gen 3 a 9).
    5. Formate a resposta de jeito bonito (use tópicos e negrito)
    `;

    const payload = {
        contents: [{
            parts: [{ text: `${systemPrompt}\n\nPergunta do Treinador: "${message}"` }]
        }]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (!response.ok) {
            return res.status(500).json({ error: data.error?.message || 'Erro Google' });
        }

        const text = data.candidates[0].content.parts[0].text;
        res.status(200).json({ reply: text });

    } catch (error) {
        res.status(500).json({ error: 'Erro interno.' });
    }
}