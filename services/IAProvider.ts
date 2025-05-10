export interface IAProvider {
    getResponse(userMessage: string, contexto: string | null): Promise<{ resposta: string, variacao: number }>;
}