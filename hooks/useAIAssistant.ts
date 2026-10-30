import { useState, useCallback, useRef, useEffect } from 'react';
import {
    AICompletionType,
    AIEditorRequest,
    AIEditorResult,
    CompletionRequest,
    CompletionResponse,
    AIMessage
} from '@/lib/utils/ai/types';
import { getMessagesForRequest } from '@/lib/utils/ai/prompts';

export interface AIAssistantState {
    isVisible: boolean;
    isLoading: boolean;
    completionType: AICompletionType;
    customPrompt: string;
    temperature: number;
    error: Error | null;
    lastResult: AIEditorResult | null;
    apiKeyValid: boolean | null;
}

export interface UseAIAssistantOptions {
    apiKey?: string;
    model?: string;
    baseUrl?: string;
    onGenerated?: (result: AIEditorResult) => void;
}

/**
 * Custom hook for AI assistant functionality in the markdown editor
 */
export default function useAIAssistant({
                                           apiKey,
                                           model = 'copilot-zero',
                                           baseUrl = 'https://api.halesis.com/v1',
                                           onGenerated
                                       }: UseAIAssistantOptions = {}) {
    // Panel state
    const [state, setState] = useState<AIAssistantState>({
        isVisible: false,
        isLoading: false,
        completionType: AICompletionType.COMPLETE,
        customPrompt: '',
        temperature: 0.7,
        error: null,
        lastResult: null,
        apiKeyValid: apiKey ? true : null,
    });

    // API key ref
    const apiKeyRef = useRef<string | undefined>(apiKey);

    // Update key ref if provided in options
    useEffect(() => {
        if (apiKey) {
            apiKeyRef.current = apiKey;
            setState(prev => ({
                ...prev,
                apiKeyValid: true
            }));
        }
    }, [apiKey]);

    /**
     * Open the AI assistant panel
     */
    const openAssistant = useCallback((type: AICompletionType = AICompletionType.COMPLETE) => {
        setState(prev => ({
            ...prev,
            isVisible: true,
            completionType: type,
            // Reset error and result when opening
            error: null,
            lastResult: null
        }));
    }, []);

    /**
     * Close the AI assistant panel
     */
    const closeAssistant = useCallback(() => {
        setState(prev => ({
            ...prev,
            isVisible: false
        }));
    }, []);

    /**
     * Set the completion type
     */
    const setCompletionType = useCallback((type: AICompletionType) => {
        setState(prev => ({
            ...prev,
            completionType: type,
            // Reset error and result when changing type
            error: null,
            lastResult: null
        }));
    }, []);

    /**
     * Set the custom prompt
     */
    const setCustomPrompt = useCallback((prompt: string) => {
        setState(prev => ({
            ...prev,
            customPrompt: prompt
        }));
    }, []);

    /**
     * Set the temperature
     */
    const setTemperature = useCallback((temperature: number) => {
        setState(prev => ({
            ...prev,
            temperature
        }));
    }, []);

    /**
     * Set the API key
     */
    const setApiKey = useCallback(async (key: string) => {
        if (!key.trim()) {
            setState(prev => ({
                ...prev,
                apiKeyValid: false,
                error: new Error('API key cannot be empty')
            }));
            apiKeyRef.current = undefined;
            return false;
        }

        try {
            setState(prev => ({
                ...prev,
                isLoading: true,
                error: null
            }));

            apiKeyRef.current = key;

            // Test API key by making a simple request
            const isValid = await validateApiKey(key);

            setState(prev => ({
                ...prev,
                isLoading: false,
                apiKeyValid: isValid,
                error: isValid ? null : new Error('Invalid API key')
            }));

            return isValid;
        } catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                apiKeyValid: false,
                error: error instanceof Error ? error : new Error('Failed to validate API key')
            }));
            return false;
        }
    }, []);

    /**
     * Validate the API key
     */
    const validateApiKey = async (key: string): Promise<boolean> => {
        try {
            // Make a small test request to validate the key
            const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${key}`
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: 'system', content: 'You are a helpful assistant.' },
                        { role: 'user', content: 'Test' }
                    ],
                    max_tokens: 1
                })
            });

            return response.ok;
        } catch (error) {
            console.error('Error validating API key:', error);
            return false;
        }
    };

    /**
     * Create a completion request
     */
    const createCompletion = useCallback(async (
        messages: AIMessage[],
        options: {
            temperature?: number;
            max_tokens?: number;
        } = {}
    ): Promise<CompletionResponse> => {
        const key = apiKeyRef.current;

        if (!key) {
            throw new Error('API key not set');
        }

        const completionRequest: CompletionRequest = {
            model,
            messages,
            temperature: options.temperature ?? state.temperature,
            max_tokens: options.max_tokens ?? 1024
        };

        // Log outgoing request for debugging
        // console.log('AI Request:', JSON.stringify(completionRequest, null, 2));

        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify(completionRequest)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            console.error('AI API Error:', errorData);
            throw new Error(errorData?.error?.message || 'Failed to create completion');
        }

        // Parse the JSON response
        const jsonResponse = await response.json();

        // Log the response for debugging
        // console.log('AI Response:', JSON.stringify(jsonResponse, null, 2));

        return jsonResponse as CompletionResponse;
    }, [baseUrl, model, state.temperature]);

    /**
     * Generate content with the AI assistant
     */
    const generateCompletion = useCallback(async (request: AIEditorRequest): Promise<AIEditorResult | null> => {
        // Validate API key
        if (!apiKeyRef.current) {
            setState(prev => ({
                ...prev,
                error: new Error('API key not set'),
                isLoading: false
            }));
            return null;
        }

        // Validate content
        if (!request.content?.trim() && request.type !== AICompletionType.CUSTOM) {
            setState(prev => ({
                ...prev,
                error: new Error('No content provided for processing'),
                isLoading: false
            }));
            return null;
        }

        // Validate custom prompt if type is CUSTOM
        if (request.type === AICompletionType.CUSTOM && !request.customPrompt?.trim() && !state.customPrompt?.trim()) {
            setState(prev => ({
                ...prev,
                error: new Error('Please provide custom instructions'),
                isLoading: false
            }));
            return null;
        }

        try {
            setState(prev => ({
                ...prev,
                isLoading: true,
                error: null
            }));

            // Prepare final request with proper custom prompt
            const finalRequest: AIEditorRequest = {
                ...request,
                customPrompt: request.type === AICompletionType.CUSTOM
                    ? (request.customPrompt || state.customPrompt)
                    : request.customPrompt,
                options: {
                    ...request.options,
                    temperature: request.options?.temperature || state.temperature
                }
            };

            // Get formatted messages for the request
            const messages = getMessagesForRequest(finalRequest);

            // Create completion
            const response = await createCompletion(messages, finalRequest.options);

            // Extract the assistant's response
            const assistantResponse = response.messages.find(m => m.role === 'assistant');
            const generatedText = assistantResponse?.content || '';

            // Prepare result
            const result: AIEditorResult = {
                text: generatedText,
                originalRequest: finalRequest,
                usage: response.usage,
                metadata: {
                    model: response.model,
                    timestamp: Date.now()
                }
            };

            // Update state
            setState(prev => ({
                ...prev,
                isLoading: false,
                lastResult: result
            }));

            // Trigger callback
            onGenerated?.(result);

            return result;
        } catch (error) {
            console.error('Error generating completion:', error);

            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error
                    ? error
                    : new Error('Failed to generate completion')
            }));

            return null;
        }
    }, [createCompletion, onGenerated, state.customPrompt, state.temperature]);

    /**
     * Clear the last result
     */
    const clearLastResult = useCallback(() => {
        setState(prev => ({
            ...prev,
            lastResult: null,
            error: null
        }));
    }, []);

    return {
        state,
        openAssistant,
        closeAssistant,
        setCompletionType,
        setCustomPrompt,
        setTemperature,
        setApiKey,
        generateCompletion,
        clearLastResult
    };
}