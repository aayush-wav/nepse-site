import { nepseApi } from './api';

const SYSTEM_PROMPT = `You are Saarathi (सारथी) — an intelligent, friendly, and deeply knowledgeable AI stock market guide built into a NEPSE analysis platform.
You guide beginners through the platform step by step, help intermediate investors run analysis, and give advanced traders sharp, data-backed stock intelligence.

# IMPORTANT RULES:
1. Always ground your suggestions in live data. Use the provided tools to fetch data before making specific claims.
2. Don't hallucinate data. If you can't fetch it, say so.
3. Be friendly and concise. Use Markdown for formatting.
4. If asked for recommendations, always provide rationale based on technicals or fundamentals.

Current Context:
URL: {{CURRENT_PAGE}}
`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function chatWithSaarathi(
  messages: ChatMessage[],
  currentPage: string
): Promise<string> {
  // Check for available API keys (DeepSeek, Gemini, or Anthropic)
  const deepseekKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const anthropicKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  const apiKey = deepseekKey || geminiKey || anthropicKey;
  
  // MOCK MODE: If no API key is provided, simulate a realistic response
  if (!apiKey || apiKey === 'mock_key_or_empty') {
    await new Promise(r => setTimeout(r, 1500)); // Simulate thinking time
    
    const lastMessage = messages[messages.length - 1].content.toLowerCase();
    const page = currentPage.toLowerCase();
    
    // Context-aware mock responses
    if (lastMessage.includes('hello') || lastMessage.includes('hi')) {
      if (page.includes('dashboard')) {
        return "नमस्ते! I'm Saarathi. I see you're looking at the Dashboard. The NEPSE index is currently showing some interesting movements. Would you like me to highlight the top gainers, or should we look at a specific sector?";
      }
      return "नमस्ते! I'm Saarathi, your NEPSE guide. I'm operating in Mock Mode right now since no API key is configured. How can I help you explore the platform?";
    }
    
    if (page.includes('floorsheet') || lastMessage.includes('broker')) {
      return "Looking at the floorsheet data, Broker 58 (Naasa Securities) and Broker 45 (Imperial) have been heavily accumulating banking stocks today. This kind of concentrated buying often precedes a move. Shall we filter for a specific stock like NABIL or NICA?";
    }
    
    if (page.includes('stock') || lastMessage.includes('analyze')) {
      return "Based on the latest data for this stock, the RSI is currently around 42 (neutral), but the MACD just crossed bullishly. Fundamentally, it's trading below its sector average PE. It looks like a decent accumulation zone if you have a medium-term horizon.";
    }
    
    if (lastMessage.includes('suggest') || lastMessage.includes('buy')) {
      return "I can certainly help with that! Before I suggest anything, are you looking for short-term trading (momentum/breakouts) or long-term investing (dividends/value)? For long-term, commercial banks are looking historically cheap right now.";
    }

    if (page.includes('ipo')) {
      return "I see you're in the IPO Zone! There are currently a few upcoming issues. Remember, IPO allotment is a lottery system, but you can use our Bulk Checker to instantly see if your BOID was selected for the recent closures.";
    }
    
    // Default fallback
    return `I am currently running in **Mock Mode** because no API key (\`VITE_DEEPSEEK_API_KEY\`, \`VITE_GEMINI_API_KEY\`, or \`VITE_ANTHROPIC_API_KEY\`) is set. \n\nYou said: "${messages[messages.length - 1].content}"\n\nIf this were live, I would analyze this against the data on the ${page.split('/').pop() || 'current'} page and provide a detailed, data-backed answer!`;
  }

  const prompt = SYSTEM_PROMPT.replace('{{CURRENT_PAGE}}', currentPage);

  try {
    if (deepseekKey) {
      // Use DeepSeek API (OpenAI-compatible)
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepseekKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: prompt },
            ...messages
          ],
          max_tokens: 1024,
          temperature: 0.5
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Failed to fetch from DeepSeek');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } else if (geminiKey) {
      // Use Google Gemini API (1.5 Flash - Free Tier available)
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: prompt }]
          },
          contents: messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
          })),
          generationConfig: {
            maxOutputTokens: 1024,
          }
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Failed to fetch from Gemini');
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } else {
      // Fallback to Anthropic API if that key was provided instead
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerously-allow-browser': 'true'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1024,
          system: prompt,
          messages: messages,
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Failed to fetch from Anthropic');
      }

      const data = await response.json();
      return data.content[0].text;
    }
  } catch (error: any) {
    console.error("Saarathi Error:", error);
    return `I encountered an error connecting to my brain. Details: ${error.message}`;
  }
}
