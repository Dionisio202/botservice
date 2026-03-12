export interface IBotEngine {
    processIncomingMessage(
        phone:          string,
        text:           string,
        buttonPayload?: string
    ): Promise<void>;
}