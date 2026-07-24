"""
AI Market Flow Brief Generator — Template-based, no external LLM.
Generates professional-grade market intelligence summaries from SBIE data.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime
import logging

router = APIRouter(prefix="/api/sbie", tags=["sbie-brief"])
logger = logging.getLogger("ai_brief")


class BriefContextBroker(BaseModel):
    name: str
    winRate: float = 0


class BriefContextMRS(BaseModel):
    symbol: str
    score: float = 0


class BriefContextCluster(BaseModel):
    stocks: list[str] = []


class BriefRequest(BaseModel):
    topSmartMoneyBrokers: list[BriefContextBroker] = []
    accumulatingStocks: list[str] = []
    highestMRSStocks: list[BriefContextMRS] = []
    coordinatedClusters: list[BriefContextCluster] = []
    totalTurnover: float = 0
    sessionDate: str = ""
    dataLabel: str = ""
    isFallback: bool = False


def _fmt_turnover(val: float) -> str:
    if val >= 1e9:
        return f"Rs. {val/1e9:.2f} Arba"
    elif val >= 1e7:
        return f"Rs. {val/1e7:.2f} Crore"
    elif val >= 1e5:
        return f"Rs. {val/1e5:.2f} Lakh"
    return f"Rs. {val:,.0f}"


def _turnover_assessment(val: float) -> str:
    """Assess turnover level relative to typical NEPSE volumes."""
    arba = val / 1e9
    if arba > 5:
        return "exceptionally high volume"
    elif arba > 3:
        return "above-average institutional participation"
    elif arba > 1.5:
        return "moderate liquidity"
    elif arba > 0.5:
        return "below-average turnover suggesting cautious sentiment"
    else:
        return "very thin liquidity indicating limited institutional activity"


def generate_brief_text(data: BriefRequest) -> str:
    """Generate a 3-paragraph Market Flow Brief from SBIE context data."""
    
    session_label = data.sessionDate or "the current session"
    is_stale = data.isFallback or data.dataLabel != "Today"
    
    paragraphs = []
    
    # ── Paragraph 1: Smart Money Activity & Overview ──
    p1_parts = []
    
    if is_stale:
        p1_parts.append(
            f"This analysis reflects the previous trading session ({session_label}), "
            "not today's live market flow, as today's floorsheet data is not yet available."
        )
    
    turnover_str = _fmt_turnover(data.totalTurnover)
    turnover_desc = _turnover_assessment(data.totalTurnover)
    p1_parts.append(
        f"Total board turnover stood at {turnover_str}, reflecting {turnover_desc}."
    )
    
    if data.topSmartMoneyBrokers:
        brokers = data.topSmartMoneyBrokers
        if len(brokers) == 1:
            p1_parts.append(
                f"On the smart money front, {brokers[0].name} (win rate: {brokers[0].winRate:.0f}%) "
                f"emerged as the dominant institutional participant, driving directional flow."
            )
        elif len(brokers) == 2:
            p1_parts.append(
                f"Smart money activity was concentrated among {brokers[0].name} "
                f"({brokers[0].winRate:.0f}% win rate) and {brokers[1].name} "
                f"({brokers[1].winRate:.0f}%), both of which historically signal "
                f"informed positioning ahead of price moves."
            )
        else:
            names = ", ".join(b.name for b in brokers[:3])
            avg_wr = sum(b.winRate for b in brokers[:3]) / len(brokers[:3])
            p1_parts.append(
                f"Three smart-money classified brokers — {names} — were active with an "
                f"average win rate of {avg_wr:.0f}%, suggesting coordinated institutional "
                f"interest in the current tape."
            )
    else:
        p1_parts.append(
            "No brokers triggered the smart-money classification threshold this session, "
            "indicating a retail-dominated tape with limited institutional conviction."
        )
    
    paragraphs.append(" ".join(p1_parts))
    
    # ── Paragraph 2: Accumulation & Coordination ──
    p2_parts = []
    
    if data.accumulatingStocks:
        stocks = data.accumulatingStocks
        if len(stocks) <= 3:
            stock_list = ", ".join(stocks)
            p2_parts.append(
                f"The stealth accumulation detector flagged {stock_list} as showing "
                f"sustained buying pressure masked by controlled price movement — "
                f"a classic pre-breakout institutional pattern."
            )
        else:
            highlighted = ", ".join(stocks[:3])
            p2_parts.append(
                f"The stealth accumulation engine detected {len(stocks)} equities under "
                f"quiet accumulation, most notably {highlighted}. This breadth of hidden "
                f"buying suggests a broader institutional rotation may be underway."
            )
    else:
        p2_parts.append(
            "No stocks triggered the stealth accumulation signal this session. "
            "This absence of hidden buying patterns points to open price discovery "
            "rather than pre-positioned institutional plays."
        )
    
    if data.coordinatedClusters:
        clusters = data.coordinatedClusters
        cluster_descs = []
        for c in clusters[:2]:
            if c.stocks:
                cluster_descs.append(" + ".join(c.stocks[:4]))
        
        if cluster_descs:
            p2_parts.append(
                f"Broker coordination analysis identified {len(clusters)} active cluster(s): "
                f"{'; '.join(cluster_descs)}. These stocks share overlapping broker flow, "
                f"indicating possible sector rotation or thematic positioning by the same "
                f"institutional participants."
            )
    else:
        p2_parts.append(
            "No significant broker coordination clusters were detected, "
            "suggesting independent rather than synchronized positioning across the board."
        )
    
    paragraphs.append(" ".join(p2_parts))
    
    # ── Paragraph 3: Risks & Takeaway ──
    p3_parts = []
    
    if data.highestMRSStocks:
        mrs = data.highestMRSStocks
        if len(mrs) == 1:
            p3_parts.append(
                f"From a risk perspective, {mrs[0].symbol} registered a Manipulation Risk "
                f"Score (MRS) of {mrs[0].score:.0f}/100, warranting heightened caution. "
                f"This elevated score reflects anomalous broker concentration, possible "
                f"wash trades, or price-volume divergence patterns."
            )
        else:
            risky = ", ".join(f"{m.symbol} ({m.score:.0f})" for m in mrs[:3])
            max_score = max(m.score for m in mrs)
            p3_parts.append(
                f"The Manipulation Risk Scanner flagged {risky} with elevated MRS readings. "
                f"The highest score of {max_score:.0f}/100 signals that these names carry "
                f"outsized risk of artificial price action — traders should exercise strict "
                f"risk management on any positions in these counters."
            )
    else:
        p3_parts.append(
            "The manipulation risk scanner returned clean readings across the board. "
            "No equities triggered elevated MRS thresholds, suggesting genuine "
            "price discovery in today's session."
        )
    
    # Final quantitative takeaway
    signals = []
    if data.accumulatingStocks:
        signals.append(f"{len(data.accumulatingStocks)} accumulation signals")
    if data.coordinatedClusters:
        signals.append(f"{len(data.coordinatedClusters)} coordination clusters")
    if data.highestMRSStocks:
        signals.append(f"{len(data.highestMRSStocks)} elevated-risk names")
    
    if signals:
        p3_parts.append(
            f"Quantitative takeaway: the session produced {', '.join(signals)}. "
            f"Traders should monitor accumulation targets for potential breakout setups "
            f"while maintaining stop-losses on high-MRS names."
        )
    else:
        p3_parts.append(
            "Overall, this was a low-signal session. Absence of accumulation, "
            "coordination, and manipulation flags suggests a consolidation phase. "
            "Watch for fresh triggers in the next session's floorsheet."
        )
    
    paragraphs.append(" ".join(p3_parts))
    
    return "\n\n".join(paragraphs)


@router.post("/generate-brief")
async def generate_brief(req: BriefRequest):
    """
    Generate a Market Flow Brief from SBIE context data.
    Template-based — no external LLM required.
    """
    try:
        text = generate_brief_text(req)
        
        return {
            "status": "ok",
            "text": text,
            "sessionDate": req.sessionDate or datetime.now().strftime("%Y-%m-%d"),
            "generatedAt": datetime.now().isoformat(),
            "isFresh": not req.isFallback and req.dataLabel == "Today",
        }
    except Exception as e:
        logger.error(f"Brief generation failed: {e}", exc_info=True)
        return {
            "status": "error",
            "message": f"Failed to generate brief: {str(e)}"
        }
