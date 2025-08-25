import { Flow } from '../flows/Flow';

interface ActiveFlow {
    flow: Flow;
    state: any;
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

    async handleMessage(conversationId: string, message: string, send: (text: string) => Promise<void>) {
        const active = this.getActiveFlow(conversationId);

        if (active) {
            const finished = await active.flow.handle(conversationId, message, active.state, send);
            if (finished) this.clearActiveFlow(conversationId);
            return;
        }

        for (const flow of this.flows) {
            if (flow.shouldStart(message)) {
                const state = {};
                this.activeFlows[conversationId] = { flow, state };
                await flow.start(conversationId, message, send);
                return;
            }
        }

        // Nenhum fluxo aceitou, ignorar ou enviar mensagem padrão.
    }
}
