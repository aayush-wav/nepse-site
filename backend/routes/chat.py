"""
Saarathi Chat Engine — Smart conversational AI for NEPSE.
Uses intent classification, entity extraction, and contextual market data.
NO external LLMs. Purely deterministic + local ML predictions.
"""

from fastapi import APIRouter
from pydantic import BaseModel
import re
import logging
import asyncio
from typing import Optional
from cache import cache
from nepse_client import nepse_client
from predictor import get_predictor

router = APIRouter(prefix="/api/chat", tags=["chat"])
logger = logging.getLogger("chat")


# ──────────────────────────────────────────────────────
# Request / Response Models
# ──────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str  # 'user' | 'assistant'
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage] = []
    message: str = ""  # legacy single-message fallback
    context: str = ""


# ──────────────────────────────────────────────────────
# Intent Classifier
# ──────────────────────────────────────────────────────

INTENT_PATTERNS = {
    "greeting": [
        r"\b(hello|hi|hey|namaste|namaskar|yo|sup)\b",
        r"^(hi|hey|hello)[\!\.\?\s]*$",
    ],
    "help": [
        r"\b(help|what can you do|features|commands|how to use|guide)\b",
    ],
    "predict": [
        r"\b(predict|forecast|tomorrow|next day|target|will .+ go up|will .+ go down|price target)\b",
    ],
    "compare": [
        r"\b(compare|vs|versus|difference between|which is better)\b",
    ],
    "market_overview": [
        r"\b(market|nepse|index|how.s the market|market (?:today|now|status)|overall|broad market)\b",
    ],
    "gainers": [
        r"\b(gainer|top gainer|best performer|who.s up|green|rising)\b",
    ],
    "losers": [
        r"\b(loser|top loser|worst|who.s down|red|falling|declining)\b",
    ],
    "sector": [
        r"\b(sector|banking|hydropower|finance|insurance|hotel|micro.?finance|development bank|life insurance|manufacturing)\b",
    ],
    "turnover": [
        r"\b(turnover|volume|most traded|active|liquid|liquidity)\b",
    ],
    "stock_info": [
        r"\b(tell me about|info|detail|what is|about|price of|how is)\b",
    ],
    "thanks": [
        r"\b(thanks|thank you|dhanyabad|thx|ty)\b",
    ],
    "goodbye": [
        r"\b(bye|goodbye|see you|later|good night)\b",
    ],
}

SECTOR_KEYWORDS = {
    "banking": "Commercial Banks",
    "bank": "Commercial Banks",
    "commercial bank": "Commercial Banks",
    "development bank": "Development Banks",
    "dev bank": "Development Banks",
    "finance": "Finance",
    "microfinance": "Microfinance",
    "micro finance": "Microfinance",
    "hydropower": "Hydropower",
    "hydro": "Hydropower",
    "insurance": "Non Life Insurance",
    "life insurance": "Life Insurance",
    "non life": "Non Life Insurance",
    "hotel": "Hotels And Tourism",
    "tourism": "Hotels And Tourism",
    "manufacturing": "Manufacturing And Processing",
    "trading": "Trading",
    "investment": "Investment",
    "mutual fund": "Mutual Fund",
    "others": "Others",
}


def classify_intent(msg: str) -> str:
    """Classify user message into an intent category."""
    msg_lower = msg.lower().strip()
    
    # Score each intent
    scores: dict[str, int] = {}
    for intent, patterns in INTENT_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, msg_lower, re.IGNORECASE):
                scores[intent] = scores.get(intent, 0) + 1
    
    if not scores:
        # Check if there are stock symbols — default to stock_info
        predictor = get_predictor()
        if predictor.loaded:
            symbols = extract_symbols(msg_lower, predictor.get_supported_symbols())
            if symbols:
                return "predict"  # If they mention a stock, they probably want a prediction
        return "general"
    
    # Prioritize: predict > compare > specific intents > general
    priority = ["compare", "predict", "gainers", "losers", "turnover", "sector",
                 "market_overview", "stock_info", "greeting", "help", "thanks", "goodbye"]
    for intent in priority:
        if intent in scores:
            return intent
    
    return max(scores, key=scores.get)


def extract_symbols(msg: str, supported: list[str]) -> list[str]:
    """Extract stock symbols from message text."""
    msg_upper = msg.upper()
    found = []
    
    # First: look for exact symbol matches (3-8 uppercase alpha)
    tokens = re.findall(r'\b[A-Z]{2,10}\b', msg_upper)
    for token in tokens:
        if token in supported and token not in found:
            found.append(token)
    
    # Second: case-insensitive word boundary match against known symbols
    if not found:
        for sym in supported:
            if re.search(r'\b' + re.escape(sym.lower()) + r'\b', msg.lower()):
                if sym not in found:
                    found.append(sym)
    
    return found[:5]  # Cap at 5 symbols


def extract_sector(msg: str) -> Optional[str]:
    """Extract sector name from message."""
    msg_lower = msg.lower()
    for keyword, sector in SECTOR_KEYWORDS.items():
        if keyword in msg_lower:
            return sector
    return None


# ──────────────────────────────────────────────────────
# Response Generators
# ──────────────────────────────────────────────────────

def _fmt_rs(val: float) -> str:
    """Format Nepali Rupee amount."""
    if val >= 1e9:
        return f"Rs. {val/1e9:.2f} Arba"
    elif val >= 1e7:
        return f"Rs. {val/1e7:.2f} Cr"
    elif val >= 1e5:
        return f"Rs. {val/1e5:.2f} Lakh"
    return f"Rs. {val:,.2f}"


async def handle_greeting(msg: str, history: list[ChatMessage]) -> str:
    is_first = len(history) <= 2
    if is_first:
        return (
            "नमस्ते! I'm **Saarathi** — your intelligent NEPSE market companion.\n\n"
            "I can help you with:\n"
            "- 📈 **Stock Predictions** — \"Predict NABIL\" or \"Forecast NICA\"\n"
            "- 🔄 **Compare Stocks** — \"Compare NABIL vs NICA\"\n"
            "- 📊 **Market Overview** — \"How's the market today?\"\n"
            "- 🏆 **Top Movers** — \"Top gainers\" or \"Top losers\"\n"
            "- 🏭 **Sector Analysis** — \"How is banking sector?\"\n"
            "- 💹 **Stock Info** — \"Tell me about SHIVM\"\n\n"
            "What would you like to explore?"
        )
    return "Hey again! What else can I help you with? Ask me about any stock, sector, or the overall market. 🙏"


async def handle_help(msg: str) -> str:
    return (
        "### 🧭 Saarathi Capabilities\n\n"
        "Here's everything I can do:\n\n"
        "| Command | Example |\n"
        "|---------|----------|\n"
        "| **Predict** | \"Predict NABIL\", \"What's the forecast for SBI?\" |\n"
        "| **Compare** | \"Compare NABIL vs NICA\", \"GBIME or SBI?\" |\n"
        "| **Market** | \"How's the market?\", \"Market overview\" |\n"
        "| **Gainers** | \"Top gainers\", \"Who's up today?\" |\n"
        "| **Losers** | \"Top losers\", \"Who's falling?\" |\n"
        "| **Sectors** | \"Banking sector\", \"How is hydropower?\" |\n"
        "| **Turnover** | \"Most traded stocks\", \"Top volume\" |\n"
        "| **Stock Info** | \"Tell me about SHIVM\" |\n\n"
        "Try any of these or just ask naturally — I understand conversational queries too!"
    )


async def handle_predict(msg: str, symbols: list[str]) -> str:
    predictor = get_predictor()
    if not predictor.loaded:
        return "⚠️ My prediction models are still loading or haven't been trained yet. Please try again shortly."
    
    if not symbols:
        sample = ", ".join(predictor.get_supported_symbols()[:5])
        return (
            "I need a stock symbol to run my neural networks on. "
            f"Try something like:\n\n"
            f"- \"Predict **NABIL**\"\n"
            f"- \"Forecast **NICA** and **SBI**\"\n\n"
            f"I currently support {len(predictor.get_supported_symbols())} stocks including {sample}."
        )
    
    predictions = predictor.predict_multiple(symbols)
    if not predictions:
        return f"I couldn't generate predictions for {', '.join(symbols)}. There might not be enough historical data for these symbols."
    
    reply = "### 🔮 ML Price Forecast\n\n"
    reply += f"*Analyzed using dual LSTM/GRU deep learning architecture*\n\n"
    
    for p in predictions:
        sym = p['symbol']
        change = p['predicted_change_pct']
        direction_emoji = "🟢" if change > 0.1 else ("🔴" if change < -0.1 else "⚪")
        
        # Dynamic analysis text
        if change > 3.0:
            sentiment = "**Strong bullish signal.** Multiple technical layers converge on significant upward momentum."
        elif change > 1.0:
            sentiment = "**Moderate bullish bias.** The model detects positive price drift with healthy volume support."
        elif change > 0.1:
            sentiment = "**Mild upward lean.** Slight positive pressure but no strong directional conviction."
        elif change > -0.1:
            sentiment = "**Neutral stance.** The model sees a flat consolidation zone with balanced forces."
        elif change > -1.0:
            sentiment = "**Mild bearish pressure.** Expect some resistance and potential minor pullbacks."
        elif change > -3.0:
            sentiment = "**Moderate bearish signal.** The model detects distribution patterns and fading momentum."
        else:
            sentiment = "**Strong bearish warning.** Patterns commonly associated with sharp corrections are emerging."
        
        reply += f"#### {direction_emoji} {sym}\n"
        reply += f"{sentiment}\n\n"
        reply += f"| Metric | Value |\n"
        reply += f"|--------|-------|\n"
        reply += f"| Last Close | Rs. {p['last_close']} ({p['last_date']}) |\n"
        reply += f"| ML Target | **Rs. {p['predicted_close']}** |\n"
        reply += f"| Expected Move | **{'+' if change > 0 else ''}{change}%** |\n"
        reply += f"| Model MAE | {p['model_mae']:.4f} |\n\n"
    
    reply += "---\n*Disclaimer: These are mathematical inferences from localized ML models. They do not account for fundamental news or macro shifts. Trade responsibly.*"
    return reply


async def handle_compare(msg: str, symbols: list[str]) -> str:
    if len(symbols) < 2:
        return (
            "To compare stocks, mention at least two symbols.\n\n"
            "Example: \"**Compare NABIL vs NICA**\" or \"**GBIME or SBI which is better?**\""
        )
    
    predictor = get_predictor()
    if not predictor.loaded:
        return "⚠️ My prediction models are loading. Please try again shortly."
    
    predictions = predictor.predict_multiple(symbols[:4])
    if not predictions:
        return f"Couldn't generate comparison data for {', '.join(symbols)}."
    
    reply = f"### ⚖️ Head-to-Head: {' vs '.join([p['symbol'] for p in predictions])}\n\n"
    reply += "| Metric | " + " | ".join(p['symbol'] for p in predictions) + " |\n"
    reply += "|--------" + "".join("| ------- " for _ in predictions) + "|\n"
    reply += "| Last Close | " + " | ".join(f"Rs. {p['last_close']}" for p in predictions) + " |\n"
    reply += "| ML Target | " + " | ".join(f"**Rs. {p['predicted_close']}**" for p in predictions) + " |\n"
    reply += "| Expected Move | " + " | ".join(f"**{'+' if p['predicted_change_pct']>0 else ''}{p['predicted_change_pct']}%**" for p in predictions) + " |\n"
    reply += "| Signal | " + " | ".join(p['direction'] for p in predictions) + " |\n\n"
    
    # Verdict
    best = max(predictions, key=lambda p: p['predicted_change_pct'])
    worst = min(predictions, key=lambda p: p['predicted_change_pct'])
    
    reply += f"**Verdict:** Based on next-day ML inference, **{best['symbol']}** shows the strongest upside "
    reply += f"({'+' if best['predicted_change_pct']>0 else ''}{best['predicted_change_pct']}%), "
    reply += f"while **{worst['symbol']}** shows the most caution "
    reply += f"({'+' if worst['predicted_change_pct']>0 else ''}{worst['predicted_change_pct']}%).\n\n"
    reply += "*Note: This is a single-day mathematical forecast, not a long-term investment recommendation.*"
    return reply


async def handle_market_overview() -> str:
    """Pull live market data and compose an overview."""
    # Gather data from cache (populated by scheduler)
    index_data = cache.get("nepse_index")
    market_summary = cache.get("market_summary")
    market_status = cache.get("market_status")
    live_data = cache.get("live_trading")
    
    # Try to fetch if not cached
    if not index_data:
        index_data = await asyncio.to_thread(nepse_client.get_nepse_index)
    if not live_data:
        live_data = await asyncio.to_thread(nepse_client.get_live_trading)
    
    reply = "### 📊 NEPSE Market Overview\n\n"
    
    # Market status
    status_str = "Unknown"
    if market_status:
        if isinstance(market_status, dict):
            status_str = market_status.get("isOpen", "CLOSED")
        elif isinstance(market_status, str):
            status_str = market_status
    
    status_emoji = "🟢" if status_str in ("OPEN", "Open") else "🔴"
    reply += f"**Status:** {status_emoji} {status_str}\n\n"
    
    # Index data
    if index_data:
        if isinstance(index_data, list) and len(index_data) > 0:
            idx = index_data[0] if isinstance(index_data[0], dict) else index_data
        elif isinstance(index_data, dict):
            idx = index_data
        else:
            idx = None
        
        if idx and isinstance(idx, dict):
            current = idx.get("currentValue", idx.get("index", "N/A"))
            change = idx.get("change", idx.get("pointChange", 0))
            pct = idx.get("perChange", idx.get("percentageChange", 0))
            direction = "🟢" if float(change or 0) > 0 else "🔴"
            reply += f"**NEPSE Index:** {current} {direction} ({'+' if float(change or 0) > 0 else ''}{change} | {'+' if float(pct or 0) > 0 else ''}{pct}%)\n\n"
    
    # Live market stats
    if live_data and isinstance(live_data, list) and len(live_data) > 0:
        total_turnover = sum(s.get("totalTradeValue", 0) for s in live_data if isinstance(s, dict))
        total_qty = sum(s.get("totalTradeQuantity", 0) for s in live_data if isinstance(s, dict))
        
        advancing = sum(1 for s in live_data if isinstance(s, dict) and (s.get("percentageChange", 0) or 0) > 0)
        declining = sum(1 for s in live_data if isinstance(s, dict) and (s.get("percentageChange", 0) or 0) < 0)
        unchanged = len(live_data) - advancing - declining
        
        reply += f"| Metric | Value |\n"
        reply += f"|--------|-------|\n"
        reply += f"| Total Turnover | {_fmt_rs(total_turnover)} |\n"
        reply += f"| Total Quantity | {total_qty:,} shares |\n"
        reply += f"| Advancing | 🟢 {advancing} stocks |\n"
        reply += f"| Declining | 🔴 {declining} stocks |\n"
        reply += f"| Unchanged | ⚪ {unchanged} stocks |\n\n"
        
        # Top movers mini
        sorted_by_change = sorted(
            [s for s in live_data if isinstance(s, dict) and s.get("percentageChange") is not None],
            key=lambda x: x.get("percentageChange", 0),
            reverse=True
        )
        
        if sorted_by_change:
            top3 = sorted_by_change[:3]
            bot3 = sorted_by_change[-3:]
            
            reply += "**Top Gainers:** " + ", ".join(
                f"{s.get('symbol', '?')} (+{s.get('percentageChange', 0):.1f}%)" for s in top3
            ) + "\n"
            reply += "**Top Losers:** " + ", ".join(
                f"{s.get('symbol', '?')} ({s.get('percentageChange', 0):.1f}%)" for s in bot3
            ) + "\n"
    else:
        reply += "*Live market data is currently unavailable. The market may be closed.*\n"
    
    return reply


async def handle_gainers() -> str:
    gainers = cache.get("top_gainers")
    if not gainers:
        gainers = await asyncio.to_thread(nepse_client.get_top_gainers)
    
    if not gainers or not isinstance(gainers, list) or len(gainers) == 0:
        return "📊 Top gainer data is not available right now. The market may be closed."
    
    reply = "### 🏆 Top Gainers Today\n\n"
    reply += "| # | Symbol | LTP | Change |\n"
    reply += "|---|--------|-----|--------|\n"
    
    for i, s in enumerate(gainers[:10], 1):
        sym = s.get("symbol", s.get("securityName", "?"))
        ltp = s.get("lastTradedPrice", s.get("closingPrice", "N/A"))
        pct = s.get("percentageChange", s.get("percentChange", 0))
        reply += f"| {i} | **{sym}** | Rs. {ltp} | 🟢 +{pct:.1f}% |\n"
    
    return reply


async def handle_losers() -> str:
    losers = cache.get("top_losers")
    if not losers:
        losers = await asyncio.to_thread(nepse_client.get_top_losers)
    
    if not losers or not isinstance(losers, list) or len(losers) == 0:
        return "📊 Top loser data is not available right now. The market may be closed."
    
    reply = "### 📉 Top Losers Today\n\n"
    reply += "| # | Symbol | LTP | Change |\n"
    reply += "|---|--------|-----|--------|\n"
    
    for i, s in enumerate(losers[:10], 1):
        sym = s.get("symbol", s.get("securityName", "?"))
        ltp = s.get("lastTradedPrice", s.get("closingPrice", "N/A"))
        pct = s.get("percentageChange", s.get("percentChange", 0))
        reply += f"| {i} | **{sym}** | Rs. {ltp} | 🔴 {pct:.1f}% |\n"
    
    return reply


async def handle_turnover() -> str:
    turnover = cache.get("top_turnover")
    if not turnover:
        turnover = await asyncio.to_thread(nepse_client.get_top_turnover)
    
    if not turnover or not isinstance(turnover, list) or len(turnover) == 0:
        return "📊 Turnover data is not available right now."
    
    reply = "### 💰 Most Traded by Turnover\n\n"
    reply += "| # | Symbol | Turnover | Volume |\n"
    reply += "|---|--------|----------|--------|\n"
    
    for i, s in enumerate(turnover[:10], 1):
        sym = s.get("symbol", s.get("securityName", "?"))
        tv = s.get("turnover", s.get("totalTradeValue", 0))
        qty = s.get("shareTraded", s.get("totalTradeQuantity", 0))
        reply += f"| {i} | **{sym}** | {_fmt_rs(tv)} | {qty:,} |\n"
    
    return reply


async def handle_sector(sector_name: str) -> str:
    sub_indices = cache.get("sector_sub_indices")
    if not sub_indices:
        sub_indices = await asyncio.to_thread(nepse_client.get_sector_sub_indices)
    
    reply = "### 🏭 Sector Analysis\n\n"
    
    if not sub_indices or not isinstance(sub_indices, list):
        return reply + "*Sector data is not available right now.*"
    
    # If a specific sector was asked about
    if sector_name:
        matched = None
        for idx in sub_indices:
            name = idx.get("index", idx.get("instrumentName", ""))
            if sector_name.lower() in name.lower():
                matched = idx
                break
        
        if matched:
            name = matched.get("index", matched.get("instrumentName", "?"))
            current = matched.get("currentValue", matched.get("closingIndex", "N/A"))
            change = matched.get("change", matched.get("pointChange", 0))
            pct = matched.get("perChange", matched.get("percentChange", 0))
            direction = "🟢" if float(change or 0) > 0 else "🔴"
            
            reply += f"#### {name}\n\n"
            reply += f"- **Index:** {current} {direction} ({'+' if float(change or 0) > 0 else ''}{change})\n"
            reply += f"- **Change:** {'+' if float(pct or 0) > 0 else ''}{pct}%\n\n"
            
            # Show related stocks from live data
            live_data = cache.get("live_trading") or []
            sector_stocks = [s for s in live_data 
                           if isinstance(s, dict) 
                           and sector_name.lower() in (s.get("sectorName", "") or "").lower()]
            
            if sector_stocks:
                sorted_stocks = sorted(sector_stocks, key=lambda x: x.get("totalTradeValue", 0), reverse=True)[:5]
                reply += "**Top stocks in this sector:**\n\n"
                reply += "| Symbol | LTP | Change | Turnover |\n"
                reply += "|--------|-----|--------|----------|\n"
                for s in sorted_stocks:
                    sym = s.get("symbol", "?")
                    ltp = s.get("lastTradedPrice", "N/A")
                    pct_s = s.get("percentageChange", 0)
                    tv = s.get("totalTradeValue", 0)
                    emoji = "🟢" if (pct_s or 0) > 0 else ("🔴" if (pct_s or 0) < 0 else "⚪")
                    reply += f"| {sym} | Rs. {ltp} | {emoji} {pct_s:.1f}% | {_fmt_rs(tv)} |\n"
            
            return reply
    
    # Show all sectors summary
    reply += "| Sector | Index | Change |\n"
    reply += "|--------|-------|--------|\n"
    
    sorted_sectors = sorted(sub_indices, 
                          key=lambda x: float(x.get("perChange", x.get("percentChange", 0)) or 0), 
                          reverse=True)
    
    for idx in sorted_sectors[:12]:
        name = idx.get("index", idx.get("instrumentName", "?"))
        current = idx.get("currentValue", idx.get("closingIndex", "N/A"))
        pct = float(idx.get("perChange", idx.get("percentChange", 0)) or 0)
        emoji = "🟢" if pct > 0 else ("🔴" if pct < 0 else "⚪")
        reply += f"| {name} | {current} | {emoji} {'+' if pct > 0 else ''}{pct:.1f}% |\n"
    
    return reply


async def handle_stock_info(symbols: list[str]) -> str:
    if not symbols:
        return "Which stock would you like to know about? Give me a symbol like **NABIL**, **NICA**, or **SBI**."
    
    sym = symbols[0]
    live_data = cache.get("live_trading") or []
    
    stock = None
    for s in live_data:
        if isinstance(s, dict) and s.get("symbol", "").upper() == sym.upper():
            stock = s
            break
    
    if not stock:
        # Try prediction as fallback info
        predictor = get_predictor()
        if predictor.loaded and sym.upper() in predictor.get_supported_symbols():
            return await handle_predict(f"predict {sym}", [sym])
        return f"I don't have live data for **{sym}** right now. The market may be closed, or the symbol might not be listed."
    
    reply = f"### 📋 {sym} — Quick Overview\n\n"
    
    ltp = stock.get("lastTradedPrice", "N/A")
    open_p = stock.get("openPrice", "N/A")
    high = stock.get("highPrice", "N/A")
    low = stock.get("lowPrice", "N/A")
    pct = stock.get("percentageChange", 0)
    turnover = stock.get("totalTradeValue", 0)
    qty = stock.get("totalTradeQuantity", 0)
    prev = stock.get("previousClose", stock.get("previousDayClosePrice", "N/A"))
    
    direction = "🟢" if (pct or 0) > 0 else ("🔴" if (pct or 0) < 0 else "⚪")
    
    reply += f"| Metric | Value |\n"
    reply += f"|--------|-------|\n"
    reply += f"| LTP | **Rs. {ltp}** {direction} ({'+' if (pct or 0) > 0 else ''}{pct:.1f}%) |\n"
    reply += f"| Open | Rs. {open_p} |\n"
    reply += f"| High / Low | Rs. {high} / Rs. {low} |\n"
    reply += f"| Previous Close | Rs. {prev} |\n"
    reply += f"| Turnover | {_fmt_rs(turnover)} |\n"
    reply += f"| Volume | {qty:,} shares |\n"
    
    # Add prediction if available
    predictor = get_predictor()
    if predictor.loaded and sym.upper() in predictor.get_supported_symbols():
        pred = predictor.predict(sym)
        if pred:
            reply += f"\n**ML Forecast for next session:**\n"
            reply += f"- Target: **Rs. {pred['predicted_close']}** ({'+' if pred['predicted_change_pct'] > 0 else ''}{pred['predicted_change_pct']}%)\n"
            reply += f"- Signal: {pred['direction']}\n"
    
    return reply


async def handle_thanks() -> str:
    return "You're welcome! 🙏 Feel free to ask me anything else about NEPSE."


async def handle_goodbye() -> str:
    return "Happy trading! Remember — always do your own research. See you next time! 👋"


async def handle_general(msg: str) -> str:
    """Fallback for unrecognized queries."""
    predictor = get_predictor()
    n_symbols = len(predictor.get_supported_symbols()) if predictor.loaded else 0
    
    return (
        f"I'm not sure I understood that perfectly, but I'm here to help! 🤔\n\n"
        f"I'm specialized in **NEPSE market intelligence**"
        f"{f' with ML models covering {n_symbols} stocks' if n_symbols else ''}. "
        f"Here are some things you can try:\n\n"
        f"- **\"Predict NABIL\"** — ML price forecast\n"
        f"- **\"How's the market?\"** — live overview\n"
        f"- **\"Compare NICA vs SBI\"** — head-to-head\n"
        f"- **\"Top gainers\"** — today's winners\n"
        f"- **\"Banking sector\"** — sector breakdown\n"
        f"- **\"Help\"** — full command list\n\n"
        f"Just ask naturally — I'll figure it out! 💡"
    )


# ──────────────────────────────────────────────────────
# Main Endpoint
# ──────────────────────────────────────────────────────

@router.post("")
async def chat_with_saarathi(req: ChatRequest):
    """
    Smart conversational AI for NEPSE analysis.
    NO external LLMs — uses intent classification + market data + ML predictions.
    """
    # Extract the user's message
    if req.messages:
        user_msgs = [m for m in req.messages if m.role == "user"]
        msg = user_msgs[-1].content if user_msgs else ""
    else:
        msg = req.message
    
    if not msg.strip():
        return {"status": "ok", "reply": "How can I help you analyze the market today?"}
    
    try:
        # Classify intent
        intent = classify_intent(msg)
        
        # Extract entities
        predictor = get_predictor()
        supported = predictor.get_supported_symbols() if predictor.loaded else []
        symbols = extract_symbols(msg, supported)
        sector = extract_sector(msg)
        
        logger.info(f"Chat — Intent: {intent} | Symbols: {symbols} | Sector: {sector} | Msg: {msg[:80]}")
        
        # Route to handler
        if intent == "greeting":
            reply = await handle_greeting(msg, req.messages)
        elif intent == "help":
            reply = await handle_help(msg)
        elif intent == "predict":
            reply = await handle_predict(msg, symbols)
        elif intent == "compare":
            reply = await handle_compare(msg, symbols)
        elif intent == "market_overview":
            reply = await handle_market_overview()
        elif intent == "gainers":
            reply = await handle_gainers()
        elif intent == "losers":
            reply = await handle_losers()
        elif intent == "turnover":
            reply = await handle_turnover()
        elif intent == "sector":
            reply = await handle_sector(sector)
        elif intent == "stock_info":
            if symbols:
                reply = await handle_stock_info(symbols)
            elif sector:
                reply = await handle_sector(sector)
            else:
                reply = await handle_stock_info([])
        elif intent == "thanks":
            reply = await handle_thanks()
        elif intent == "goodbye":
            reply = await handle_goodbye()
        else:
            # General: check if symbols were mentioned
            if symbols:
                reply = await handle_predict(msg, symbols)
            else:
                reply = await handle_general(msg)
        
        return {"status": "ok", "reply": reply}
    
    except Exception as e:
        logger.error(f"Chat handler error: {e}", exc_info=True)
        return {
            "status": "ok",
            "reply": f"I ran into a hiccup processing that. Please try again or rephrase your question.\n\n*Technical: {str(e)[:100]}*"
        }
