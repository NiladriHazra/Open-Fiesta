import { NextRequest } from 'next/server';
import type { Readable } from 'node:stream';
export const runtime = 'nodejs';
// Lazy require to avoid bundling when not used
let pdfParse:
  | ((data: Buffer | Uint8Array | ArrayBuffer | Readable) => Promise<{ text: string }>)
  | null = null;
let mammoth: { extractRawText: (arg: { buffer: Buffer }) => Promise<{ value: string }> } | null =
  null;

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
    if (!apiKey)
      return new Response(JSON.stringify({ error: 'Missing OpenRouter API key' }), { status: 400 });
    if (!model) return new Response(JSON.stringify({ error: 'Missing model id' }), { status: 400 });

    // Define types first
    type InMsg = { role?: unknown; content?: unknown };
    type OutMsg = { role: 'user' | 'assistant' | 'system'; content: string };

    // Check if this is an image generation model
    const isImageGenerationModel =
      typeof model === 'string' && /google\/gemini-2\.5-flash-image-preview/i.test(model);

    // Handle image generation models differently
    if (isImageGenerationModel) {
      // Extract the last user message as the prompt for image generation
      const sanitizedMessages = (Array.isArray(messages) ? messages : [])
        .map((m: InMsg) => ({
          role:
            m?.role === 'user' || m?.role === 'assistant' || m?.role === 'system' ? m.role : 'user',
          content: typeof m?.content === 'string' ? m.content : String(m?.content ?? ''),
        }))
        .filter((m: { role: string; content: string }) => m.role && m.content);

      const lastUserMessage = sanitizedMessages
        .filter((msg: { role: string; content: string }) => msg.role === 'user')
        .pop();
      const prompt = lastUserMessage ? lastUserMessage.content : 'A beautiful image';

      // For image generation, we'll make the API call and return the response as markdown image
      // The actual image generation will be handled by the OpenRouter API
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': referer || 'https://localhost:3000',
            'X-Title': title || 'AI Chat',
          },
          body: JSON.stringify({
            model,
            messages: sanitizedMessages,
            max_tokens: 4000,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
          return Response.json({
            text: `Image generation failed: ${errorMessage}`,
            error: errorMessage,
            code: response.status,
            provider: 'openrouter',
            usedKeyType,
          });
        }

        const data = await response.json();
        const choice = data?.choices?.[0];
        const content = choice?.message?.content;

        if (typeof content === 'string') {
          // Check if the response contains an image URL or if we need to generate one
          const imageUrlMatch = content.match(/https?:\/\/[^\s)]+\.(jpg|jpeg|png|gif|webp)/i);

          if (imageUrlMatch) {
            // If there's already an image URL in the response, use it
            const imageUrl = imageUrlMatch[0];
            const text = `![Generated Image](${imageUrl})`;
            return Response.json({
              text,
              imageUrl,
              provider: 'openrouter',
              usedKeyType,
              isImageGeneration: true,
            });
          } else {
            // For Gemini image preview model, generate an image using the user's prompt
            const encodedPrompt = encodeURIComponent(prompt);
            const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&model=flux&nologo=true&enhance=true`;
            const text = `![Generated Image](${imageUrl})`;

            return Response.json({
              text,
              imageUrl,
              provider: 'openrouter',
              usedKeyType,
              isImageGeneration: true,
            });
          }
        } else {
          return Response.json({
            text: 'No image generated',
            provider: 'openrouter',
            usedKeyType,
            isImageGeneration: true,
          });
        }
      } catch (error) {
        return Response.json({
          text: `Image generation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error: error instanceof Error ? error.message : 'Unknown error',
          code: 500,
          provider: 'openrouter',
          usedKeyType,
        });
      }
    }

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
    // Keep last 8 messages to avoid overly long histories for picky providers
    const trimmed = (arr: OutMsg[]) => (arr.length > 8 ? arr.slice(-8) : arr);
    const toUpstreamMessages = async (msgs: OutMsg[]) => {
      const arr = trimmed(msgs);
      if (!imageDataUrl || !arr.length) return arr;
      // Try to attach to the last user message
      const lastIdx = [...arr]
        .map((m, i) => ({ m, i }))
        .reverse()
        .find((p) => p.m.role === 'user')?.i;
      if (lastIdx == null) return arr;
      const m = arr[lastIdx];
      const [meta, base64] = String(imageDataUrl).split(',');
      const mt = /data:(.*?);base64/.exec(meta || '')?.[1] || '';
      let buf: Buffer | null = null;
      if (base64) {
        try {
          buf = Buffer.from(base64, 'base64');
        } catch {
          buf = null;
        }
      }
      // If MIME is missing/unknown, detect by magic bytes
      let detectedMt = mt;
      if (
        (!detectedMt || /application\/octet-stream/i.test(detectedMt)) &&
        buf &&
        buf.length >= 4
      ) {
        const b0 = buf[0],
          b1 = buf[1];
        const ascii5 = buf.slice(0, 5).toString('ascii');
        if (ascii5.startsWith('%PDF-')) {
          detectedMt = 'application/pdf';
        } else if (b0 === 0x50 && b1 === 0x4b) {
          // 'PK' ZIP header, likely DOCX
          detectedMt = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        }
      }

      if (/^image\//i.test(detectedMt)) {
        const content = [
          { type: 'text', text: m.content },
          { type: 'image_url', image_url: { url: String(imageDataUrl) } },
        ];
        return arr.map((mm, idx) =>
          idx === lastIdx ? ({ role: mm.role, content } as unknown as OutMsg) : mm,
        );
      }
      // text/plain: decode and append inline (limit)
      if (/^text\/plain$/i.test(detectedMt) && base64) {
        try {
          const decoded = (buf ?? Buffer.from(base64, 'base64')).toString('utf8').slice(0, 20000);
          const appended = `${m.content}\n\n[Attached text file contents:]\n${decoded}`;
          return arr.map((mm, idx) =>
            idx === lastIdx ? { role: mm.role, content: appended } : mm,
          );
        } catch {}
      }
      // PDF: extract text using pdf-parse
      if (/^application\/pdf$/i.test(detectedMt) && base64 && (buf?.length ?? 0) > 0) {
        try {
          if (!pdfParse) {
            type PdfParseFn = (
              data: Buffer | Uint8Array | ArrayBuffer | Readable,
            ) => Promise<{ text: string }>;
            type PdfParseModule = { default?: PdfParseFn } | PdfParseFn;
            const mod = (await import('pdf-parse')) as PdfParseModule;
            const fn: PdfParseFn =
              typeof mod === 'function' ? (mod as PdfParseFn) : (mod.default as PdfParseFn);
            pdfParse = fn;
          }
          const out = await pdfParse!(buf!);
          const text = (out?.text || '').trim().slice(0, 80000);
          const appended = `${m.content}\n\n[Attached PDF extracted text:]\n${
            text || '(no extractable text)'
          }\n`;
          return arr.map((mm, idx) =>
            idx === lastIdx ? { role: mm.role, content: appended } : mm,
          );
        } catch {
          const appended = `${m.content}\n\n[Attached PDF could not be auto-extracted. Please copy/paste key text if needed.]`;
          return arr.map((mm, idx) =>
            idx === lastIdx ? { role: mm.role, content: appended } : mm,
          );
        }
      }
      // DOCX: extract text using mammoth
      if (
        /^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$/i.test(
          detectedMt,
        ) &&
        base64 &&
        (buf?.length ?? 0) > 0
      ) {
        try {
          if (!mammoth) {
            const mod = (await import('mammoth')) as {
              default?: {
                extractRawText: (arg: { buffer: Buffer }) => Promise<{ value: string }>;
              };
              extractRawText?: (arg: { buffer: Buffer }) => Promise<{ value: string }>;
            };
            mammoth = mod.default ?? { extractRawText: mod.extractRawText! };
          }
          const out = await mammoth!.extractRawText({ buffer: buf! });
          const text = (out?.value || '').trim().slice(0, 80000);
          const appended = `${m.content}\n\n[Attached DOCX extracted text:]\n${
            text || '(no extractable text)'
          }\n`;
          return arr.map((mm, idx) =>
            idx === lastIdx ? { role: mm.role, content: appended } : mm,
          );
        } catch {
          const appended = `${m.content}\n\n[Attached DOCX could not be auto-extracted. Please copy/paste key text if needed.]`;
          return arr.map((mm, idx) =>
            idx === lastIdx ? { role: mm.role, content: appended } : mm,
          );
        }
      }
      // Other types (pdf/docx): include a short note so assistant is aware
      const noted = `${m.content}\n\n[Attached file: ${detectedMt || 'unknown'} provided as Data URL. If your model supports reading this type via data URLs, use it.]`;
      return arr.map((mm, idx) => (idx === lastIdx ? { role: mm.role, content: noted } : mm));
    };

    const makeBody = async (msgs: unknown) => ({
      model,
      messages: await toUpstreamMessages(sanitize((msgs as unknown[]) || [])),
    });
    const requestInit = (bodyObj: unknown): RequestInit => ({
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': referer || 'http://localhost',
        'X-Title': title || 'Open Source Fiesta',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyObj),
    });

    // Build body first (may include extraction work for PDFs/DOCX)
    const firstBody = await makeBody(messages);
    // Now start timeout so extraction time doesn't count toward it
    const timeoutMs = 120000; // 120s to allow for larger prompts
    let aborter = new AbortController();
    const timeoutId = setTimeout(() => aborter.abort(), timeoutMs);
    let resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      ...requestInit(firstBody),
      signal: aborter.signal,
    });

    let data: unknown = await resp.json();
    if (!resp.ok) {
      const errStr = (() => {
        const d = data as
          | { error?: { message?: unknown } }
          | Record<string, unknown>
          | string
          | null
          | undefined;
        if (typeof d === 'string') return d;
        if (d && typeof d === 'object') {
          const maybeErr = (d as { error?: { message?: unknown } }).error;
          if (maybeErr && typeof maybeErr === 'object' && 'message' in maybeErr) {
            const m = (maybeErr as { message?: unknown }).message;
            return typeof m === 'string' ? m : JSON.stringify(m);
          }
          try {
            return JSON.stringify(d);
          } catch {
            return 'Unknown error';
          }
        }
        return 'Unknown error';
      })();
      if (resp.status === 429) {
        const text =
          usedKeyType === 'user'
            ? 'Your OpenRouter API key hit a rate limit. Please retry after a moment or upgrade your plan/limits.'
            : 'This model hit a shared rate limit. Add your own OpenRouter API key for FREE in Settings for higher limits and reliability.';
        clearTimeout(timeoutId);
        return Response.json({
          text,
          error: errStr,
          code: 429,
          provider: 'openrouter',
          usedKeyType,
        });
      }
      if (resp.status === 404 && /model not found/i.test(errStr)) {
        const text =
          'This model is currently unavailable on OpenRouter (404 model not found). It may be renamed, private, or the free pool is paused. Try again later or pick another model.';
        clearTimeout(timeoutId);
        return Response.json(
          { text, code: 404, provider: 'openrouter', usedKeyType },
          { status: 404 },
        );
      }
      if (resp.status === 402) {
        // Payment required / no credit. Provide clearer guidance.
        const isGLMPaid =
          typeof model === 'string' && /z-ai\s*\/\s*glm-4\.5-air(?!:free)/i.test(model);
        const text = isGLMPaid
          ? 'The model GLM 4.5 Air is a paid model on OpenRouter. Please add your own OpenRouter API key with credit, or select the FREE pool variant "GLM 4.5 Air (FREE)".'
          : 'Provider returned 402 (payment required / insufficient credit). Add your own OpenRouter API key with credit, or pick a free model variant if available.';
        clearTimeout(timeoutId);
        return Response.json(
          { text, code: 402, provider: 'openrouter', usedKeyType },
          { status: 402 },
        );
      }
      // Special-case retry for Sarvam: try with only the last user message
      if (typeof model === 'string' && /sarvam/i.test(model)) {
        const lastUser = Array.isArray(messages)
          ? [...messages]
              .reverse()
              .find((m) => (m as InMsg)?.role === 'user' && (m as InMsg)?.content !== undefined)
          : null;
        if (lastUser) {
          const cont = (lastUser as InMsg).content;
          const contentVal: string = typeof cont === 'string' ? cont : String(cont);
          const simpleMsgs: OutMsg[] = [{ role: 'user', content: contentVal }];
          // fresh controller + timer for retry
          clearTimeout(timeoutId);
          aborter = new AbortController();
          const retryTimeoutId = setTimeout(() => aborter.abort(), timeoutMs);
          try {
            resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              ...requestInit(await makeBody(simpleMsgs)),
              signal: aborter.signal,
            });
          } finally {
            clearTimeout(retryTimeoutId);
          }
          data = await resp.json();
          if (resp.ok) {
            // continue to normalization below using new data
          } else {
            const friendly2 = `Provider returned error for ${model} (after retry) [status ${resp.status}]`;
            clearTimeout(timeoutId);
            return Response.json(
              { text: friendly2, code: resp.status, provider: 'openrouter', usedKeyType },
              { status: resp.status },
            );
          }
        } else {
          const friendly = `Provider returned error for ${model} [status ${resp.status}]`;
          clearTimeout(timeoutId);
          return Response.json(
            { text: friendly, code: resp.status, provider: 'openrouter', usedKeyType },
            { status: resp.status },
          );
        }
      } else {
        // Return structured JSON but also a user-friendly text to render in UI
        const friendly = `Provider returned error${model ? ` for ${model}` : ''} [status ${resp.status}]`;
        clearTimeout(timeoutId);
        return Response.json(
          { text: friendly, code: resp.status, provider: 'openrouter', usedKeyType },
          { status: resp.status },
        );
      }
    }

    // Normalize content to a plain string
    const choice =
      (data as { choices?: Array<{ message?: { content?: unknown } }> } | null)?.choices?.[0] || {};
    const msg = (choice as { message?: { content?: unknown } } | null)?.message || {};
    const content: unknown = (msg as { content?: unknown } | null)?.content;
    let text = '';
    if (typeof content === 'string') {
      text = content;
    } else if (Array.isArray(content)) {
      // Array of content blocks (e.g., {type:'text', text:'...'}, {type:'reasoning', ...})
      text = content
        .map((c) => {
          if (!c) return '';
          if (typeof c === 'string') return c;
          const obj = c as { text?: unknown; content?: unknown; value?: unknown };
          if (typeof obj.text === 'string') return obj.text;
          if (typeof obj.content === 'string') return obj.content;
          if (typeof obj.value === 'string') return obj.value;
          return '';
        })
        .filter(Boolean)
        .join('\n');
    } else if (content && typeof content === 'object') {
      // Some providers nest text inside content.text
      if (typeof (content as { text?: unknown }).text === 'string') {
        text = String((content as { text?: unknown }).text);
      } else {
        try {
          text = JSON.stringify(content);
        } catch {
          text = '';
        }
      }
    }

    // DeepSeek-style reasoning tags often include <think> ... </think>
    const stripReasoning = (s: string) =>
      s
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/<\|?thought_(start|end)\|>/gi, '')
        .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
        .trim();

    // Convert common Markdown to plain text (headers, lists, emphasis, links, code fences)
    const mdToPlain = (s: string) =>
      s
        // code fences and inline code
        .replace(/```[\s\S]*?```/g, (m) => m.replace(/```/g, ''))
        .replace(/`([^`]+)`/g, '$1')
        // headings ###, ##, #
        .replace(/^\s{0,3}#{1,6}\s+/gm, '')
        // list markers -, *, +, numbers
        .replace(/^\s{0,3}[-*+]\s+/gm, '• ')
        .replace(/^\s{0,3}\d+\.\s+/gm, (m) => m.replace(/\d+\./, (n) => `${n.replace('.', '')}. `))
        // bold/italic
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/_([^_]+)_/g, '$1')
        // links [text](url)
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
        // blockquotes
        .replace(/^>\s?/gm, '')
        // horizontal rules
        .replace(/^\s{0,3}([-*_])\s?\1\s?\1.*$/gm, '')
        // excess whitespace
        .replace(/\s+$/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    if (!text) {
      // Additional fallbacks seen across some providers
      const alt =
        (choice as { content?: unknown }).content ||
        (msg as { response_text?: unknown }).response_text ||
        (msg as { result?: unknown }).result ||
        (data as Record<string, unknown> | null | undefined)?.['output_text'];
      if (typeof alt === 'string') text = alt;
      else if (Array.isArray(alt)) {
        text = alt
          .map((c) => {
            if (typeof c === 'string') return c;
            const obj = c as { text?: unknown; content?: unknown };
            if (typeof obj.text === 'string') return obj.text;
            if (typeof obj.content === 'string') return obj.content;
            return '';
          })
          .filter(Boolean)
          .join('\n');
      }
    }

    if (text) {
      const stripped = stripReasoning(text);
      text = stripped || text; // avoid stripping to empty
      // For DeepSeek R1, return plain text (no Markdown) to improve readability
      if (typeof model === 'string' && /deepseek\s*\/\s*deepseek-r1/i.test(model)) {
        text = mdToPlain(text);
      }
      // For Tencent Hunyuan A13B Instruct, providers often wrap in <answer>...</answer> or simple HTML-like tags.
      if (typeof model === 'string' && /tencent\s*\/\s*hunyuan-a13b-instruct/i.test(model)) {
        const between = /<answer[^>]*>([\s\S]*?)<\/answer>/i.exec(text);
        let t = between ? between[1] : text;
        t = t
          .replace(/<(?:b|strong)>/gi, '**')
          .replace(/<\/(?:b|strong)>/gi, '**')
          .replace(/<(?:i|em)>/gi, '*')
          .replace(/<\/(?:i|em)>/gi, '*')
          .replace(/<br\s*\/?\s*>/gi, '\n')
          .replace(/<p[^>]*>/gi, '')
          .replace(/<\/p>/gi, '\n\n')
          // drop any remaining simple tags
          .replace(/<[^>]+>/g, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        text = t || text;
      }
    }

    if (!text) {
      text = 'No response from provider.';
    }

    clearTimeout(timeoutId);
    return Response.json({ text, raw: data });
  } catch (e: unknown) {
    const isAbort = e instanceof Error && e.name === 'AbortError';
    const message = isAbort
      ? 'Request timed out'
      : e instanceof Error
        ? e.message
        : 'Unknown error';
    const code = isAbort ? 408 : 500;
    return new Response(JSON.stringify({ error: message, code }), { status: code });
  }
}
