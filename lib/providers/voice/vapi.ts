// All Vapi-specific code lives here — change only this file to swap providers

import type {
  VoiceProvider,
  CreateAssistantParams,
  StartCallParams,
  StartCallResult,
} from './types'

const VAPI_BASE = 'https://api.vapi.ai'

function vapiHeaders() {
  const key = process.env.VAPI_API_KEY
  if (!key || key === 'COLLER_VOTRE_CLE_VAPI_ICI') {
    throw new Error('VAPI_API_KEY manquante — ajoutez-la dans votre fichier .env')
  }
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
}

function buildModelConfig(modele: string) {
  if (modele === 'claude-haiku-4-5' || modele === 'claude-sonnet-4-6') {
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicKey || anthropicKey === 'COLLER_VOTRE_CLE_ANTHROPIC_ICI') {
      throw new Error('ANTHROPIC_API_KEY manquante — ajoutez-la dans votre fichier .env')
    }
    return {
      provider: 'anthropic',
      model: modele,
      temperature: 0.6,
      maxTokens: 200,
      // Register ANTHROPIC_API_KEY as provider key in Vapi dashboard:
      // dashboard.vapi.ai → Provider Keys → Anthropic
    }
  }
  if (modele === 'gemini-flash') {
    const googleKey = process.env.GOOGLE_API_KEY
    if (!googleKey || googleKey === 'COLLER_VOTRE_CLE_GOOGLE_ICI') {
      throw new Error('GOOGLE_API_KEY manquante — ajoutez-la dans votre fichier .env')
    }
    return {
      provider: 'google',
      model: 'gemini-2.0-flash-exp',
      temperature: 0.6,
      maxTokens: 200,
      // Register GOOGLE_API_KEY as provider key in Vapi dashboard:
      // dashboard.vapi.ai → Provider Keys → Google
    }
  }
  return {
    provider: 'anthropic',
    model: 'claude-haiku-4-5',
    temperature: 0.6,
    maxTokens: 200,
  }
}

function buildAssistantPayload(params: CreateAssistantParams) {
  const modelConfig = buildModelConfig(params.modele)

  // Trigger phrase instructions for the system prompt
  const triggerSection =
    params.triggerPhrases.length > 0
      ? `

DÉTECTION DE DÉCLENCHEURS DE TRANSFERT — TRÈS IMPORTANT :
Lorsque le prospect exprime l'une des intentions suivantes (ou toute formulation équivalente), vous DEVEZ immédiatement appeler l'outil "transfererVersConseiller" :
${params.triggerPhrases.map(p => `- "${p}"`).join('\n')}

Avant de transférer, dites exactement :
"Parfait ! Je vous mets en relation avec l'un de nos conseillers qui pourra vous aider directement. Merci de bien vouloir patienter quelques instants."`
      : ''

  const systemPrompt = `${params.scriptCommercial}

OBJECTIF : ${params.objectif}

GESTION DES OBJECTIONS :
${params.notesObjections || 'Restez positif et essayez de comprendre les besoins du prospect.'}${triggerSection}

RÈGLES IMPORTANTES :
- Parlez toujours en français, avec un ton naturel et professionnel
- Répondez de façon courte (max 2-3 phrases par tour)
- Ne mentionnez jamais que vous êtes une IA sauf si directement demandé
- Si le prospect n'est pas disponible, proposez un rappel`

  // Warm-transfer tool — Vapi will call this as a function when the AI decides to transfer
  const tools = params.transferPhone
    ? [
        {
          type: 'transferCall',
          function: {
            name: 'transfererVersConseiller',
            description:
              'Transfère immédiatement l\'appel vers un conseiller humain avec un résumé de la conversation.',
            parameters: {
              type: 'object',
              properties: {
                resume_conversation: {
                  type: 'string',
                  description:
                    'Résumé de 1-2 phrases de la conversation et de l\'intérêt du prospect.',
                },
              },
              required: ['resume_conversation'],
            },
          },
          destinations: [
            {
              type: 'number',
              number: params.transferPhone,
              // Warm message spoken to the human rep before connecting
              message:
                'Bonjour, vous recevez un transfert d\'un prospect intéressé. Résumé de la conversation : {{resume_conversation}}. Je vous connecte maintenant.',
              description: 'Conseiller commercial',
            },
          ],
        },
      ]
    : []

  return {
    name: params.name,
    firstMessage: params.messageAccueil,
    model: {
      ...modelConfig,
      messages: [{ role: 'system', content: systemPrompt }],
      // Include tool definitions in the model config for Vapi
      ...(tools.length > 0 && { tools }),
    },
    voice: {
       provider: 'azure',
       voiceId: 'fr-FR-DeniseNeural',
          },
    transcriber: {
      provider: 'deepgram',
      model: 'nova-2',
      language: params.langue || 'fr',
    },
    // Lower turn-end detection for snappier French conversation
    silenceTimeoutSeconds: 20,
    maxDurationSeconds: 1800,
    endCallMessage: 'Merci pour votre temps. Bonne journée !',
    endCallPhrases: ['au revoir', 'bonne journée'],
    serverUrl: params.webhookUrl,
    voicemailDetection: {
      provider: 'twilio',
      enabled: true,
    },
  }
}

async function vapiRequest(method: string, path: string, body?: unknown) {
  const res = await fetch(`${VAPI_BASE}${path}`, {
    method,
    headers: vapiHeaders(),
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Vapi API ${method} ${path} → ${res.status}: ${text}`)
  }

  if (res.status === 204) return null
  return res.json()
}

export const vapiProvider: VoiceProvider = {
  async createAssistant(params) {
    const payload = buildAssistantPayload(params)
    const data = await vapiRequest('POST', '/assistant', payload)
    return data.id as string
  },

  async updateAssistant(assistantId, params) {
    const payload = buildAssistantPayload(params)
    await vapiRequest('PATCH', `/assistant/${assistantId}`, payload)
  },

  async deleteAssistant(assistantId) {
    await vapiRequest('DELETE', `/assistant/${assistantId}`)
  },

  async startCall(params) {
    const data = await vapiRequest('POST', '/call/phone', {
      assistantId: params.assistantId,
      phoneNumberId: params.phoneNumberId,
      customer: { number: params.phoneNumber },
      ...(params.metadata ? { metadata: params.metadata } : {}),
    })
    return {
      callId: (params.metadata?.callId as string) ?? data.id,
      providerCallId: data.id as string,
    }
  },

  async endCall(providerCallId) {
    await vapiRequest('DELETE', `/call/${providerCallId}`)
  },
}
