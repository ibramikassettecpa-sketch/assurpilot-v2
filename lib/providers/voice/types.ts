// VoiceProvider interface — swap Vapi for Retell/Bland by changing the adapter

export interface StartCallParams {
  phoneNumber: string       // E.164
  assistantId: string       // provider assistant/agent ID
  phoneNumberId: string     // provider phone number ID
  metadata?: Record<string, unknown>
}

export interface StartCallResult {
  callId: string            // our DB call ID
  providerCallId: string    // Vapi call ID
}

export interface CreateAssistantParams {
  name: string
  langue: string
  modele: string            // claude-haiku-4-5 | claude-sonnet-4-6 | gemini-flash
  voix: string
  messageAccueil: string
  scriptCommercial: string
  notesObjections: string
  objectif: string
  triggerPhrases: string[]
  transferPhone: string
  webhookUrl: string
}

export interface VoiceProvider {
  createAssistant(params: CreateAssistantParams): Promise<string>   // returns assistantId
  updateAssistant(assistantId: string, params: CreateAssistantParams): Promise<void>
  deleteAssistant(assistantId: string): Promise<void>
  startCall(params: StartCallParams): Promise<StartCallResult>
  endCall(providerCallId: string): Promise<void>
}
