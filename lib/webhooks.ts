import crypto from 'crypto'
import { prisma } from './prisma'

export type WebhookEventType = 'call.ended' | 'lead.transferred' | 'lead.qualified'

export interface WebhookPayload {
  event: WebhookEventType
  timestamp: string
  data: Record<string, unknown>
}

function sign(secret: string, body: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex')
}

async function deliverOnce(url: string, secret: string, payload: WebhookPayload): Promise<boolean> {
  const body = JSON.stringify(payload)
  const sig = sign(secret, body)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AssurPilot-Signature': sig,
        'X-AssurPilot-Event': payload.event,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function dispatchWebhook(event: WebhookEventType, data: Record<string, unknown>) {
  const configs = await prisma.webhookConfig.findMany({ where: { actif: true } })
  if (configs.length === 0) return

  const payload: WebhookPayload = { event, timestamp: new Date().toISOString(), data }

  // Fire and forget with up to 3 retries each (1s, 2s, 4s backoff)
  for (const cfg of configs) {
    retry(cfg.url, cfg.secret, payload)
  }
}

async function retry(url: string, secret: string, payload: WebhookPayload) {
  const delays = [0, 1000, 2000, 4000]
  for (const delay of delays) {
    if (delay > 0) await sleep(delay)
    const ok = await deliverOnce(url, secret, payload)
    if (ok) return
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
