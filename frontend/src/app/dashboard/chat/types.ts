export interface Message {
    id?: number;
    message: string;
    isFromAi: boolean;
    timestamp: Date | string;
    isOcrAnalysis?: boolean;
    // True while an AI reply is still being streamed token-by-token. Used to
    // suppress doctor suggestions / reminder action / disclaimer until complete.
    streaming?: boolean;
}
