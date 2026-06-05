export interface Message {
    id?: number;
    message: string;
    isFromAi: boolean;
    timestamp: Date | string;
    isOcrAnalysis?: boolean;
}
