import axios from 'axios';
import { IAProvider } from '../IAProvider';

export class OpenAIProvider implements IAProvider {
    private readonly apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async getResponse(userMessage: string, contexto: string | null): Promise<string> {
        try {
            let systemContent = `Você é Moreno AI, uma inteligência artificial...`;
            if (contexto) {
                systemContent += `\n\nContexto do chat:\n${contexto}`;
            }

            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-4',
                    messages: [
                        { role: 'system', content: systemContent },
                        { role: 'user', content: userMessage }
                    ],
                    max_tokens: 200
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data.choices[0].message.content.trim();
        } catch (error: any) {
            console.error('Erro ao chamar OpenAI:', error.response?.data || error.message);
            return 'Erro ao obter resposta do OpenAI.';
        }
    }
}