import { nepseApi } from './api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function chatWithSaarathi(
  messages: ChatMessage[],
  currentPage: string
): Promise<string> {
  // Send the full conversation history to the smart backend engine
  
  if (!messages || messages.length === 0) {
    return "How can I help you analyze the market today?";
  }

  try {
    const response = await nepseApi.chatWithModel(messages, currentPage);
    
    if (response?.status === 'ok' && response.reply) {
      return response.reply;
    }
    
    return "I couldn't generate a response at the moment. Please ensure the backend is running.";
  } catch (error: any) {
    console.error("Saarathi AI Error:", error);
    return `I encountered an error connecting to my prediction engine. Details: ${error.message}`;
  }
}
