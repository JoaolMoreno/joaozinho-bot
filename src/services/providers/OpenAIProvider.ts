import axios, { AxiosError } from 'axios';
import { IAProvider } from '../IAProvider';
import {HumorUtils} from "../humor";

export class OpenAIProvider implements IAProvider {
    private readonly apiKey: string;
    private readonly baseUrl: string = 'https://api.openai.com/v1';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async getResponse(userMessage: string, contexto: string | null): Promise<{ resposta: string, variacao: number }> {
        try {
            const messages: any[] = [];
            if (contexto) {
                messages.push({ role: 'system', content: contexto });
            }
            messages.push({ role: 'user', content: userMessage });

            const tools = [
                {
                    type: 'function',
                    function: {
                        name: 'atualizarHumor',
                        description: 'Ajusta o humor do Moreno conforme o tom da conversa',
                        parameters: {
                            type: 'object',
                            properties: {
                                variacao: {
                                    type: 'number',
                                    description: 'Variação do humor: positivo para feliz, negativo para triste, zero para neutro'
                                }
                            },
                            required: ['variacao']
                        }
                    }
                }
            ];

            let variacaoHumor = 0;

            // Primeira chamada à API
            const response = await axios.post(
                `${this.baseUrl}/chat/completions`,
                {
                    model: 'gpt-3.5-turbo-1106',
                    messages,
                    max_tokens: 2048,
                    temperature: 0.5,
                    tools,
                    tool_choice: 'auto'
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const choice = response.data.choices?.[0];

            if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
                const assistantMessage = choice.message;
                let fullMessages = [...messages, assistantMessage];

                for (const toolCall of assistantMessage.tool_calls) {
                    let resultado = '';
                    const functionName = toolCall.function.name;
                    const args = JSON.parse(toolCall.function.arguments || '{}');

                    console.log(`IA pediu para chamar a função ${functionName} com argumentos:`, args);

                    if (functionName === 'atualizarHumor') {
                        const valorVariacao = args.variacao || 0;
                        variacaoHumor = valorVariacao;
                        resultado = HumorUtils.atualizarHumor(valorVariacao);
                    } else {
                        const funcao = (this as any)[functionName];
                        if (typeof funcao === 'function') {
                            resultado = funcao.apply(this, args);
                        } else {
                            resultado = `Função ${functionName} não encontrada.`;
                        }
                    }

                    const toolResponse = {
                        role: 'tool',
                        content: resultado,
                        tool_call_id: toolCall.id
                    };

                    fullMessages.push(toolResponse);
                }

                // Segunda chamada à API com resultado da função
                const response2 = await axios.post(
                    `${this.baseUrl}/chat/completions`,
                    {
                        model: 'gpt-3.5-turbo-1106',
                        messages: fullMessages,
                        max_tokens: 2048,
                        temperature: 0.5
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${this.apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                const resposta = response2.data.choices?.[0]?.message?.content?.trim() || '';
                return { resposta, variacao: variacaoHumor };
            }

            // Resposta direta
            const resposta = choice?.message?.content?.trim() || '';
            return { resposta, variacao: variacaoHumor };

        } catch (error: any) {
            if (error instanceof AxiosError && error.response) {
                console.error('Erro ao chamar OpenAI API:', error.response.data || error.message);
                return {
                    resposta: `Erro ao obter resposta da OpenAI: ${error.response.data?.error?.message || error.message}`,
                    variacao: 0
                };
            }
            console.error('Erro inesperado ao chamar OpenAI:', error.message);
            return { resposta: 'Erro inesperado ao obter resposta da OpenAI.', variacao: 0 };
        }
    }
}