import { callGemini, callOpenRouter, callOpenProvider, callUnstable, callMistral, callOllama, streamOpenRouter } from './client';
import { safeUUID } from './uuid';
import type { AiModel, ApiKeys, ChatMessage, ChatThread } from './types';
import type { Project } from './projects';
import { toast } from 'react-toastify';
import { addMessage as addMessageDb, updateThreadTitle } from '@/lib/db';

const abortControllers: Record<string, AbortController> = {};

function abortAll() {
  Object.values(abortControllers).forEach((controller) => {
    try {
      controller.abort();
    } catch {
      // ignore
    }
  });
  for (const key in abortControllers) {
    delete abortControllers[key];
  }
}

export type ChatDeps = {
  selectedModels: AiModel[];
  keys: ApiKeys;
  threads: ChatThread[];
  activeThread: ChatThread | null;
  setThreads: (updater: (prev: ChatThread[]) => ChatThread[]) => void;
  setActiveId: (id: string) => void;
  setLoadingIds: (updater: (prev: string[]) => string[]) => void;
  setLoadingIdsInit: (ids: string[]) => void;
  activeProject?: Project | null;
  selectedVoice?: string;
  userId?: string;
  pageType?: 'home' | 'compare';
};

type ApiTextResult = {
  text?: string;
  error?: string;
  code?: number;
  provider?: string;
  usedKeyType?: 'user' | 'shared' | 'none';
};

function extractText(res: unknown): string {
  if (res && typeof res === 'object') {
    const r = res as Partial<ApiTextResult>;
    const t = typeof r.text === 'string' ? r.text : undefined;
    const e = typeof r.error === 'string' ? r.error : undefined;
    return t || e || 'No response';
  }
  return 'No response';
}

export function createChatActions({
  selectedModels,
  keys,
  threads,
  activeThread,
  setThreads,
  setActiveId,
  setLoadingIds,
  setLoadingIdsInit,
  activeProject,
  selectedVoice,
  userId,
  pageType,
}: ChatDeps) {
  function ensureThread(): ChatThread {
    if (activeThread) return activeThread;
    const t: ChatThread = {
      id: safeUUID(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      projectId: activeProject?.id,
      pageType: pageType,
    };
    setThreads((prev) => [t, ...prev]);
    setActiveId(t.id);
    return t;
  }

  function prepareMessages(messages: ChatMessage[]): ChatMessage[] {
    // If there's an active project with a system prompt, inject it at the beginning
    if (activeProject?.systemPrompt?.trim()) {
      const systemMsg: ChatMessage = {
        role: 'system',
        content: activeProject.systemPrompt.trim(),
        ts: Date.now() - 1000000, // Ensure it's at the beginning
      };

      // Check if there's already a system message at the start
      const hasSystemMessage = messages.length > 0 && messages[0].role === 'system';

      if (hasSystemMessage) {
        // Replace the existing system message
        return [systemMsg, ...messages.slice(1)];
      } else {
        // Add system message at the beginning
        return [systemMsg, ...messages];
      }
    }

    return messages;
  }

  async function send(text: string, imageDataUrl?: string) {
    const prompt = text.trim();
    if (!prompt) return;

    abortAll();

    if (selectedModels.length === 0) {
      toast.warn('Select at least one model.', {
        style: {
          background: '#ff4d4f',
          color: '#fff',
        },
      });
    }

    const userMsg: ChatMessage = { role: 'user', content: prompt, ts: Date.now() };
    const thread = ensureThread();
    const nextHistory = [...(thread.messages ?? []), userMsg];
    const newTitle = thread.title === 'New Chat' ? prompt.slice(0, 40) : thread.title;
    setThreads((prev) =>
      prev.map((t) =>
        t.id === thread.id
          ? {
              ...t,
              title: newTitle,
              messages: nextHistory,
            }
          : t,
      ),
    );
    
    // Update thread title in database if it changed
    if (userId && thread.id && newTitle !== thread.title) {
      try {
        await updateThreadTitle(userId, thread.id, newTitle);
      } catch (e) {
        console.error('Failed to update thread title in DB:', e);
      }
    }

    // Skip internal loading - using ChatInterface loading animation instead
    // setLoadingIdsInit(selectedModels.map((m) => m.id));
    await Promise.allSettled(
      selectedModels.map(async (m) => {
        const controller = new AbortController();
        abortControllers[m.id] = controller;
        try {
          if (m.provider === 'gemini') {
            const res = await callGemini({
              apiKey: keys.gemini || undefined,
              model: m.model,
              messages: prepareMessages(nextHistory),
              imageDataUrl,
              signal: controller.signal,
            });
            const full = String(extractText(res) || '').trim();
            if (full) {
              // Add placeholder for super fast typing animation
              const placeholderTs = Date.now();
              const placeholder: ChatMessage = {
                role: 'assistant',
                content: '',
                modelId: m.id,
                ts: placeholderTs,
              };
              setThreads((prev) =>
                prev.map((t) =>
                  t.id === thread.id
                    ? { ...t, messages: [...(t.messages ?? nextHistory), placeholder] }
                    : t,
                ),
              );
              
              // Super fast typing effect with requestAnimationFrame for smooth scrolling
              let i = 0;
              const step = Math.max(2, Math.ceil(full.length / 40)); // Smaller steps for smoother animation
              let lastUpdate = 0;
              const animate = (timestamp: number) => {
                if (timestamp - lastUpdate >= 12) { // Throttle to ~83fps for smoothness
                  i = Math.min(full.length, i + step);
                  const chunk = full.slice(0, i);
                  setThreads((prev) =>
                    prev.map((t) => {
                      if (t.id !== thread.id) return t;
                      const msgs = (t.messages ?? []).map((msg) =>
                        msg.ts === placeholderTs && msg.modelId === m.id
                          ? { ...msg, content: chunk }
                          : msg,
                      );
                      return { ...t, messages: msgs };
                    }),
                  );
                  lastUpdate = timestamp;
                }
                
                if (i < full.length) {
                  requestAnimationFrame(animate);
                } else {
                  // Save to database after typing completes
                  if (userId && thread.id) {
                    const finalMsg: ChatMessage = {
                      role: 'assistant',
                      content: full,
                      modelId: m.id,
                      ts: placeholderTs,
                    };
                    addMessageDb({ userId, chatId: thread.id, message: finalMsg }).catch(e => 
                      console.error('Failed to save assistant message to DB:', e)
                    );
                  }
                }
              };
              requestAnimationFrame(animate);
            }
          } else if (m.provider === 'open-provider') {
            // No placeholder - using ChatInterface loading animation

            const res = await callOpenProvider({
              apiKey: keys['open-provider'] || undefined,
              model: m.model,
              messages: prepareMessages(nextHistory),
              imageDataUrl,
              voice: selectedVoice,
            });
            const full = String(extractText(res) || '').trim();
            if (full) {
              // Add placeholder for super fast typing animation
              const placeholderTs = Date.now();
              const placeholder: ChatMessage = {
                role: 'assistant',
                content: '',
                modelId: m.id,
                ts: placeholderTs,
              };
              setThreads((prev) =>
                prev.map((t) =>
                  t.id === thread.id
                    ? { ...t, messages: [...(t.messages ?? nextHistory), placeholder] }
                    : t,
                ),
              );
              
              // Super fast typing effect with requestAnimationFrame for smooth scrolling
              let i = 0;
              const step = Math.max(2, Math.ceil(full.length / 40)); // Smaller steps for smoother animation
              let lastUpdate = 0;
              const animate = (timestamp: number) => {
                if (timestamp - lastUpdate >= 12) { // Throttle to ~83fps for smoothness
                  i = Math.min(full.length, i + step);
                  const chunk = full.slice(0, i);
                  setThreads((prev) =>
                    prev.map((t) => {
                      if (t.id !== thread.id) return t;
                      const msgs = (t.messages ?? []).map((msg) =>
                        msg.ts === placeholderTs && msg.modelId === m.id
                          ? { ...msg, content: chunk, provider: (res as any)?.provider, usedKeyType: (res as any)?.usedKeyType, tokens: (res as any)?.tokens }
                          : msg,
                      );
                      return { ...t, messages: msgs };
                    }),
                  );
                  lastUpdate = timestamp;
                }
                
                if (i < full.length) {
                  requestAnimationFrame(animate);
                } else {
                  // Save to database after typing completes
                  if (userId && thread.id) {
                    const finalMsg: ChatMessage = {
                      role: 'assistant',
                      content: full,
                      modelId: m.id,
                      ts: placeholderTs,
                      provider: (res as any)?.provider,
                      usedKeyType: (res as any)?.usedKeyType,
                      tokens: (res as any)?.tokens,
                    };
                    addMessageDb({ userId, chatId: thread.id, message: finalMsg }).catch(e => 
                      console.error('Failed to save open-provider assistant message to DB:', e)
                    );
                  }
                }
              };
              requestAnimationFrame(animate);
            }
          } else if (m.provider === 'unstable') {
            // No placeholder - using ChatInterface loading animation

            const res = await callUnstable({
              apiKey: keys['unstable'] || undefined,
              model: m.model,
              messages: prepareMessages(nextHistory),
              imageDataUrl,
            });
            
            let content = '';
            if (res && typeof (res as { error?: unknown })?.error === 'string') {
              content = String((res as { error: unknown }).error).trim();
            } else {
              content = String(extractText(res) || '').trim() || 'No response';
            }
            
            if (content) {
              // Add placeholder for super fast typing animation
              const placeholderTs = Date.now();
              const placeholder: ChatMessage = {
                role: 'assistant',
                content: '',
                modelId: m.id,
                ts: placeholderTs,
              };
              setThreads((prev) =>
                prev.map((t) =>
                  t.id === thread.id
                    ? { ...t, messages: [...(t.messages ?? nextHistory), placeholder] }
                    : t,
                ),
              );
              
              // Super fast typing effect with requestAnimationFrame for smooth scrolling
              let i = 0;
              const step = Math.max(2, Math.ceil(content.length / 40)); // Smaller steps for smoother animation
              let lastUpdate = 0;
              const animate = (timestamp: number) => {
                if (timestamp - lastUpdate >= 12) { // Throttle to ~83fps for smoothness
                  i = Math.min(content.length, i + step);
                  const chunk = content.slice(0, i);
                  setThreads((prev) =>
                    prev.map((t) => {
                      if (t.id !== thread.id) return t;
                      const msgs = (t.messages ?? []).map((msg) =>
                        msg.ts === placeholderTs && msg.modelId === m.id
                          ? { ...msg, content: chunk }
                          : msg,
                      );
                      return { ...t, messages: msgs };
                    }),
                  );
                  lastUpdate = timestamp;
                }
                
                if (i < content.length) {
                  requestAnimationFrame(animate);
                } else {
                  // Save to database after typing completes
                  if (userId && thread.id) {
                    const finalMsg: ChatMessage = {
                      role: 'assistant',
                      content,
                      modelId: m.id,
                      ts: placeholderTs,
                    };
                    addMessageDb({ userId, chatId: thread.id, message: finalMsg }).catch(e => 
                      console.error('Failed to save unstable assistant message to DB:', e)
                    );
                  }
                }
              };
              requestAnimationFrame(animate);
            } else {
              // Add response directly without typewriter effect
              const assistantMsg: ChatMessage = {
                role: 'assistant',
                content,
                modelId: m.id,
                ts: Date.now(),
                provider: (res as any)?.provider,
                usedKeyType: (res as any)?.usedKeyType,
                tokens: (res as any)?.tokens,
                code: (res as any)?.code,
              };
              setThreads((prev) =>
                prev.map((t) =>
                  t.id === thread.id
                    ? { ...t, messages: [...(t.messages ?? nextHistory), assistantMsg] }
                    : t,
                ),
              );
              
              // Save to database
              if (userId && thread.id) {
                try {
                  await addMessageDb({
                    userId,
                    chatId: thread.id,
                    message: assistantMsg,
                  });
                } catch (e) {
                  console.error('Failed to save unstable assistant message to DB:', e);
                }
              }
            }
          } else if (m.provider === 'mistral') {
            // No placeholder - using ChatInterface loading animation

            const res = await callMistral({ apiKey: keys['mistral'] || undefined, model: m.model, messages: prepareMessages(nextHistory), imageDataUrl });
            const full = String(extractText(res) || '').trim() || 'No response';
            if (full) {
              // Add placeholder for super fast typing animation
              const placeholderTs = Date.now();
              const placeholder: ChatMessage = {
                role: 'assistant',
                content: '',
                modelId: m.id,
                ts: placeholderTs,
              };
              setThreads((prev) =>
                prev.map((t) =>
                  t.id === thread.id
                    ? { ...t, messages: [...(t.messages ?? nextHistory), placeholder] }
                    : t,
                ),
              );
              
              // Super fast typing effect with requestAnimationFrame for smooth scrolling
              let i = 0;
              const step = Math.max(2, Math.ceil(full.length / 40)); // Smaller steps for smoother animation
              let lastUpdate = 0;
              const animate = (timestamp: number) => {
                if (timestamp - lastUpdate >= 12) { // Throttle to ~83fps for smoothness
                  i = Math.min(full.length, i + step);
                  const chunk = full.slice(0, i);
                  setThreads((prev) =>
                    prev.map((t) => {
                      if (t.id !== thread.id) return t;
                      const msgs = (t.messages ?? []).map((msg) =>
                        msg.ts === placeholderTs && msg.modelId === m.id
                          ? { ...msg, content: chunk }
                          : msg,
                      );
                      return { ...t, messages: msgs };
                    }),
                  );
                  lastUpdate = timestamp;
                }
                
                if (i < full.length) {
                  requestAnimationFrame(animate);
                } else {
                  // Save to database after typing completes
                  if (userId && thread.id) {
                    const finalMsg: ChatMessage = {
                      role: 'assistant',
                      content: full,
                      modelId: m.id,
                      ts: placeholderTs,
                    };
                    addMessageDb({ userId, chatId: thread.id, message: finalMsg }).catch(e => 
                      console.error('Failed to save mistral assistant message to DB:', e)
                    );
                  }
                }
              };
              requestAnimationFrame(animate);
            } else {
              // Add response directly without typewriter effect
              const assistantMsg: ChatMessage = {
                role: 'assistant',
                content: full,
                modelId: m.id,
                ts: Date.now(),
                provider: (res as any)?.provider,
                usedKeyType: (res as any)?.usedKeyType,
                tokens: (res as any)?.tokens,
              };
              setThreads((prev) =>
                prev.map((t) =>
                  t.id === thread.id
                    ? { ...t, messages: [...(t.messages ?? nextHistory), assistantMsg] }
                    : t,
                ),
              );
              
              // Save to database
              if (userId && thread.id) {
                try {
                  await addMessageDb({
                    userId,
                    chatId: thread.id,
                    message: assistantMsg,
                  });
                } catch (e) {
                  console.error('Failed to save mistral assistant message to DB:', e);
                }
              }
            }
          } else if (m.provider === 'ollama') {
            // No placeholder - using ChatInterface loading animation

            const res = await callOllama({ baseUrl: keys['ollama'] || undefined, model: m.model, messages: prepareMessages(nextHistory), signal: controller.signal });
            const full = String(extractText(res) || '').trim() || 'No response';
            if (full) {
              // Add placeholder for super fast typing animation
              const placeholderTs = Date.now();
              const placeholder: ChatMessage = {
                role: 'assistant',
                content: '',
                modelId: m.id,
                ts: placeholderTs,
              };
              setThreads((prev) =>
                prev.map((t) =>
                  t.id === thread.id
                    ? { ...t, messages: [...(t.messages ?? nextHistory), placeholder] }
                    : t,
                ),
              );
              
              // Super fast typing effect with requestAnimationFrame for smooth scrolling
              let i = 0;
              const step = Math.max(2, Math.ceil(full.length / 40)); // Smaller steps for smoother animation
              let lastUpdate = 0;
              const animate = (timestamp: number) => {
                if (timestamp - lastUpdate >= 12) { // Throttle to ~83fps for smoothness
                  i = Math.min(full.length, i + step);
                  const chunk = full.slice(0, i);
                  setThreads((prev) =>
                    prev.map((t) => {
                      if (t.id !== thread.id) return t;
                      const msgs = (t.messages ?? []).map((msg) =>
                        msg.ts === placeholderTs && msg.modelId === m.id
                          ? { ...msg, content: chunk }
                          : msg,
                      );
                      return { ...t, messages: msgs };
                    }),
                  );
                  lastUpdate = timestamp;
                }
                
                if (i < full.length) {
                  requestAnimationFrame(animate);
                } else {
                  // Save to database after typing completes
                  if (userId && thread.id) {
                    const finalMsg: ChatMessage = {
                      role: 'assistant',
                      content: full,
                      modelId: m.id,
                      ts: placeholderTs,
                    };
                    addMessageDb({ userId, chatId: thread.id, message: finalMsg }).catch(e => 
                      console.error('Failed to save ollama assistant message to DB:', e)
                    );
                  }
                }
              };
              requestAnimationFrame(animate);
            } else {
              // Add response directly without typewriter effect
              const assistantMsg: ChatMessage = {
                role: 'assistant',
                content: full,
                modelId: m.id,
                ts: Date.now(),
                provider: (res as any)?.provider,
                usedKeyType: (res as any)?.usedKeyType,
                tokens: (res as any)?.tokens,
              };
              setThreads((prev) =>
                prev.map((t) =>
                  t.id === thread.id
                    ? { ...t, messages: [...(t.messages ?? nextHistory), assistantMsg] }
                    : t,
                ),
              );
              
              // Save to database
              if (userId && thread.id) {
                try {
                  await addMessageDb({
                    userId,
                    chatId: thread.id,
                    message: assistantMsg,
                  });
                } catch (e) {
                  console.error('Failed to save ollama assistant message to DB:', e);
                }
              }
            }
          } else {
            // No placeholder - using ChatInterface loading animation

            let buffer = '';
            let flushTimer: number | null = null;
            let gotAny = false;
            const flush = () => {
              if (!buffer) return;
              const chunk = buffer;
              buffer = '';
              // Skip updating placeholder - using ChatInterface loading animation instead
            };
            const mt =
              typeof imageDataUrl === 'string'
                ? /^data:(.*?);base64/.exec(imageDataUrl)?.[1] || ''
                : '';
            const isImage = !!mt && /^image\//i.test(mt);
            // Treat attachments with missing/unknown MIME type as non-image to force non-stream (server-side extraction)
            const isNonImageAttachment = !!imageDataUrl && (!mt || !isImage); // txt/pdf/docx or unknown

            if (isNonImageAttachment) {
              const res = await callOpenRouter({
                apiKey: keys.openrouter || undefined,
                model: m.model,
                messages: prepareMessages(nextHistory),
                imageDataUrl,
                signal: controller.signal,
              });
              const full = String(extractText(res) || '').trim();
              if (full) {
                // Add placeholder for super fast typing animation
                const placeholderTs = Date.now();
                const placeholder: ChatMessage = {
                  role: 'assistant',
                  content: '',
                  modelId: m.id,
                  ts: placeholderTs,
                };
                setThreads((prev) =>
                  prev.map((t) =>
                    t.id === thread.id
                      ? { ...t, messages: [...(t.messages ?? nextHistory), placeholder] }
                      : t,
                  ),
                );
                
                // Super fast typing effect with requestAnimationFrame for smooth scrolling
                let i = 0;
                const step = Math.max(2, Math.ceil(full.length / 40)); // Smaller steps for smoother animation
                let lastUpdate = 0;
                const animate = (timestamp: number) => {
                  if (timestamp - lastUpdate >= 12) { // Throttle to ~83fps for smoothness
                    i = Math.min(full.length, i + step);
                    const chunk = full.slice(0, i);
                    setThreads((prev) =>
                      prev.map((t) => {
                        if (t.id !== thread.id) return t;
                        const msgs = (t.messages ?? []).map((msg) =>
                          msg.ts === placeholderTs && msg.modelId === m.id
                            ? { ...msg, content: chunk }
                            : msg,
                        );
                        return { ...t, messages: msgs };
                      }),
                    );
                    lastUpdate = timestamp;
                  }
                  
                  if (i < full.length) {
                    requestAnimationFrame(animate);
                  } else {
                    // Save to database after typing completes
                    if (userId && thread.id) {
                      const finalMsg: ChatMessage = {
                        role: 'assistant',
                        content: full,
                        modelId: m.id,
                        ts: placeholderTs,
                      };
                      addMessageDb({ userId, chatId: thread.id, message: finalMsg }).catch(e => 
                        console.error('Failed to save openrouter assistant message to DB:', e)
                      );
                    }
                  }
                };
                requestAnimationFrame(animate);
              }
              return;
            }

            await streamOpenRouter(
              {
                apiKey: keys.openrouter || undefined,
                model: m.model,
                messages: prepareMessages(nextHistory),
                imageDataUrl,
                signal: controller.signal,
              },
              {
                onToken: (delta) => {
                  gotAny = true;
                  buffer += delta;
                  // Skip token-by-token updates - using ChatInterface loading animation instead
                },
                onMeta: (meta) => {
                  // Skip meta updates - using ChatInterface loading animation instead
                },
                onError: (err) => {
                  // Skip error updates - using ChatInterface loading animation instead
                },
                onDone: async () => {
                  if (flushTimer != null) {
                    window.clearTimeout(flushTimer);
                    flushTimer = null;
                  }
                  
                  // Add placeholder for super fast typing animation
                  const fullResponse = buffer.trim();
                  if (fullResponse) {
                    const placeholderTs = Date.now();
                    const placeholder: ChatMessage = {
                      role: 'assistant',
                      content: '',
                      modelId: m.id,
                      ts: placeholderTs,
                    };
                    setThreads((prev) =>
                      prev.map((t) =>
                        t.id === thread.id
                          ? { ...t, messages: [...(t.messages ?? nextHistory), placeholder] }
                          : t,
                      ),
                    );
                    
                    // Super fast typing effect with requestAnimationFrame for smooth scrolling
                    let i = 0;
                    const step = Math.max(2, Math.ceil(fullResponse.length / 40)); // Smaller steps for smoother animation
                    let lastUpdate = 0;
                    const animate = (timestamp: number) => {
                      if (timestamp - lastUpdate >= 12) { // Throttle to ~83fps for smoothness
                        i = Math.min(fullResponse.length, i + step);
                        const chunk = fullResponse.slice(0, i);
                        setThreads((prev) =>
                          prev.map((t) => {
                            if (t.id !== thread.id) return t;
                            const msgs = (t.messages ?? []).map((msg) =>
                              msg.ts === placeholderTs && msg.modelId === m.id
                                ? { ...msg, content: chunk }
                                : msg,
                            );
                            return { ...t, messages: msgs };
                          }),
                        );
                        lastUpdate = timestamp;
                      }
                      
                      if (i < fullResponse.length) {
                        requestAnimationFrame(animate);
                      } else {
                        // Save to database after typing completes
                        if (userId && thread.id) {
                          const finalMsg: ChatMessage = {
                            role: 'assistant',
                            content: fullResponse,
                            modelId: m.id,
                            ts: placeholderTs,
                          };
                          addMessageDb({ userId, chatId: thread.id, message: finalMsg }).catch(e => 
                            console.error('Failed to save openrouter assistant message to DB:', e)
                          );
                        }
                      }
                    };
                    requestAnimationFrame(animate);
                  }
                  
                  if (!gotAny) {
                    try {
                      const res = await callOpenRouter({
                        apiKey: keys.openrouter || undefined,
                        model: m.model,
                        messages: nextHistory,
                        imageDataUrl,
                        signal: controller.signal,
                      });
                      const text = extractText(res);
                      if (text && text.trim()) {
                        const assistantMsg: ChatMessage = {
                          role: 'assistant',
                          content: String(text).trim(),
                          modelId: m.id,
                          ts: Date.now(),
                        };
                        setThreads((prev) =>
                          prev.map((t) =>
                            t.id === thread.id
                              ? { ...t, messages: [...(t.messages ?? nextHistory), assistantMsg] }
                              : t,
                          ),
                        );
                        
                        // Save to database
                        if (userId && thread.id) {
                          try {
                            await addMessageDb({
                              userId,
                              chatId: thread.id,
                              message: assistantMsg,
                            });
                          } catch (e) {
                            console.error('Failed to save assistant message to DB:', e);
                          }
                        }
                      }
                    } catch {}
                  }
                },
              },
            );
          }
        } finally {
          delete abortControllers[m.id];
          // Skip internal loading - using ChatInterface loading animation instead
          // setLoadingIds((prev) => prev.filter((x) => x !== m.id));
        }
      }),
    );
  }

  function onEditUser(turnIndex: number, newText: string) {
    if (!activeThread) return;
    const t = threads.find((tt) => tt.id === activeThread.id);
    if (!t) return;
    const original = [...(t.messages ?? [])];

    abortAll();

    let userCount = -1;
    let userIdx = -1;
    for (let i = 0; i < original.length; i++) {
      if (original[i].role === 'user') {
        userCount += 1;
        if (userCount === turnIndex) {
          userIdx = i;
          break;
        }
      }
    }
    if (userIdx < 0) return;

    const updated: ChatMessage[] = [...original];
    updated[userIdx] = { ...updated[userIdx], content: newText };
    let j = userIdx + 1;
    while (j < updated.length && updated[j].role !== 'user') j++;
    updated.splice(userIdx + 1, j - (userIdx + 1));

    const placeholders: { model: AiModel; ts: number }[] = [];
    const inserts: ChatMessage[] = [];
    for (const m of selectedModels) {
      const ts = Date.now() + Math.floor(Math.random() * 1000);
      placeholders.push({ model: m, ts });
      inserts.push({ role: 'assistant', content: '', modelId: m.id, ts });
    }
    updated.splice(userIdx + 1, 0, ...inserts);

    const newTitle =
      t.title === 'New Chat' ||
      t.title === ((t.messages?.[0]?.content as string | undefined)?.slice?.(0, 40) ?? t.title)
        ? (updated.find((mm) => mm.role === 'user')?.content ?? 'New Chat').slice(0, 40)
        : t.title;
    setThreads((prev) =>
      prev.map((tt) => (tt.id === t.id ? { ...tt, messages: updated, title: newTitle } : tt)),
    );

    const baseHistory = updated.slice(0, userIdx + 1);

    // Skip internal loading - using ChatInterface loading animation instead
    // setLoadingIdsInit(selectedModels.map(m => m.id));
    Promise.allSettled(selectedModels.map(async (m) => {
      const controller = new AbortController();
      abortControllers[m.id] = controller;
      const ph = placeholders.find(p => p.model.id === m.id);
      if (!ph) { 
        // Skip internal loading - using ChatInterface loading animation instead
        // setLoadingIds(prev => prev.filter(x => x !== m.id)); 
        return; 
      }
      const placeholderTs = ph.ts;
      try {
        if (m.provider === 'gemini') {
          const res = await callGemini({ apiKey: keys.gemini || undefined, model: m.model, messages: baseHistory, signal: controller.signal });
          const full = String(extractText(res) || '').trim();
          if (!full) {
            setThreads(prev => prev.map(tt => {
              if (tt.id !== t.id) return tt;
              const msgs = (tt.messages ?? []).map(msg => (msg.ts === placeholderTs && msg.modelId === m.id) ? { ...msg, content: 'No response' } : msg);
              return { ...tt, messages: msgs };
            }));
          } else {
            // typewriter effect
            let i = 0;
            const step = Math.max(2, Math.ceil(full.length / 80));
            const timer = window.setInterval(() => {
              i = Math.min(full.length, i + step);
              const chunk = full.slice(0, i);
              setThreads(prev => prev.map(tt => {
                if (tt.id !== t.id) return tt;
                const msgs = (tt.messages ?? []).map(msg => (msg.ts === placeholderTs && msg.modelId === m.id) ? { ...msg, content: chunk } : msg);
                return { ...tt, messages: msgs };
              }));
              if (i >= full.length) window.clearInterval(timer);
            }, 24);
          }
        } else if (m.provider === 'open-provider') {
          const res = await callOpenProvider({ apiKey: keys['open-provider'] || undefined, model: m.model, messages: baseHistory, voice: selectedVoice });
          const full = String(extractText(res) || '').trim();
          if (!full) {
            setThreads(prev => prev.map(tt => {
              if (tt.id !== t.id) return tt;
              const msgs = (tt.messages ?? []).map(msg => (msg.ts === placeholderTs && msg.modelId === m.id)
                ? { ...msg, content: 'No response', provider: (res as { provider?: string; usedKeyType?: 'user' | 'shared' | 'none'; tokens?: object; code?: number; error?: string })?.provider, usedKeyType: (res as { provider?: string; usedKeyType?: 'user' | 'shared' | 'none'; tokens?: object; code?: number; error?: string })?.usedKeyType, tokens: (res as { provider?: string; usedKeyType?: 'user' | 'shared' | 'none'; tokens?: object; code?: number; error?: string })?.tokens } as ChatMessage
                : msg);
              return { ...tt, messages: msgs };
            }));
          } else {
            // typewriter effect for all models (image models already have markdown in the response)
            let i = 0;
            const step = Math.max(2, Math.ceil(full.length / 80));
            const timer = window.setInterval(() => {
              i = Math.min(full.length, i + step);
              const chunk = full.slice(0, i);
              setThreads(prev => prev.map(tt => {
                if (tt.id !== t.id) return tt;
                const msgs = (tt.messages ?? []).map(msg => (msg.ts === placeholderTs && msg.modelId === m.id) ? { ...msg, content: chunk } : msg);
                return { ...tt, messages: msgs };
              }));
              if (i >= full.length) {
                window.clearInterval(timer);
                // attach provider meta and token info once complete
                setThreads(prev => prev.map(tt => {
                  if (tt.id !== t.id) return tt;
                  const msgs = (tt.messages ?? []).map(msg => (msg.ts === placeholderTs && msg.modelId === m.id)
                    ? { ...msg, provider: (res as { provider?: string; usedKeyType?: 'user' | 'shared' | 'none'; tokens?: object; code?: number; error?: string })?.provider, usedKeyType: (res as { provider?: string; usedKeyType?: 'user' | 'shared' | 'none'; tokens?: object; code?: number; error?: string })?.usedKeyType, tokens: (res as { provider?: string; usedKeyType?: 'user' | 'shared' | 'none'; tokens?: object; code?: number; error?: string })?.tokens } as ChatMessage
                    : msg);
                  return { ...tt, messages: msgs };
                }));
                
                // Save final message to database
                if (userId && t.id) {
                  const finalMsg: ChatMessage = {
                    role: 'assistant',
                    content: full,
                    modelId: m.id,
                    ts: placeholderTs,
                  };
                  addMessageDb({ userId, chatId: t.id, message: finalMsg }).catch(e => 
                    console.error('Failed to save assistant message to DB:', e)
                  );
                }
              }
            }, 24);
          }
        } else if (m.provider === 'unstable') {
          const res = await callUnstable({ apiKey: keys['unstable'] || undefined, model: m.model, messages: baseHistory });
          if (res && typeof (res as { error?: unknown })?.error === 'string') {
            const errText = String((res as { error: unknown }).error).trim();
            setThreads(prev => prev.map(tt => {
              if (tt.id !== t.id) return tt;
              const msgs = (tt.messages ?? []).map(msg => (msg.ts === placeholderTs && msg.modelId === m.id)
                ? { ...msg, content: errText, provider: (res as { provider?: string; usedKeyType?: 'user' | 'shared' | 'none'; tokens?: object; code?: number; error?: string })?.provider, usedKeyType: (res as { provider?: string; usedKeyType?: 'user' | 'shared' | 'none'; tokens?: object; code?: number; error?: string })?.usedKeyType, code: (res as { provider?: string; usedKeyType?: 'user' | 'shared' | 'none'; tokens?: object; code?: number; error?: string })?.code } as ChatMessage
                : msg);
              return { ...tt, messages: msgs };
            }));
            return;
          }
          const full = String(extractText(res) || '').trim();
          if (!full) {
            setThreads(prev => prev.map(tt => {
              if (tt.id !== t.id) return tt;
              const msgs = (tt.messages ?? []).map(msg => (msg.ts === placeholderTs && msg.modelId === m.id)
                ? { ...msg, content: 'No response', provider: (res as { provider?: string; usedKeyType?: 'user' | 'shared' | 'none'; tokens?: object; code?: number; error?: string })?.provider, usedKeyType: (res as { provider?: string; usedKeyType?: 'user' | 'shared' | 'none'; tokens?: object; code?: number; error?: string })?.usedKeyType, tokens: (res as { provider?: string; usedKeyType?: 'user' | 'shared' | 'none'; tokens?: object; code?: number; error?: string })?.tokens } as ChatMessage
                : msg);
              return { ...tt, messages: msgs };
            }));
          } else {
            // typewriter effect for unstable models
            let i = 0;
            const step = Math.max(2, Math.ceil(full.length / 80));
            const timer = window.setInterval(() => {
              i = Math.min(full.length, i + step);
              const chunk = full.slice(0, i);
              setThreads(prev => prev.map(tt => {
                if (tt.id !== t.id) return tt;
                const msgs = (tt.messages ?? []).map(msg => (msg.ts === placeholderTs && msg.modelId === m.id) ? { ...msg, content: chunk } : msg);
                return { ...tt, messages: msgs };
              }));
              if (i >= full.length) {
                window.clearInterval(timer);
                // attach provider meta and token info once complete
                setThreads(prev => prev.map(tt => {
                  if (tt.id !== t.id) return tt;
                  const msgs = (tt.messages ?? []).map(msg => (msg.ts === placeholderTs && msg.modelId === m.id)
                    ? { ...msg, provider: (res as { provider?: string; usedKeyType?: 'user' | 'shared' | 'none'; tokens?: object; code?: number; error?: string })?.provider, usedKeyType: (res as { provider?: string; usedKeyType?: 'user' | 'shared' | 'none'; tokens?: object; code?: number; error?: string })?.usedKeyType, tokens: (res as { provider?: string; usedKeyType?: 'user' | 'shared' | 'none'; tokens?: object; code?: number; error?: string })?.tokens } as ChatMessage
                    : msg);
                  return { ...tt, messages: msgs };
                }));
              }
            }, 24);
          }
        } else if (m.provider === 'mistral') {
          const res = await callMistral({ apiKey: keys['mistral'] || undefined, model: m.model, messages: baseHistory });
          const full = String(extractText(res) || '').trim();
          if (!full) {
            setThreads(prev => prev.map(tt => {
              if (tt.id !== t.id) return tt;
              const msgs = (tt.messages ?? []).map(msg => (msg.ts === placeholderTs && msg.modelId === m.id)
                ? { ...msg, content: 'No response', provider: (res as { provider?: string; usedKeyType?: 'user' | 'shared' | 'none'; tokens?: object; code?: number; error?: string })?.provider, usedKeyType: (res as { provider?: string; usedKeyType?: 'user' | 'shared' | 'none'; tokens?: object; code?: number; error?: string })?.usedKeyType, tokens: (res as { provider?: string; usedKeyType?: 'user' | 'shared' | 'none'; tokens?: object; code?: number; error?: string })?.tokens } as ChatMessage
                : msg);
              return { ...tt, messages: msgs };
            }));
          } else {
            // typewriter effect for mistral models
            let i = 0;
            const step = Math.max(2, Math.ceil(full.length / 80));
            const timer = window.setInterval(() => {
              i = Math.min(full.length, i + step);
              const chunk = full.slice(0, i);
              setThreads(prev => prev.map(tt => {
                if (tt.id !== t.id) return tt;
                const msgs = (tt.messages ?? []).map(msg => (msg.ts === placeholderTs && msg.modelId === m.id) ? { ...msg, content: chunk } : msg);
                return { ...tt, messages: msgs };
              }));
              if (i >= full.length) {
                window.clearInterval(timer);
                // attach provider meta and token info once complete
                setThreads(prev => prev.map(tt => {
                  if (tt.id !== t.id) return tt;
                  const msgs = (tt.messages ?? []).map(msg => (msg.ts === placeholderTs && msg.modelId === m.id)
                    ? { ...msg, provider: (res as { provider?: string; usedKeyType?: 'user' | 'shared' | 'none'; tokens?: object; code?: number; error?: string })?.provider, usedKeyType: (res as { provider?: string; usedKeyType?: 'user' | 'shared' | 'none'; tokens?: object; code?: number; error?: string })?.usedKeyType, tokens: (res as { provider?: string; usedKeyType?: 'user' | 'shared' | 'none'; tokens?: object; code?: number; error?: string })?.tokens } as ChatMessage
                    : msg);
                  return { ...tt, messages: msgs };
                }));
              }
            }, 24);
          }
        } else if (m.provider === 'ollama') {
          const res = await callOllama({ baseUrl: keys['ollama'] || undefined, model: m.model, messages: baseHistory });
          const full = String(extractText(res) || '').trim();
          // Check for empty response or literal "No response"
          if (!full || full === 'No response') {
            setThreads(prev => prev.map(tt => {
              if (tt.id !== t.id) return tt;
              const msgs = (tt.messages ?? []).map(msg => (msg.ts === placeholderTs && msg.modelId === m.id)
                ? { ...msg, content: 'No response', provider: (res as { provider?: string; usedKeyType?: 'user' | 'shared' | 'none'; tokens?: object; code?: number; error?: string })?.provider, usedKeyType: (res as { provider?: string; usedKeyType?: 'user' | 'shared' | 'none'; tokens?: object; code?: number; error?: string })?.usedKeyType, tokens: (res as { provider?: string; usedKeyType?: 'user' | 'shared' | 'none'; tokens?: object; code?: number; error?: string })?.tokens } as ChatMessage
                : msg);
              return { ...tt, messages: msgs };
            }));
          } else {
            // typewriter effect for ollama models
            let i = 0;
            const step = Math.max(2, Math.ceil(full.length / 80));
            const timer = window.setInterval(() => {
              i = Math.min(full.length, i + step);
              const chunk = full.slice(0, i);
              setThreads(prev => prev.map(tt => {
                if (tt.id !== t.id) return tt;
                const msgs = (tt.messages ?? []).map(msg => (msg.ts === placeholderTs && msg.modelId === m.id) ? { ...msg, content: chunk } : msg);
                return { ...tt, messages: msgs };
              }));
              if (i >= full.length) {
                window.clearInterval(timer);
                // attach provider meta and token info once complete
                setThreads(prev => prev.map(tt => {
                  if (tt.id !== t.id) return tt;
                  const msgs = (tt.messages ?? []).map(msg => (msg.ts === placeholderTs && msg.modelId === m.id)
                    ? { ...msg, provider: (res as { provider?: string; usedKeyType?: 'user' | 'shared' | 'none'; tokens?: object; code?: number; error?: string })?.provider, usedKeyType: (res as { provider?: string; usedKeyType?: 'user' | 'shared' | 'none'; tokens?: object; code?: number; error?: string })?.usedKeyType, tokens: (res as { provider?: string; usedKeyType?: 'user' | 'shared' | 'none'; tokens?: object; code?: number; error?: string })?.tokens } as ChatMessage
                    : msg);
                  return { ...tt, messages: msgs };
                }));
              }
            }, 24);
          }
        } else {
          let buffer = '';
          let flushTimer: number | null = null;
          let gotAny = false;
          const flush = () => {
            if (!buffer) return;
            const chunk = buffer; buffer = '';
            setThreads(prev => prev.map(tt => {
              if (tt.id !== t.id) return tt;
              const msgs = (tt.messages ?? []).map(msg => {
                if (!(msg.ts === placeholderTs && msg.modelId === m.id)) return msg;
                const cur = msg.content || '';
                const next = cur === 'Thinking…' ? chunk : cur + chunk;
                return { ...msg, content: next };
              });
              return { ...tt, messages: msgs };
            }));
          };
          await streamOpenRouter({ apiKey: keys.openrouter || undefined, model: m.model, messages: baseHistory, signal: controller.signal }, {
            onToken: (delta) => {
              gotAny = true;
              buffer += delta;
              if (flushTimer == null) flushTimer = window.setTimeout(() => { flushTimer = null; flush(); }, 24);
            },
            onMeta: (meta) => {
              setThreads(prev => prev.map(tt => {
                if (tt.id !== t.id) return tt;
                const msgs = (tt.messages ?? []).map(msg => (msg.ts === placeholderTs && msg.modelId === m.id) ? { ...msg, provider: meta.provider, usedKeyType: meta.usedKeyType } as ChatMessage : msg);
                return { ...tt, messages: msgs };
              }));
            },
            onError: (err) => {
              if (flushTimer != null) { window.clearTimeout(flushTimer); flushTimer = null; }
              const text = err.error || 'Error';
              setThreads(prev => prev.map(tt => {
                if (tt.id !== t.id) return tt;
                const msgs = (tt.messages ?? []).map(msg => (msg.ts === placeholderTs && msg.modelId === m.id) ? { ...msg, content: text, code: err.code, provider: err.provider, usedKeyType: err.usedKeyType } as ChatMessage : msg);
                return { ...tt, messages: msgs };
              }));
            },
            onDone: async () => {
              if (flushTimer != null) { window.clearTimeout(flushTimer); flushTimer = null; }
              flush();
              if (!gotAny) {
                try {
                  const res = await callOpenRouter({ apiKey: keys.openrouter || undefined, model: m.model, messages: baseHistory, signal: controller.signal });
                  const text = extractText(res);
                  setThreads(prev => prev.map(tt => {
                    if (tt.id !== t.id) return tt;
                    const msgs = (tt.messages ?? []).map(msg => (msg.ts === placeholderTs && msg.modelId === m.id) ? { ...msg, content: String(text).trim() } : msg);
                    return { ...tt, messages: msgs };
                  }));
                } catch {}
              }
            }
          });
        }
        } finally {
          delete abortControllers[m.id];
          // Skip internal loading - using ChatInterface loading animation instead
          // setLoadingIds(prev => prev.filter(x => x !== m.id));
        }
    }));
  }

  function onDeleteUser(turnIndex: number) {
    if (!activeThread) return;
    const t = threads.find(tt => tt.id === activeThread.id);
    if (!t) return;
    const original = [...(t.messages ?? [])];

    abortAll();

    let userCount = -1;
    let userIdx = -1;
    for (let i = 0; i < original.length; i++) {
      if (original[i].role === 'user') {
        userCount += 1;
        if (userCount === turnIndex) { userIdx = i; break; }
      }
    }
    if (userIdx < 0) return;

    const updated: ChatMessage[] = [...original];
    // Find the next user message to determine deletion range
    let j = userIdx + 1;
    while (j < updated.length && updated[j].role !== 'user') j++;
    // Remove the user message and all assistant responses until the next user message
    updated.splice(userIdx, j - userIdx);

    setThreads(prev => prev.map(tt => tt.id === t.id ? { ...tt, messages: updated } : tt));
  }

  function onDeleteAnswer(turnIndex: number, modelId: string) {
    if (!activeThread) return;
    const t = threads.find(tt => tt.id === activeThread.id);
    if (!t) return;
    const original = [...(t.messages ?? [])];

    abortAll();

    let userCount = -1;
    let userIdx = -1;
    for (let i = 0; i < original.length; i++) {
      if (original[i].role === 'user') {
        userCount += 1;
        if (userCount === turnIndex) { userIdx = i; break; }
      }
    }
    if (userIdx < 0) return;

    // Find the assistant message with the specific modelId after this user message
    const updated: ChatMessage[] = [...original];
    for (let i = userIdx + 1; i < updated.length; i++) {
      if (updated[i].role === 'user') break; // Stop at next user message
      if (updated[i].role === 'assistant' && updated[i].modelId === modelId) {
        updated.splice(i, 1);
        break;
      }
    }

    setThreads(prev => prev.map(tt => tt.id === t.id ? { ...tt, messages: updated } : tt));
  }

  return { send, onEditUser, onDeleteUser, onDeleteAnswer };
}