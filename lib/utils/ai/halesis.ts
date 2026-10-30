/**
 * AI Client — supports Halesis cloud and any OpenAI-compatible endpoint.
 *
 * Response handling: Halesis returns { messages: [...] }; standard OpenAI
 * returns { choices: [{ message: {...} }] }. Both are normalised here.
 */

import { AIError, AIMessage, AIModel, CompletionRequest, CompletionResponse } from './types';

export interface HalesisConfig {
    apiKey: string;
    baseUrl?: string;
    defaultModel?: string;
}

const HALESIS_BASE = 'https://api.halesis.com/v1';

export class HalesisClient {
    private config: HalesisConfig;

    constructor(config: HalesisConfig) {
        this.config = {
            baseUrl: HALESIS_BASE,
            defaultModel: 'copilot-zero',
            ...config,
        };
    }

    async getModels(): Promise<AIModel[]> {
        const res = await fetch(`${this.config.baseUrl}/models`, {
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json',
            },
        });

        if (!res.ok) {
            const err = await res.text().catch(() => '');
            throw new AIError('Failed to fetch models', res.status, err);
        }

        return res.json();
    }

    async createCompletion(request: Partial<CompletionRequest>): Promise<CompletionResponse> {
        const body: CompletionRequest = {
            model: request.model || this.config.defaultModel || 'copilot-zero',
            messages: request.messages || [],
            temperature: request.temperature ?? 0.7,
            max_tokens: request.max_tokens ?? 1024,
        };

        const res = await fetch(`${this.config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`,
                'User-Agent': 'Changerawr/1.0',
            },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const err = await res.text().catch(() => '');
            let parsed;
            try { parsed = JSON.parse(err); } catch { parsed = { message: err }; }
            throw new AIError('Failed to create completion', res.status, parsed);
        }

        const data = await res.json();

        // Normalise: Halesis → { messages: [...] }, OpenAI → { choices: [...] }
        if (data.messages && Array.isArray(data.messages)) {
            return data as CompletionResponse;
        }

        if (data.choices && Array.isArray(data.choices)) {
            const content: string = data.choices[0]?.message?.content ?? '';
            return {
                ...data,
                messages: [{ role: 'assistant' as const, content }],
            } as CompletionResponse;
        }

        throw new AIError('Unrecognised response format from AI service', 500, data);
    }

    async generateText(prompt: string, options: Partial<CompletionRequest> = {}): Promise<string> {
        const messages: AIMessage[] = [{ role: 'user', content: prompt }];
        const completion = await this.createCompletion({ ...options, messages });
        const assistant = completion.messages.find(m => m.role === 'assistant');
        if (!assistant) throw new AIError('No assistant response', 500, completion);
        return assistant.content || '';
    }

    async validateApiKey(): Promise<boolean> {
        try {
            await this.getModels();
            return true;
        } catch {
            return false;
        }
    }
}

export function createHalesisClient(config: HalesisConfig): HalesisClient {
    return new HalesisClient(config);
}

/** Generic alias — use when the endpoint may not be Halesis. */
export const createAIClient = createHalesisClient;
