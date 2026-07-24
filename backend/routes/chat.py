from fastapi import APIRouter
from pydantic import BaseModel
import re
import logging
from predictor import get_predictor

router = APIRouter(prefix="/api/chat", tags=["chat"])
logger = logging.getLogger("chat")

class ChatRequest(BaseModel):
    message: str
    context: str = ""

@router.post("")
async def chat_with_saarathi(req: ChatRequest):
    """
    Handles chat messages from the frontend Saarathi interface.
    Extracts stock symbols and returns ML predictions.
    """
    msg = req.message.lower()
    predictor = get_predictor()
    
    if not predictor.loaded:
        return {
            "status": "error",
            "reply": "I'm currently starting up my prediction engines or models haven't been trained yet. Please try again in a few moments."
        }

    # Extract all capitalized words that might be stock symbols from the raw message
    raw_msg = req.message
    # Basic regex to find potential symbols (all caps, 3-6 chars usually)
    potential_symbols = re.findall(r'\b[A-Z]{3,8}\b', raw_msg)
    
    # Check which ones are supported
    supported_symbols = predictor.get_supported_symbols()
    found_symbols = [s for s in potential_symbols if s in supported_symbols]

    # Handle explicit predictions if user asks "predict NABIL" or mentions symbols
    if found_symbols:
        predictions = predictor.predict_multiple(found_symbols)
        
        if not predictions:
            return {
                "status": "ok",
                "reply": f"I couldn't generate predictions for those symbols right now. They might lack sufficient recent data."
            }
            
        reply = "Here are my predictions for the next trading day based on my AI models:\n\n"
        
        for p in predictions:
            reply += f"### {p['symbol']} {p['direction']}\n"
            reply += f"- **Current Close:** Rs. {p['last_close']} (as of {p['last_date']})\n"
            reply += f"- **Predicted Close:** Rs. {p['predicted_close']}\n"
            reply += f"- **Expected Change:** {p['predicted_change_pct']}%\n"
            reply += f"- *Model:* {p['model_type']} (MAE: {p['model_mae']:.2f})\n\n"
            
        reply += "> *Note: These are algorithmic predictions based on historical patterns and should not be used as the sole basis for financial decisions.*"
        
        return {"status": "ok", "reply": reply}

    # Handle general queries
    if "hello" in msg or "hi" in msg:
        return {
            "status": "ok", 
            "reply": "नमस्ते! I am Saarathi, your predictive AI guide. I've been upgraded from a general conversational AI to a specialized stock predictor.\n\nTry asking me to predict specific stocks by mentioning their symbols in uppercase, like: **'Predict NABIL'** or **'What is the forecast for NICA and SBI?'**"
        }
        
    if "predict" in msg or "forecast" in msg:
        return {
            "status": "ok",
            "reply": "To get a prediction, please include the exact stock symbol in uppercase. For example: **'Give me a prediction for SCB'**."
        }

    # Default fallback
    supported_sample = ", ".join(supported_symbols[:5]) + "..." if supported_symbols else "none currently"
    
    return {
        "status": "ok",
        "reply": f"I am a specialized predictive model. Please mention a stock symbol in uppercase (e.g., NABIL, NICA) to get its next-day price forecast.\n\nI currently support predictions for {len(supported_symbols)} companies, including: {supported_sample}."
    }
