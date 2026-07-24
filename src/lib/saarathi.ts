import { nepseApi } from './api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function chatWithSaarathi(
  messages: ChatMessage[],
  currentPage: string
): Promise<string> {
  // We only send the latest user message to the backend model predictor,
  // since the ML model does not need full conversation history.
  
  // Find the last user message
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
  
  if (!lastUserMessage) {
    return "How can I help you analyze the market today?";
  }

  try {
    const response = await nepseApi.chatWithModel(lastUserMessage.content, currentPage);
    
    if (response?.status === 'ok' && response.reply) {
      return response.reply;
    }
    
    return "I couldn't generate a prediction at the moment. Please ensure the backend is running and the models are trained.";
  } catch (error: any) {
    console.error("Saarathi Prediction Error:", error);
    return `I encountered an error connecting to my prediction engine. Details: ${error.message}`;
  }
}
