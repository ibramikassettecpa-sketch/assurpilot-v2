// Single import point — swap provider here without touching business logic
export { vapiProvider as voiceProvider } from './vapi'
export type { VoiceProvider, CreateAssistantParams, StartCallParams, StartCallResult } from './types'
