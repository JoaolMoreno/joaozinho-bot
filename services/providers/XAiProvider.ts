import axios, { AxiosError } from 'axios';
import { IAProvider } from '../IAProvider';

export class XAIProvider implements IAProvider {
    private readonly apiKey: string;
    private readonly baseUrl: string = 'https://api.x.ai/v1';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async getResponse(userMessage: string, contexto: string | null): Promise<string> {
        try {
            const messages = [];
            if (contexto) {
                messages.push({
                    role: 'system',
                    content: `Caso necessario, você consegue buscar na web ou no X noticias para validar suas informações, porém não precisa dizer nem especificar que fez isso nem dar referencias.`
                })
                messages.push({
                    role: 'system',
                    content: contexto
                });
            }
            messages.push({
                role: 'user',
                content: userMessage
            });

            const payload = {
                messages,
                model: 'grok-3',
                stream: false,
                temperature: 0.5,
                max_tokens: 4096
            };

            const response = await axios.post(
                `${this.baseUrl}/chat/completions`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Verificar se a resposta contém escolhas válidas
            if (!response.data.choices?.[0]?.message?.content) {
                throw new Error('Resposta inválida da API da xAI');
            }

            return response.data.choices[0].message.content.trim();
        } catch (error: any) {
            // Tratamento de erros mais detalhado
            if (error instanceof AxiosError && error.response) {
                console.error('Erro ao chamar xAI API:', error.response.data || error.message);
                return `Erro ao obter resposta da xAI: ${error.response.data?.error?.message || error.message}`;
            }
            console.error('Erro inesperado ao chamar xAI:', error.message);
            return 'Erro inesperado ao obter resposta do xAI.';
        }
    }
}