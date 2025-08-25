import { IAProvider } from './IAProvider';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { HumorManager } from "./humor";

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
    private readonly humorStates: Record<string, { pontuacao: number; humorAtual: 'neutro' | 'puto' | 'feliz' }>;
    private humorManager: HumorManager;

    constructor() {
        this.providers = new Map();
        this.providerKeys = [];
        this.currentIndex = 0;
        this.logs = this.loadLogs();
        this.humorManager = new HumorManager();
        this.humorStates = this.humorManager.getHumor();
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
    private atualizarHumor(from: string, variacao: number): void {
        if (!this.humorStates[from]) {
            this.humorStates[from] = { pontuacao: 0, humorAtual: 'neutro' };
        }

        const humorAntes = this.humorStates[from].humorAtual;
        this.humorStates[from].pontuacao += variacao;
        this.humorStates[from].pontuacao = Math.max(-5, Math.min(5, this.humorStates[from].pontuacao));

        if (this.humorStates[from].pontuacao >= 4) {
            this.humorStates[from].humorAtual = 'feliz';
        } else if (this.humorStates[from].pontuacao <= -4) {
            this.humorStates[from].humorAtual = 'puto';
        } else {
            this.humorStates[from].humorAtual = 'neutro';
        }
        const humorDepois = this.humorStates[from].humorAtual;
        if (variacao !== 0 || humorAntes !== humorDepois) {
            console.log(`[HUMOR] Antes: ${humorAntes} | Variação: ${variacao} | Depois: ${humorDepois}`);
        }
        this.humorManager.setHumor(this.humorStates);
    }

    async getResponse(userMessage: string, contexto: string | null = null, from: string): Promise<string> {
        const providerName = this.getNextProvider();
        const provider = this.providers.get(providerName);
        if (!provider) {
            throw new Error(`Provider ${providerName} not registered.`);
        }

        // Carregar o prompt baseado no humor atual
        const humorAtual = this.humorStates[from]?.humorAtual || 'neutro';
        console.log(`[HUMOR] Humor atual: ${humorAtual}`);
        const promptFile = `./prompts/prompt-${humorAtual}.txt`;
        let promptHumor = '';
        if (existsSync(promptFile)) {
            promptHumor = readFileSync(promptFile, 'utf-8');
        } else {
            console.warn(`Arquivo ${promptFile} não encontrado. Usando prompt padrão.`);
            promptHumor = `Você é Moreno AI, uma inteligência artificial desenvolvida para conversar de forma natural.`;
        }

        // Adicionar o prompt de humor ao contexto
        const contextoCompleto = `${promptHumor}\n${contexto || ''}`;
        const { resposta, variacao } = await provider.getResponse(userMessage, contextoCompleto);

        this.atualizarHumor(from, variacao);

        this.logs.push({
            mensagemRecebida: userMessage,
            contextoUtilizado: contextoCompleto,
            provedorIA: providerName,
            respostaGerada: resposta,
            timestamp: new Date().toISOString()
        });
        this.saveLogs();

        return resposta;
    }
}