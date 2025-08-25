export interface Flow {
    name: string;

    shouldStart(message: string): boolean;

    start(from: string, message: string, send: (text: string) => Promise<void>): Promise<void>;

    handle(from: string, message: string, state: any, send: (text: string) => Promise<void>): Promise<boolean>;
}
