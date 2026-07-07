import { create } from 'zustand';
import { uid } from '@/lib/utils';
import { generateWorld } from '@/lib/worldgen';
import { applyCommands } from '@/services/commands';
import { loadLocal, saveLocal } from '@/services/db';
import { interpretLocally } from '@/services/local-intent';
import {
  buildSystemPrompt,
  checkOllama,
  parseSceneCommands,
  streamChat,
  stripCommandBlocks,
} from '@/services/ollama';
import { useProjectStore } from '@/stores/project-store';
import { useUIStore } from '@/stores/ui-store';
import type { ChatMessage, OllamaStatus, SavedPrompt } from '@/types/chat';

interface ChatStore {
  projectKey: string | null;
  messages: ChatMessage[];
  status: OllamaStatus;
  availableModels: string[];
  sending: boolean;
  history: string[];
  saved: SavedPrompt[];
  abortController: AbortController | null;

  loadFor: (projectId: string) => void;
  checkStatus: () => Promise<OllamaStatus>;
  send: (prompt: string) => Promise<void>;
  stop: () => void;
  clear: () => void;
  toggleFavorite: (text: string) => void;
  removeSaved: (id: string) => void;
}

const persistMessages = (projectKey: string | null, messages: ChatMessage[]) => {
  if (projectKey) saveLocal(`chat:${projectKey}`, messages.slice(-80));
};

export const useChatStore = create<ChatStore>()((set, get) => ({
  projectKey: null,
  messages: [],
  status: 'unknown',
  availableModels: [],
  sending: false,
  history: loadLocal<string[]>('prompt-history', []),
  saved: loadLocal<SavedPrompt[]>('saved-prompts', []),
  abortController: null,

  loadFor: (projectId) => {
    if (get().projectKey === projectId) return;
    set({
      projectKey: projectId,
      messages: loadLocal<ChatMessage[]>(`chat:${projectId}`, []),
    });
  },

  checkStatus: async () => {
    const { ollamaUrl, ollamaModel } = useUIStore.getState();
    const { status, models } = await checkOllama({ url: ollamaUrl, model: ollamaModel });
    set({ status, availableModels: models });
    return status;
  },

  send: async (prompt) => {
    const text = prompt.trim();
    if (!text || get().sending) return;

    const history = [text, ...get().history.filter((h) => h !== text)].slice(0, 60);
    saveLocal('prompt-history', history);

    const userMsg: ChatMessage = { id: uid('m'), role: 'user', content: text, at: Date.now() };
    const draft: ChatMessage = {
      id: uid('m'),
      role: 'assistant',
      content: '',
      at: Date.now(),
      streaming: true,
    };
    set((s) => ({ messages: [...s.messages, userMsg, draft], sending: true, history }));

    const finish = (patch: Partial<ChatMessage>) => {
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === draft.id ? { ...m, ...patch, streaming: false } : m,
        ),
        sending: false,
        abortController: null,
      }));
      persistMessages(get().projectKey, get().messages);
    };

    let status = get().status;
    if (status === 'unknown') status = await get().checkStatus();

    const world = useProjectStore.getState().world;

    if (status !== 'online') {
      // Offline interpreter — the app still responds and edits the scene.
      const { reply, commands } = interpretLocally(text, world);
      const result = commands.length > 0 ? applyCommands(commands) : { applied: [], note: undefined };
      const content =
        result.note && reply
          ? `${reply}\n\n${result.note}`
          : (result.note ?? (reply || 'Done.'));
      finish({ content, applied: result.applied, offline: true });
      return;
    }

    try {
      const system = buildSystemPrompt(world, generateWorld(world));
      const controller = new AbortController();
      set({ abortController: controller });
      const { ollamaUrl, ollamaModel } = useUIStore.getState();
      const full = await streamChat({
        config: { url: ollamaUrl, model: ollamaModel },
        system,
        messages: get().messages.filter((m) => !m.streaming && m.role !== 'system'),
        signal: controller.signal,
        onToken: (sofar) => {
          const visible = stripCommandBlocks(sofar) || '…';
          set((s) => ({
            messages: s.messages.map((m) => (m.id === draft.id ? { ...m, content: visible } : m)),
          }));
        },
      });

      const commands = parseSceneCommands(full);
      const result = commands.length > 0 ? applyCommands(commands) : { applied: [], note: undefined };
      let content = stripCommandBlocks(full);
      if (result.note) content = content ? `${content}\n\n${result.note}` : result.note;
      finish({ content: content || 'Done.', applied: result.applied });
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        finish({ content: get().messages.find((m) => m.id === draft.id)?.content ?? '(stopped)' });
        return;
      }
      // Model call failed mid-flight — degrade gracefully to the offline path.
      const { reply, commands } = interpretLocally(text, world);
      const result = commands.length > 0 ? applyCommands(commands) : { applied: [], note: undefined };
      set({ status: 'offline' });
      finish({
        content: result.note ?? (reply || `Ollama request failed: ${String(err)}`),
        applied: result.applied,
        offline: true,
      });
    }
  },

  stop: () => {
    get().abortController?.abort();
  },

  clear: () => {
    set({ messages: [] });
    persistMessages(get().projectKey, []);
  },

  toggleFavorite: (text) => {
    const saved = [...get().saved];
    const existing = saved.find((s) => s.text === text);
    if (existing) {
      existing.favorite = !existing.favorite;
    } else {
      saved.unshift({ id: uid('sp'), text, favorite: true, usedAt: Date.now(), uses: 1 });
    }
    const next = saved.filter((s) => s.favorite).slice(0, 40);
    set({ saved: next });
    saveLocal('saved-prompts', next);
  },

  removeSaved: (id) => {
    const next = get().saved.filter((s) => s.id !== id);
    set({ saved: next });
    saveLocal('saved-prompts', next);
  },
}));
