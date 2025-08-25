import { Flow } from './Flow';

export class ServicosFlow implements Flow {
    name = 'servicos';

    shouldStart(message: string): boolean {
        return message.toLowerCase().startsWith('/manutprotheus');
    }

    async start(from: string, message: string, send: (text: string) => Promise<void>) {
        const opcoes = `
Você solicitou gerenciar serviços. Escolha uma opção:
1️⃣ status
2️⃣ iniciar
3️⃣ encerrar
4️⃣ reiniciar

Envie a opção desejada.
`;
        await send(opcoes);
    }

    async handle(from: string, message: string, state: any, send: (text: string) => Promise<void>): Promise<boolean> {
        const msg = message.trim().toLowerCase();

        if (!state.etapa) state.etapa = 'aguardando_opcao';

        if (state.etapa === 'aguardando_opcao') {
            if (['1', 'status'].includes(msg)) {
                await send('Status ambiente linux protheus... \n' +
                    'Status LICENCE SERVER - /etc/init.d/totvslicense : [ OK ] : PORT: 5556 2235 8020 : PID: 550321\n' +
                    '-------------------------------------------------------------\n' +
                    'Status APP SQL LITE - /etc/init.d/totvsappsqllite : [ OK ] : PORT: 5056 46727 15056 57661 : PID: 550672\n' +
                    '-------------------------------------------------------------\n' +
                    'Status DBACCESS PRIMARIO - /etc/init.d/totvsdbaccessprimario : [ OK ] : PORT: 7890 : PID: 550721\n' +
                    '-------------------------------------------------------------\n' +
                    'Status DBACCESS SECUNDARIO - /etc/init.d/totvsdbaccesssecundario : [ OK ] : PORT: 7891 : PID: 550951\n' +
                    '-------------------------------------------------------------\n' +
                    'Status BROKER SMARTCLIENT WEB - /etc/init.d/totvsbrokerweb : [ OK ] : PORT: 38349 54171 443 : PID: 551167\n' +
                    '-------------------------------------------------------------\n' +
                    'Status BROKER CLIENT WEB STO - /etc/init.d/totvsbrokerwebsto : [ OK ] : PORT: 2443 : PID: 551206\n' +
                    '-------------------------------------------------------------\n' +
                    'Status BROKER SMARTCLIENT BETA - /etc/init.d/totvsbrokerbeta : [ OK ] : PORT: 38257 41437 3003 : PID: 2232861\n' +
                    '-------------------------------------------------------------\n' +
                    'Status APP DESENVOLVIMENTO - /etc/init.d/totvsappdesenv : [ OK ] : PORT: 56247 45325 48959 1285 3001 : PID: 551254\n' +
                    '-------------------------------------------------------------');
                return true; // fluxo concluído
            } else if (['2', 'iniciar', '3', 'encerrar', '4', 'reiniciar'].includes(msg)) {
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
        if (msg === '2' || msg === 'iniciar') return 'iniciar';
        if (msg === '3' || msg === 'encerrar') return 'encerrar';
        if (msg === '4' || msg === 'reiniciar') return 'reiniciar';
        return 'status';
    }

    private capitalize(text: string): string {
        return text.charAt(0).toUpperCase() + text.slice(1);
    }
}
