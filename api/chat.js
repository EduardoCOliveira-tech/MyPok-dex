// api/chat.js
// Esse código roda no servidor da Vercel, ninguém vê!

export default async function handler(req, res) {
    // 1. Configurações de Segurança (CORS)
    // Permite que apenas o seu site acesse essa função
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // Depois troque '*' pelo seu domínio para mais segurança
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Responde rápido para requisições de verificação (preflight)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 2. Pega a mensagem que veio do seu site
    const { message, context } = req.body;
    
    // A chave fica escondida nas variáveis de ambiente do servidor
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Chave de API não configurada no servidor.' });
    }

    // 3. Monta o pedido para o Google
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    let systemPrompt = `
    Você é o 'Assistente Ironmon'.
    Diretrizes:
    1. Responda em Português (PT-BR).
    2. Use os dados técnicos fornecidos abaixo como VERDADE ABSOLUTA.
    `;

    if (context) {
        systemPrompt += `\nDADOS TÉCNICOS: ${JSON.stringify(context)}\n`;
    }

    const payload = {
        contents: [{
            parts: [{ text: `${systemPrompt}\n\nPergunta: "${message}"` }]
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
            return res.status(500).json({ error: data.error?.message || 'Erro na API do Google' });
        }

        // Devolve só a resposta do texto para o seu site
        const text = data.candidates[0].content.parts[0].text;
        res.status(200).json({ reply: text });

    } catch (error) {
        res.status(500).json({ error: 'Erro interno no servidor Vercel' });
    }
}