import { NextRequest } from 'next/server';

export const runtime = 'edge';

function sseEncode(obj: unknown) {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

export async function POST(req: NextRequest) {
  try {
    const {
      messages,
      model,
      apiKey: apiKeyFromBody,
      referer,
      title,
      imageDataUrl,
    } = await req.json();
    const apiKey = apiKeyFromBody || process.env.OPENROUTER_API_KEY;
    const usedKeyType = apiKeyFromBody
      ? 'user'
      : process.env.OPENROUTER_API_KEY
        ? 'shared'
        : 'none';
    if (!apiKey) return new Response('Missing OpenRouter API key', { status: 400 });
    if (!model) return new Response('Missing model id', { status: 400 });

    // Check if this is an image generation model - redirect to non-streaming endpoint
    const isImageGenerationModel = typeof model === 'string' && 
      /google\/gemini-2\.5-flash-image-preview/i.test(model);

    if (isImageGenerationModel) {
      // For image generation models, redirect to the non-streaming endpoint
      const response = await fetch(new URL('/api/openrouter', req.url).toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          model,
          apiKey: apiKeyFromBody,
          referer,
          title,
          imageDataUrl,
        }),
      });

      const data = await response.json();
      
      // Return as SSE stream for consistency with streaming interface
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Send the complete response as a single chunk
          if (data.text) {
            controller.enqueue(encoder.encode(sseEncode({ token: data.text })));
          }
          // Send metadata
          controller.enqueue(encoder.encode(sseEncode({ 
            meta: { 
              provider: data.provider, 
              usedKeyType: data.usedKeyType,
              isImageGeneration: data.isImageGeneration 
            } 
          })));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    type InMsg = { role?: unknown; content?: unknown };
    type OutMsg = { role: 'user' | 'assistant' | 'system'; content: string };
    const isRole = (r: unknown): r is OutMsg['role'] =>
      r === 'user' || r === 'assistant' || r === 'system';
    const sanitize = (msgs: unknown[]): OutMsg[] =>
      (Array.isArray(msgs) ? (msgs as InMsg[]) : [])
        .map((m) => {
          const role = isRole(m?.role) ? m.role : 'user';
          const content = typeof m?.content === 'string' ? m.content : String(m?.content ?? '');
          return { role, content };
        })
        .filter((m) => isRole(m.role));
    const trimmed = (arr: OutMsg[]) => (arr.length > 8 ? arr.slice(-8) : arr);
    const toUpstreamMessages = (msgs: OutMsg[]) => {
      const arr = trimmed(msgs);
      if (!imageDataUrl || !arr.length) return arr;
      const lastIdx = [...arr]
        .map((m, i) => ({ m, i }))
        .reverse()
        .find((p) => p.m.role === 'user')?.i;
      if (lastIdx == null) return arr;
      const m = arr[lastIdx];
      const [meta, base64] = String(imageDataUrl).split(',');
      const mt = /data:(.*?);base64/.exec(meta || '')?.[1] || '';
      if (/^image\//i.test(mt)) {
        const content = [
          { type: 'text', text: m.content },
          { type: 'image_url', image_url: { url: String(imageDataUrl) } },
        ];
        return arr.map((mm, idx) =>
          idx === lastIdx ? ({ role: mm.role, content } as unknown as OutMsg) : mm,
        );
      }
      if (/^text\/plain$/i.test(mt) && base64) {
        try {
          const decoded = atob(base64);
          const clipped = decoded.slice(0, 20000);
          const appended = `${m.content}\n\n[Attached text file contents:]\n${clipped}`;
          return arr.map((mm, idx) =>
            idx === lastIdx ? { role: mm.role, content: appended } : mm,
          );
        } catch {}
      }
      const noted = `${m.content}\n\n[Attached file: ${mt || 'unknown'} provided as Data URL. If your model supports reading this type via data URLs, use it.]`;
      return arr.map((mm, idx) => (idx === lastIdx ? { role: mm.role, content: noted } : mm));
    };

    const body = {
      model,
      messages: toUpstreamMessages(sanitize(messages as unknown[])),
      stream: true,
    };

    // Add fetch timeout to avoid hanging steps
    const aborter = new AbortController();
    const timeoutMs = 60000; // 60s
    const timeoutId = setTimeout(() => aborter.abort(), timeoutMs);

    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': referer || 'http://localhost',
        'X-Title': title || 'Open Source Fiesta',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: aborter.signal,
    });

    const headers = new Headers({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text().catch(() => '');
      const code = upstream.status || 500;
      const stream = new ReadableStream({
        start(controller) {
          const isGLMPaid =
            code === 402 &&
            typeof model === 'string' &&
            /z-ai\s*\/\s*glm-4\.5-air(?!:free)/i.test(model);
          const friendly402 = isGLMPaid
            ? 'The model GLM 4.5 Air is a paid model on OpenRouter. Please add your own OpenRouter API key with credit, or select the FREE pool variant "GLM 4.5 Air (FREE)".'
            : 'Provider returned 402 (payment required / insufficient credit). Add your own OpenRouter API key with credit, or pick a free model variant if available.';
          const payload =
            code === 402
              ? { error: friendly402, code, provider: 'openrouter', usedKeyType }
              : { error: errText || 'Upstream error', code, provider: 'openrouter', usedKeyType };
          controller.enqueue(new TextEncoder().encode(sseEncode(payload)));
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        },
      });
      clearTimeout(timeoutId);
      return new Response(stream, { status: 200, headers });
    }

    const reader = upstream.body.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    let buffer = '';

    // Simple sanitizer for specific models during streaming
    const sanitizeDelta = (txt: string): string => {
      if (typeof model === 'string' && /tencent\s*\/\s*hunyuan-a13b-instruct/i.test(model)) {
        return txt
          .replace(/<answer[^>]*>/gi, '')
          .replace(/<\/answer>/gi, '')
          .replace(/<(?:b|strong)>/gi, '**')
          .replace(/<\/(?:b|strong)>/gi, '**')
          .replace(/<(?:i|em)>/gi, '*')
          .replace(/<\/(?:i|em)>/gi, '*')
          .replace(/<br\s*\/?\s*>/gi, '\n')
          .replace(/<p[^>]*>/gi, '')
          .replace(/<\/p>/gi, '\n\n');
      }
      return txt;
    };

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        // Send a small meta event
        controller.enqueue(encoder.encode(sseEncode({ provider: 'openrouter', usedKeyType })));

        const push = async (): Promise<void> => {
          try {
            const { done, value } = await reader.read();
            if (done) {
              clearTimeout(timeoutId);
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              return;
            }
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n\n');
            buffer = parts.pop() || '';
            for (const part of parts) {
              const line = part.trim();
              if (!line.startsWith('data:')) continue;
              const payload = line.slice(5).trim();
              if (payload === '[DONE]') {
                clearTimeout(timeoutId);
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
                return;
              }
              try {
                const json = JSON.parse(payload);
                const delta = json?.choices?.[0]?.delta;
                let text = '';
                if (typeof delta?.content === 'string') {
                  text = delta.content;
                } else if (Array.isArray(delta?.content)) {
                  text = (delta.content as unknown[])
                    .map((c: unknown) => {
                      if (!c) return '';
                      if (typeof c === 'string') return c;
                      const obj = c as { text?: unknown; content?: unknown; value?: unknown };
                      if (typeof obj.text === 'string') return obj.text;
                      if (typeof obj.content === 'string') return obj.content;
                      if (typeof obj.value === 'string') return obj.value;
                      return '';
                    })
                    .filter(Boolean)
                    .join('');
                }
                if (text) {
                  const cleaned = sanitizeDelta(text);
                  controller.enqueue(encoder.encode(sseEncode({ delta: cleaned })));
                }
                if (json?.error) {
                  const code = json.error?.code;
                  const isGLMPaid =
                    code === 402 &&
                    typeof model === 'string' &&
                    /z-ai\s*\/\s*glm-4\.5-air(?!:free)/i.test(model);
                  const friendly402 = isGLMPaid
                    ? 'The model GLM 4.5 Air is a paid model on OpenRouter. Please add your own OpenRouter API key with credit, or select the FREE pool variant "GLM 4.5 Air (FREE)".'
                    : 'Provider returned 402 (payment required / insufficient credit). Add your own OpenRouter API key with credit, or pick a free model variant if available.';
                  const payload =
                    code === 402
                      ? { error: friendly402, code, provider: 'openrouter', usedKeyType }
                      : {
                          error: json.error?.message || 'error',
                          code,
                          provider: 'openrouter',
                          usedKeyType,
                        };
                  controller.enqueue(encoder.encode(sseEncode(payload)));
                }
              } catch {
                // ignore parse errors
              }
            }
            return push();
          } catch (err) {
            const aborted = (err as Error)?.name === 'AbortError';
            const errorMsg = aborted ? `Request timed out after ${timeoutMs}ms` : 'Stream error';
            try {
              controller.enqueue(
                encoder.encode(
                  sseEncode({
                    error: errorMsg,
                    code: aborted ? 408 : 500,
                    provider: 'openrouter',
                    usedKeyType,
                  }),
                ),
              );
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            } finally {
              clearTimeout(timeoutId);
              controller.close();
            }
          }
        };
        push();
      },
      cancel() {
        try {
          reader.cancel();
        } catch {}
        clearTimeout(timeoutId);
      },
    });

    return new Response(stream, { status: 200, headers });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return new Response(message, { status: 500 });
  }
}
