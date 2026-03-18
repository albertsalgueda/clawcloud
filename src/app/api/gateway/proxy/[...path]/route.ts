import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { deductCredits, checkSufficientBalance } from '@/lib/credits/balance'
import { maybeAutoTopUp } from '@/lib/credits/auto-topup'
import { TOKEN_PRICING_EUR, DEFAULT_TOKEN_PRICE_EUR } from '@/lib/constants'

export const runtime = 'nodejs'
// Disable body size limit for LLM requests
export const maxDuration = 300 // 5 minutes for long-running LLM calls

const AI_GATEWAY_URL = 'https://gateway.ai.vercel.app/v1'

/**
 * Cache for gateway_token -> instance/org resolution.
 * Avoids DB lookup on every request. TTL: 60 seconds.
 */
const tokenCache = new Map<string, { instanceId: string; orgId: string; expiresAt: number }>()
const TOKEN_CACHE_TTL_MS = 60_000

async function resolveToken(
  token: string,
): Promise<{ instanceId: string; orgId: string } | null> {
  const cached = tokenCache.get(token)
  if (cached && cached.expiresAt > Date.now()) {
    return { instanceId: cached.instanceId, orgId: cached.orgId }
  }

  const { data } = await supabaseAdmin
    .from('instances')
    .select('id, org_id')
    .eq('gateway_token', token)
    .eq('status', 'running')
    .limit(1)
    .single()

  if (!data) return null

  tokenCache.set(token, {
    instanceId: data.id,
    orgId: data.org_id,
    expiresAt: Date.now() + TOKEN_CACHE_TTL_MS,
  })

  return { instanceId: data.id, orgId: data.org_id }
}

function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = TOKEN_PRICING_EUR[model] ?? DEFAULT_TOKEN_PRICE_EUR
  return inputTokens * pricing.input + outputTokens * pricing.output
}

/**
 * Parse token usage from a completed (non-streaming) response body.
 */
function parseUsageFromBody(body: unknown): { inputTokens: number; outputTokens: number } | null {
  if (!body || typeof body !== 'object') return null
  const obj = body as Record<string, unknown>

  // OpenAI-compatible format
  if (obj.usage && typeof obj.usage === 'object') {
    const usage = obj.usage as Record<string, unknown>
    const inputTokens = Number(usage.prompt_tokens ?? usage.input_tokens ?? 0)
    const outputTokens = Number(usage.completion_tokens ?? usage.output_tokens ?? 0)
    if (inputTokens > 0 || outputTokens > 0) {
      return { inputTokens, outputTokens }
    }
  }

  return null
}

/**
 * Parse token usage from SSE stream data.
 * Looks for usage info in the final chunk (often sent with `data: [DONE]` or in the last delta).
 */
function parseUsageFromSSEChunk(text: string): { inputTokens: number; outputTokens: number } | null {
  // Try to find a line with usage data in the SSE stream
  const lines = text.split('\n')
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue
    const data = line.slice(6).trim()
    if (data === '[DONE]') continue
    try {
      const parsed = JSON.parse(data)
      const usage = parseUsageFromBody(parsed)
      if (usage) return usage
    } catch {
      // Not valid JSON, skip
    }
  }
  return null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const subPath = path.join('/')

  // 1. Extract and validate the gateway token
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null

  if (!token) {
    return NextResponse.json(
      { error: 'Missing Authorization header' },
      { status: 401 },
    )
  }

  const resolved = await resolveToken(token)
  if (!resolved) {
    return NextResponse.json(
      { error: 'Invalid or expired gateway token' },
      { status: 401 },
    )
  }

  const { instanceId, orgId } = resolved

  // 2. Quick balance check (non-locking for speed)
  const hasFunds = await checkSufficientBalance(orgId, 0.001)
  if (!hasFunds) {
    return NextResponse.json(
      { error: 'Insufficient credit balance. Please add credits.' },
      { status: 402 },
    )
  }

  // 3. Parse the request to extract model info
  let requestBody: Record<string, unknown>
  try {
    requestBody = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON request body' },
      { status: 400 },
    )
  }

  const model = String(requestBody.model ?? 'unknown')
  const isStreaming = requestBody.stream === true

  // 4. Forward to Vercel AI Gateway
  const gatewayKey = process.env.VERCEL_AI_GATEWAY_KEY
  if (!gatewayKey) {
    console.error('VERCEL_AI_GATEWAY_KEY not configured')
    return NextResponse.json(
      { error: 'Gateway not configured' },
      { status: 503 },
    )
  }

  const upstreamHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${gatewayKey}`,
  }

  let upstreamResponse: Response
  try {
    upstreamResponse = await fetch(`${AI_GATEWAY_URL}/${subPath}`, {
      method: 'POST',
      headers: upstreamHeaders,
      body: JSON.stringify(requestBody),
    })
  } catch (err) {
    console.error('Failed to reach AI gateway:', err)
    return NextResponse.json(
      { error: 'AI gateway unreachable' },
      { status: 502 },
    )
  }

  if (!upstreamResponse.ok) {
    // Pass through error responses from the gateway
    const errorBody = await upstreamResponse.text()
    return new NextResponse(errorBody, {
      status: upstreamResponse.status,
      headers: { 'Content-Type': upstreamResponse.headers.get('Content-Type') ?? 'application/json' },
    })
  }

  // 5. Handle streaming vs non-streaming responses
  if (isStreaming && upstreamResponse.body) {
    return handleStreamingResponse(upstreamResponse, orgId, instanceId, model)
  } else {
    return handleNonStreamingResponse(upstreamResponse, orgId, instanceId, model)
  }
}

async function handleNonStreamingResponse(
  upstreamResponse: Response,
  orgId: string,
  instanceId: string,
  model: string,
): Promise<NextResponse> {
  const body = await upstreamResponse.json()
  const usage = parseUsageFromBody(body)

  // Deduct credits in the background (don't delay the response)
  if (usage && (usage.inputTokens > 0 || usage.outputTokens > 0)) {
    const cost = calculateCost(model, usage.inputTokens, usage.outputTokens)
    deductAndMaybeTopUp(orgId, instanceId, model, usage.inputTokens, usage.outputTokens, cost)
  }

  return NextResponse.json(body, {
    status: upstreamResponse.status,
  })
}

function handleStreamingResponse(
  upstreamResponse: Response,
  orgId: string,
  instanceId: string,
  model: string,
): NextResponse {
  const reader = upstreamResponse.body!.getReader()
  const decoder = new TextDecoder()

  let accumulatedText = ''
  let usageFound: { inputTokens: number; outputTokens: number } | null = null

  const stream = new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read()

      if (done) {
        controller.close()

        // After stream ends, try to parse usage from accumulated text
        if (!usageFound) {
          usageFound = parseUsageFromSSEChunk(accumulatedText)
        }

        if (usageFound && (usageFound.inputTokens > 0 || usageFound.outputTokens > 0)) {
          const cost = calculateCost(model, usageFound.inputTokens, usageFound.outputTokens)
          deductAndMaybeTopUp(orgId, instanceId, model, usageFound.inputTokens, usageFound.outputTokens, cost)
        }
        return
      }

      // Pass through the chunk immediately
      controller.enqueue(value)

      // Accumulate text for usage parsing (only keep last 4KB to limit memory)
      const chunk = decoder.decode(value, { stream: true })
      accumulatedText += chunk
      if (accumulatedText.length > 4096) {
        accumulatedText = accumulatedText.slice(-4096)
      }

      // Try to parse usage as we go (some providers send it before [DONE])
      if (!usageFound) {
        usageFound = parseUsageFromSSEChunk(chunk)
      }
    },
    cancel() {
      reader.cancel()
    },
  })

  return new NextResponse(stream, {
    status: upstreamResponse.status,
    headers: {
      'Content-Type': upstreamResponse.headers.get('Content-Type') ?? 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

/**
 * Deduct credits and trigger auto top-up if needed.
 * This runs asynchronously to avoid delaying the response.
 */
function deductAndMaybeTopUp(
  orgId: string,
  instanceId: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  cost: number,
): void {
  deductCredits(orgId, cost, { instanceId, model, inputTokens, outputTokens })
    .then(({ newBalance }) => {
      // Fire auto top-up check non-blocking
      maybeAutoTopUp(orgId, newBalance).catch((err) =>
        console.error(`Auto top-up error for org ${orgId}:`, err),
      )
    })
    .catch((err) => {
      console.error(`Credit deduction failed for org ${orgId}:`, err)
    })
}
