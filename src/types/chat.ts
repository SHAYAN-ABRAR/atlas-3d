export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  at: number;
  /** True while tokens are still streaming in. */
  streaming?: boolean;
  /** Names of scene commands that were applied from this message. */
  applied?: string[];
  /** True when produced by the offline interpreter rather than the model. */
  offline?: boolean;
}

export type OllamaStatus = 'unknown' | 'online' | 'offline' | 'model-missing';

export interface SavedPrompt {
  id: string;
  text: string;
  favorite: boolean;
  usedAt: number;
  uses: number;
}

export interface PromptTemplate {
  category: string;
  label: string;
  text: string;
}
