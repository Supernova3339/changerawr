import { NextRequest, NextResponse } from 'next/server';
import { validateAuthAndGetUser } from '@/lib/utils/changelog';
import { db } from '@/lib/db';
import { resolveTaggerConfig } from '@/lib/services/ai/tagger-detect';

const HALESIS_BASE = 'https://api.halesis.com/v1';

/**
 * POST /api/ai/suggest-tags
 * Priority: changelog-tagger → Halesis/custom AI → 503
 *
 * Body: { content: string, tags: string[] }
 * When using changelog-tagger, tags may be empty — the tagger falls back to its own 19-tag set.
 */
export async function POST(request: NextRequest) {
  try {
    await validateAuthAndGetUser();

    const { content, tags: availableTagNames } = await request.json();

    if (!content || typeof content !== 'string' || content.trim().length < 10) {
      return NextResponse.json({ error: 'Content too short' }, { status: 400 });
    }
    if (!Array.isArray(availableTagNames)) {
      return NextResponse.json({ error: 'tags must be an array' }, { status: 400 });
    }

    const config = await db.systemConfig.findUnique({
      where: { id: 1 },
      select: {
        changelogTaggerUrl: true,
        changelogTaggerApiKey: true,
        enableAIAssistant: true,
        aiApiKey: true,
        aiApiUrl: true,
        aiDefaultModel: true,
      },
    });

    // --- Priority 1: changelog-tagger (explicit config, or auto-detected sidecar) ---
    const tagger = await resolveTaggerConfig({
      changelogTaggerUrl: config?.changelogTaggerUrl ?? null,
      changelogTaggerApiKey: config?.changelogTaggerApiKey ?? null,
    });

    if (tagger) {
      const base = tagger.url.replace(/\/$/, '');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      if (tagger.apiKey) {
        headers['Authorization'] = `Bearer ${tagger.apiKey}`;
      }

      // The tagger frees its model to fit training in memory, so while
      // training is running /api/v1/tag will always 503 — check first and
      // return immediately instead of making the caller wait out a request
      // that's guaranteed to fail. 5s, not 3s — a container mid-training can
      // be slow to answer even its own lightweight health check.
      try {
        const healthRes = await fetch(`${base}/health`, { signal: AbortSignal.timeout(5_000) });
        if (healthRes.ok) {
          const health = await healthRes.json();
          if (health.training) {
            return NextResponse.json(
              { error: 'Tagger is currently training and temporarily unavailable — try again in a moment.', training: true },
              { status: 503 }
            );
          }
        }
      } catch { /* health check itself failing isn't fatal — fall through to the real request */ }

      // Always pass project tags so the tagger scores against them.
      // If no project tags exist yet, omit the field — tagger falls back to its built-in 19-tag set.
      const body: Record<string, unknown> = { content: content.trim(), threshold: 0.025, include_evidence: true };
      if (availableTagNames.length > 0) body.tags = availableTagNames;

      let res: Response;
      try {
        // Generous — this is a background request from the user's
        // perspective (the UI shows a "generating…" state and just waits),
        // so there's little upside to failing fast here. A slow-but-working
        // response should get the chance to actually finish.
        res = await fetch(`${base}/api/v1/tag`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(45_000),
        });
      } catch (err) {
        // The health check above missed it (itself timed out, or training
        // started in the gap between the two calls) — treat any abort/
        // network failure on the real call the same way: a clear, specific
        // message instead of a raw AbortError/DOMException bubbling up.
        if (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
          return NextResponse.json(
            { error: 'Tagger took too long to respond — it may be training or under heavy load. Try again in a moment.', training: true },
            { status: 503 }
          );
        }
        return NextResponse.json({ error: 'Tagger service unreachable' }, { status: 502 });
      }

      if (res.status === 503) {
        const errBody = await res.json().catch(() => ({}));
        return NextResponse.json(
          { error: errBody.detail || 'Tagger is temporarily unavailable — try again in a moment.', training: true },
          { status: 503 }
        );
      }
      if (!res.ok) throw new Error(`changelog-tagger returned ${res.status}`);

      const data = await res.json();

      // Extract a short synopsis per tag from the evidence block
      const synopsis: Record<string, string> = {};
      if (data.evidence && typeof data.evidence === 'object') {
        for (const [tagName, ev] of Object.entries(data.evidence)) {
          const e = ev as Record<string, string>;
          synopsis[tagName] = e.reason || e.narrative || '';
        }
      }

      return NextResponse.json({ tags: Array.isArray(data.tags) ? data.tags : [], source: 'tagger', synopsis });
    }

    // --- Priority 2: AI ---
    if (!config?.enableAIAssistant || !config.aiApiKey) {
      return NextResponse.json({ error: 'No tag suggestion service configured' }, { status: 503 });
    }
    if (availableTagNames.length === 0) {
      return NextResponse.json({ error: 'No tags provided' }, { status: 400 });
    }

    const baseUrl = config.aiApiUrl ? config.aiApiUrl.replace(/\/$/, '') : HALESIS_BASE;
    const prompt = `Categorize this changelog with appropriate tags.\nAvailable tags: ${availableTagNames.join(', ')}\n\nReturn only matching tag names (max 3), comma-separated. No explanations.\n\n${content.trim().slice(0, 2000)}`;

    const aiRes = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.aiApiKey}` },
      body: JSON.stringify({
        model: config.aiDefaultModel || 'copilot-zero',
        messages: [
          { role: 'system', content: 'You are a changelog tagger. Select relevant tags from the list provided.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 40,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!aiRes.ok) throw new Error(`AI returned ${aiRes.status}`);

    const aiData = await aiRes.json();
    let responseText = '';
    if (aiData.messages?.length) responseText = aiData.messages[aiData.messages.length - 1]?.content ?? '';
    else if (aiData.choices?.length) responseText = aiData.choices[0]?.message?.content ?? '';

    const suggested = responseText
      .split(',')
      .map((t: string) => t.trim())
      .filter(Boolean)
      .map((name: string) => availableTagNames.find(t => t.toLowerCase() === name.toLowerCase()))
      .filter(Boolean) as string[];

    return NextResponse.json({ tags: suggested, source: 'ai' });
  } catch (error) {
    console.error('[suggest-tags]', error);
    // AbortError/TimeoutError from an AbortSignal.timeout() print as a raw
    // DOMException with no useful .message — give a clean message instead.
    const isAbort = error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
    return NextResponse.json(
      { error: isAbort ? 'Request to the tag suggestion service timed out. Try again in a moment.' : (error instanceof Error ? error.message : 'Failed to suggest tags') },
      { status: isAbort ? 503 : 500 }
    );
  }
}
