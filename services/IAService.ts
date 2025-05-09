import { IAProvider } from './IAProvider';

export class IAService {
    private providers: Map<string, IAProvider>;
    private providerKeys: string[];
    private currentIndex: number;

    constructor() {
        this.providers = new Map();
        this.providerKeys = [];
        this.currentIndex = 0;
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

    async getResponse(userMessage: string, contexto: string | null = null): Promise<string> {
        const providerName = this.getNextProvider();
        const provider = this.providers.get(providerName);
        if (!provider) {
            throw new Error(`Provider ${providerName} not registered.`);
        }
        return provider.getResponse(userMessage, contexto);
    }
}