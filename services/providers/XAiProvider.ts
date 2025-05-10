import axios, { AxiosError } from 'axios';
import { IAProvider } from '../IAProvider';
import {HumorUtils} from "../humor";

export class XAIProvider implements IAProvider {
    private readonly apiKey: string;
    private readonly baseUrl: string = 'https://api.x.ai/v1';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async getResponse(userMessage: string, contexto: string | null): Promise<{ resposta: string, variacao: number }> {
        try {
            const messages = [];
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
                },
            ];

            const payload = {
                messages,
                model: 'grok-3',
                stream: false,
                temperature: 0.5,
                max_tokens: 2048,
                tools,
                tool_choice: 'auto'
            };

            // Variável para rastrear a variação de humor
            let variacaoHumor = 0;

            // Primeira chamada à API para obter a resposta inicial
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

            const choice = response.data.choices?.[0];

            // Verifica se a IA solicitou chamar alguma função
            if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
                const assistantMessage = choice.message;
                let fullMessages = [...messages, assistantMessage];

                // Processa cada chamada de função solicitada pela IA
                for (const toolCall of assistantMessage.tool_calls) {
                    let resultado = '';
                    const functionName = toolCall.function.name;
                    const args = JSON.parse(toolCall.function.arguments || '{}');

                    console.log(`IA pediu para chamar a função ${functionName} com argumentos:`, args);

                    // Executa a função apropriada com base no nome solicitado
                    if (functionName === 'atualizarHumor') {
                        // Captura a variação de humor para retornar ao final
                        const valorVariacao = args.variacao || 0;
                        variacaoHumor = valorVariacao;
                        resultado = HumorUtils.atualizarHumor(valorVariacao);
                    } else {
                        // Chama a função correspondente
                        const funcao = (this as any)[functionName];
                        if (typeof funcao === 'function') {
                            resultado = funcao.apply(this, args);
                        } else {
                            console.warn(`Função ${functionName} não encontrada.`);
                            resultado = `Função ${functionName} não encontrada.`;
                        }
                    }

                    // Adiciona o resultado da função à mensagem
                    const toolResponse = {
                        role: 'tool',
                        content: resultado,
                        tool_call_id: toolCall.id
                    };

                    fullMessages.push(toolResponse);
                }

                // Faz uma segunda chamada à API com os resultados das funções
                const payload2 = {
                    model: 'grok-3',
                    messages: fullMessages,
                    stream: false,
                    temperature: 0.5,
                    max_tokens: 2048
                };

                const response2 = await axios.post(
                    `${this.baseUrl}/chat/completions`,
                    payload2,
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

            // Se a IA não solicitou nenhuma função, retorna a resposta direta
            const resposta = choice?.message?.content?.trim() || '';
            return { resposta, variacao: variacaoHumor };

        } catch (error: any) {
            if (error instanceof AxiosError && error.response) {
                console.error('Erro ao chamar xAI API:', error.response.data || error.message);
                return {
                    resposta: `Erro ao obter resposta da xAI: ${error.response.data?.error?.message || error.message}`,
                    variacao: 0
                };
            }
            console.error('Erro inesperado ao chamar xAI:', error.message);
            return { resposta: 'Erro inesperado ao obter resposta do xAI.', variacao: 0 };
        }
    }
}