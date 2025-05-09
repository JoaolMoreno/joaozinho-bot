import { IAProvider } from './IAProvider';
import { writeFileSync, existsSync, readFileSync } from 'fs';

interface IAInteractionLog {
    mensagemRecebida: string;
    contextoUtilizado: string | null;
    provedorIA: string;
    respostaGerada: string;
    timestamp: string;
}

const LOG_FILE = './ia_interactions_log.json';

export class IAService {
    private providers: Map<string, IAProvider>;
    private providerKeys: string[];
    private currentIndex: number;
    private readonly logs: IAInteractionLog[];

    constructor() {
        this.providers = new Map();
        this.providerKeys = [];
        this.currentIndex = 0;
        this.logs = this.loadLogs();
    }

    registerProvider(name: string, provider: IAProvider): void {
        this.providers.set(name, provider);
        this.providerKeys = Array.from(this.providers.keys());
    }

    private getNextProvider(): string {
        if (this.providerKeys.length === 0) {
            throw new Error('No providers registered.');
        }
        const providerName = this.providerKeys[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.providerKeys.length;
        return providerName;
    }

    private saveLogs(): void {
        console.log('Saving logs to file...');
        writeFileSync(LOG_FILE, JSON.stringify(this.logs, null, 2), 'utf-8');
    }

    private loadLogs(): IAInteractionLog[] {
        if (existsSync(LOG_FILE)) {
            const data = readFileSync(LOG_FILE, 'utf-8');
            return JSON.parse(data);
        }
        return [];
    }

    async getResponse(userMessage: string, contexto: string | null = null): Promise<string> {
        const providerName = this.getNextProvider();
        const provider = this.providers.get(providerName);
        if (!provider) {
            throw new Error(`Provider ${providerName} not registered.`);
        }
        const resposta = await provider.getResponse(userMessage, contexto);


        this.logs.push({
            mensagemRecebida: userMessage,
            contextoUtilizado: contexto,
            provedorIA: providerName,
            respostaGerada: resposta,
            timestamp: new Date().toISOString()
        });
        this.saveLogs();

        return resposta;
    }
}