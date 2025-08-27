import { Flow } from '../flows/Flow';

interface ActiveFlow {
    flow: Flow;
    state: any;
    userId: string;
}

export class FlowManager {
    private flows: Flow[] = [];
    private activeFlows: Record<string, ActiveFlow> = {};

    registerFlow(flow: Flow) {
        this.flows.push(flow);
    }

    getActiveFlow(conversationId: string): ActiveFlow | undefined {
        return this.activeFlows[conversationId];
    }

    clearActiveFlow(conversationId: string) {
        delete this.activeFlows[conversationId];
    }

    async handleMessage(conversationId: string, message: string, senderId: string, send: (text: string) => Promise<void>) {
        const active = this.getActiveFlow(conversationId);

        if (active) {
            // Apenas o usuário que iniciou o fluxo pode continuar
            if (active.userId !== senderId) return;
            const finished = await active.flow.handle(conversationId, message, active.state, send);
            if (finished) this.clearActiveFlow(conversationId);
            return;
        }


        const prefix = message.trim().split(/\s+/)[0].toLowerCase();
        for (const flow of this.flows) {
            if (flow.shouldStart(prefix)) {
                const state = {};
                this.activeFlows[conversationId] = { flow, state, userId: senderId };
                const finished = await flow.start(conversationId, message, state, async (reply) => {
                    await send(reply);
                });
                if (finished) this.clearActiveFlow(conversationId);
                return;
            }
        }
        // Nenhum fluxo aceitou, ignorar ou enviar mensagem padrão.
    }
}
