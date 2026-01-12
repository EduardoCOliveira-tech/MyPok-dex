// api/chat.js

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Chave de API não configurada na Vercel.' });
    }

    const { message, context } = req.body || {};

    // TENTATIVA 1: Vamos tentar o modelo padrão atual (Flash)
    // Se falhar, o código lá embaixo vai nos contar o motivo
    const modelName = "gemini-2.5-flash"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    
    let systemPrompt = `
    Você é o 'Professor pokémon', um especialista em Pokémons.
    Diretrizes:
    1. Responda perguntas sobre Pokémon, ataques, evoluções, fraquezas, itens e como encontra-los, estratégias e etc mas somente sobre Pokémon.
    2. Use todo o seu conhecimento da internet/base de dados sobre a franquia Pokémon.
    3. Seja direto, resumido e responda sempre na lingua que a pessoa fez a pergunta.
    4. Se perguntarem sobre stats, use os valores padrão dos jogos oficiais (Gen 3 a 9).
    `;

    if (context) {
        systemPrompt += `\nDADOS TÉCNICOS:\n${JSON.stringify(context)}\n`;
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
        
        // --- AQUI ESTÁ A MÁGICA DE DIAGNÓSTICO ---
        if (!response.ok) {
            console.error("Erro no modelo:", data);

            // Se o erro for "Model not found", vamos listar o que você TEM acesso
            if (data.error && data.error.message.includes("not found")) {
                try {
                    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
                    const listResp = await fetch(listUrl);
                    const listData = await listResp.json();
                    
                    // Filtra apenas os modelos que geram texto
                    const availableModels = listData.models
                        ?.filter(m => m.supportedGenerationMethods.includes("generateContent"))
                        .map(m => m.name.replace("models/", ""));
                        
                    return res.status(500).json({ 
                        error: `O modelo '${modelName}' falhou. SUAS OPÇÕES VÁLIDAS SÃO: ${availableModels?.join(', ') || 'Nenhuma'}` 
                    });
                } catch (e) {
                    return res.status(500).json({ error: `Erro original: ${data.error.message}. (Falha ao listar modelos alternativos)` });
                }
            }

            return res.status(500).json({ error: data.error?.message || 'Erro na API do Google' });
        }

        const text = data.candidates[0].content.parts[0].text;
        res.status(200).json({ reply: text });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro interno no servidor Vercel.' });
    }
}