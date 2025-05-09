import axios from 'axios';
import { IAProvider } from '../IAProvider';

export class OpenAIProvider implements IAProvider {
    private readonly apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async getResponse(userMessage: string, contexto: string | null): Promise<string> {
        try {
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: contexto || '' },
                        { role: 'user', content: userMessage }
                    ],
                    max_tokens: 4096,
                    temperature: 0.5,
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