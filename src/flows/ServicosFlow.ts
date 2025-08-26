import { Flow } from './Flow';
import { EventSource } from "eventsource";

export class ServicosFlow implements Flow {
    name = 'servicos';

    shouldStart(message: string): boolean {
        return message.toLowerCase().startsWith('manutprotheus');
    }

    async start(from: string, message: string, send: (text: string) => Promise<void>) {
        const opcoes = `
Você solicitou gerenciar serviços. Escolha uma opção:
1️⃣ status
2️⃣ status completo
3️⃣ iniciar
4️⃣ encerrar
5️⃣ reiniciar

Envie a opção desejada.
`;
        await send(opcoes);
    }

    async handle(from: string, message: string, state: any, send: (text: string) => Promise<void>): Promise<boolean> {
        const msg = message.trim().toLowerCase();

        if (!state.etapa) state.etapa = 'aguardando_opcao';

        if (state.etapa === 'aguardando_opcao') {
            let tipoStatus: 'simples' | 'completo' | null = null;
            if (["1", "status"].includes(msg)) tipoStatus = 'simples';
            if (["2", "status completo", "statuscompleto"].includes(msg)) tipoStatus = 'completo';
            if (tipoStatus) {
                state.tipoStatus = tipoStatus;
                await send(tipoStatus === 'simples' ? '🔎 Consulta de status (simples) iniciada...' : '🔎 Consulta de status completa iniciada...');
                const sseUrl = 'http://localhost:8000/execute';
                const source = new EventSource(sseUrl);
                let fluxoFinalizado = false;
                const servidores: Record<string, any[]> = {};

                await new Promise<void>((resolve) => {
                    source.onmessage = async (event: MessageEvent) => {
                        let data: any;
                        try {
                            data = JSON.parse(event.data.replace(/^data:\s*/, '').trim());
                        } catch (err) {
                            await send('Erro ao processar evento de serviço.');
                            return;
                        }
                        if (data.type === 'service') {
                            const serviceEvent = data;
                            if (!servidores[serviceEvent.server_name]) {
                                servidores[serviceEvent.server_name] = [];
                            }
                            servidores[serviceEvent.server_name].push(serviceEvent.service);
                        } else if (data.type === 'all_completed') {
                            fluxoFinalizado = true;
                            source.close();
                            await (async () => {
                                for (const [servidor, servicos] of Object.entries(servidores)) {
                                    servicos.sort((a, b) => a.name.localeCompare(b.name));
                                    let mensagem = `Servidor: ${servidor}\n`;
                                    for (const servico of servicos) {
                                        if (state.tipoStatus === 'simples') {
                                            mensagem += `Serviço: ${servico.name}\nStatus: ${servico.status}\n\n`;
                                        } else {
                                            mensagem +=
                                                `Status do serviço: ${servico.name}\n` +
                                                `Status: ${servico.status}\n` +
                                                `Processo: ${servico.process}\n` +
                                                `Path: ${servico.processPath}\n` +
                                                `Portas: ${(servico.ports || []).join(', ')}\n` +
                                                `PID: ${servico.pid}\n\n`;
                                        }
                                    }
                                    await send(mensagem.trim());
                                    await new Promise(res => setTimeout(res, 500));
                                }
                                resolve();
                            })();
                        }
                    };
                    source.onerror = async () => {
                        await send('Erro ao conectar ao serviço de status.');
                        source.close();
                        resolve();
                    };
                });
                if (fluxoFinalizado) {
                    await send('✅ Consulta de status finalizada.');
                }
                return true; // fluxo concluído
            } else if (["3", "iniciar", "4", "encerrar", "5", "reiniciar"].includes(msg)) {
                state.acao = this.mapearOpcao(msg);
                state.etapa = 'confirmacao';
                await send(`⚠️ Você realmente quer ${state.acao} o serviço? Responda 'sim' ou 'não'.`);
                return false; // aguardando confirmação
            } else {
                await send("Opção inválida. Por favor, escolha entre: status, iniciar, encerrar ou reiniciar.");
                return false;
            }
        }

        if (state.etapa === 'confirmacao') {
            if (msg === 'sim') {
                await send(`🔄 ${this.capitalize(state.acao.replace('ar','a'))}ndo o serviço...`);
                setTimeout(async () => {
                    await send(`✅ Serviço ${state.acao}do com sucesso!`);
                }, 2000);
                return true;
            } else if (msg === 'não') {
                await send('❌ Operação cancelada.');
                return true;
            } else {
                await send("Por favor, responda apenas com 'sim' ou 'não'.");
                return false;
            }
        }

        return false;
    }

    private mapearOpcao(msg: string): string {
        if (msg === '3' || msg === 'iniciar') return 'iniciar';
        if (msg === '4' || msg === 'encerrar') return 'encerrar';
        if (msg === '5' || msg === 'reiniciar') return 'reiniciar';
        return 'status';
    }

    private capitalize(text: string): string {
        return text.charAt(0).toUpperCase() + text.slice(1);
    }
}
