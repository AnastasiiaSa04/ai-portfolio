export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}
export interface ChatRequest {
  messages: ChatMessage[]
  systemPrompt?: string
}

export interface ChatResponse {
  reply: string
}