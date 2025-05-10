import { existsSync, readFileSync, writeFileSync } from 'fs';

interface HumorState {
    pontuacao: number;
    humorAtual: 'neutro' | 'puto' | 'feliz';
}

const HUMOR_FILE = './humor.json';

export class HumorManager {
    private humor: Record<string, HumorState>;

    constructor() {
        this.humor = this.load();
    }

    private load(): Record<string, HumorState> {
        if (existsSync(HUMOR_FILE)) {
            const data = readFileSync(HUMOR_FILE, 'utf-8');
            return JSON.parse(data);
        }
        return {};
    }

    save(): void {
        writeFileSync(HUMOR_FILE, JSON.stringify(this.humor, null, 2), 'utf-8');
    }

    getHumor(): Record<string, HumorState> {
        return this.humor;
    }

    setHumor(humor: Record<string, HumorState>): void {
        this.humor = humor;
        this.save();
    }
}

export class HumorUtils {
    static atualizarHumor(variacao: number): string {
        const variacaoLimitada = Math.max(-5, Math.min(5, variacao));
        return `Humor atualizado com variação ${variacaoLimitada}`;
    }
}