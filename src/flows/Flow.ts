export interface Flow {
    name: string;

    shouldStart(message: string): boolean;

    start(from: string, message: string, state: any, send: (text: string) => Promise<void>): Promise<boolean>;

    handle(from: string, message: string, state: any, send: (text: string) => Promise<void>): Promise<boolean>;
}
