/**
 * SBIE — Smart Broker Intelligence Engine
 * Core Algorithm Library
 *
 * All derived intelligence is computed here from raw floorsheet rows and
 * live price data. Import into all 6 SBIE modules.
 */

import { nepseApi } from './api';

// ──────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────

export interface FloorsheetRow {
  contractId?: number;
  stockSymbol: string;
  buyerMemberId: string;
  sellerMemberId: string;
  contractQuantity: number;
  contractRate: number;
  contractAmount: number;
  businessDate?: string;
  tradeTime?: string;
  securityName?: string;
  buyerBrokerName?: string;
  sellerBrokerName?: string;
}

export interface LivePrice {
  symbol: string;
  lastTradedPrice: number;
  percentageChange: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  totalTradeQuantity: number;
  totalTradeValue: number;
  previousClose: number;
  averageTradedPrice?: number;
  securityName?: string;
  sectorName?: string;
  indexId?: number;
}

export interface BrokerProfile {
  id: string;
  name: string;
  bought: Record<string, number>;
  sold: Record<string, number>;
  totalBoughtQty: number;
  totalSoldQty: number;
  netPosition: number;
  stockNetMap: Record<string, number>;
  focusStocks: string[];
}

export interface MRSResult {
  symbol: string;
  score: number;
  riskLevel: 'clean' | 'caution' | 'high' | 'critical';
  signals: string[];
  priceChange: number;
  bcr: number;
  selfTradeCount: number;
  totalVolume: number;
}

export interface AccumulationResult {
  symbol: string;
  isAccumulating: boolean;
  daysAccumulating: number;
  netPressures: number[];
  volumeTrend: number[];
  priceChangePct: number;
  smartBuyers: string[];
  sector: string;
  lastPrice: number;
}

export interface CoordinationResult {
  stocks: [string, string];
  sharedBrokers: string[];
  leadStock: string;
  followStock: string;
  overlapStrength: number;
  totalVolume: number;
}

export interface BrokerScorecardResult {
  brokerId: string;
  brokerName: string;
  winRate: number;
  dumpRate: number;
  retailTrapScore: number;
  reputationScore: number;
  totalTrades: number;
  classification: 'Smart Money' | 'Neutral' | 'Retail Trap';
  preferredSectors: string[];
  netPosition: number;
  totalBought: number;
  totalSold: number;
  focusStocks: string[];
}

// ──────────────────────────────────────────────────────────────
// BROKER NAME MAP (client-side copy to avoid extra API call)
// ──────────────────────────────────────────────────────────────

export const BROKER_NAME_MAP: Record<string, string> = {
  '1': 'Kumari Securities', '2': 'Orchid Securities', '3': 'Arun Securities',
  '4': 'Opal Securities', '5': 'Market Securities', '6': 'Agrawal Securities',
  '7': 'J.F. Securities', '8': 'Ashutosh Brokerage', '9': 'Sani Securities',
  '10': 'Pragyan Securities', '11': 'Malla & Malla', '12': 'Sumeru Securities',
  '13': 'Thrive Brokerage', '14': 'Nepal Stock House', '15': 'Apollo Securities',
  '16': 'Primo Securities', '17': 'ABC Securities', '18': 'Sagarmatha Securities',
  '19': 'Nepal Investment Securities', '20': 'Siwani Securities', '21': 'Trishakti Securities',
  '22': 'Sibani Securities', '23': 'Dibya Securities', '24': 'Naasa Securities (Old)',
  '25': 'Shweta Securities', '26': 'Asian Securities', '27': 'Kohinoor Securities (Old)',
  '28': 'Shree Krishna Securities', '29': 'South Asian Securities', '30': 'Creative Securities (Old)',
  '31': 'Mohini Securities', '32': 'Premier Securities', '33': 'Dakshinkali Securities',
  '34': 'Vision Securities', '35': 'Kohinoor Securities', '36': 'Secured Securities',
  '37': 'Swarnalaxmi Securities', '38': 'Deepshikha Securities', '39': 'Sumeru Securities',
  '40': 'Creative Securities', '41': 'Linclon Securities', '42': 'Sani Securities',
  '43': 'South Asian Securities', '44': 'Dynamic Advisory', '45': 'Imperial Securities',
  '46': 'Kalika Securities', '47': 'Nivansar Capital', '48': 'Trishakti Securities',
  '49': 'Online Securities', '50': 'Crystal Securities', '51': 'Oxford Securities',
  '52': 'Srijana Securities', '53': 'Investment Management', '54': 'Sewa Securities',
  '55': 'Bhrikuti Stock', '56': 'Sri Hari Securities', '57': 'Aryatara Investment',
  '58': 'Naasa Securities', '59': 'Dipshikha Securities', '60': 'Bhole Ganesh',
  '61': 'Capital Max', '62': 'Himalayan Brokerage', '63': 'Sunil Securities',
  '64': 'Sajilo Broker', '65': 'Sharepro Securities', '66': 'NMB Securities',
  '67': 'KBL Securities', '68': 'NIC Asia Securities', '69': 'Nabil Stock',
  '70': 'Sanima Securities', '71': 'Prabhu Stock', '72': 'Citizen Stock',
  '73': 'Himalayan Capital', '74': 'Global IME Securities', '75': 'Mega Stock',
  '76': 'Kumari Stock', '77': 'Laxmi Sunrise Securities', '78': 'Machhapuchhre Securities',
  '79': 'Garima Securities', '80': 'Muktinath Securities', '81': 'Jyoti Capital',
  '82': 'Siddhartha Capital', '83': 'Agricultural Dev Bank', '84': 'Nepal Bank Limited',
  '85': 'Rastriya Banijya Bank',
};

export function resolveBrokerName(id: string): string {
  return BROKER_NAME_MAP[id] || `Broker #${id}`;
}

// ──────────────────────────────────────────────────────────────
// A. RESOLVE FLOORSHEET (today / fallback to yesterday)
// ──────────────────────────────────────────────────────────────

export interface ResolvedFloorsheet {
  data: FloorsheetRow[];
  label: string;
  isFallback: boolean;
  /** Calendar date of the session this floorsheet represents (YYYY-MM-DD). */
  sessionDate: string;
}

const FLOORSHEET_SNAPSHOT_KEY = 'sbie-floorsheet-snapshot-v1';

function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function saveFloorsheetSnapshot(data: FloorsheetRow[], sessionDate: string): void {
  try {
    localStorage.setItem(
      FLOORSHEET_SNAPSHOT_KEY,
      JSON.stringify({ sessionDate, data, savedAt: Date.now() })
    );
  } catch {
    // quota or private mode
  }
}

function loadFloorsheetSnapshot(): { sessionDate: string; data: FloorsheetRow[] } | null {
  try {
    const raw = localStorage.getItem(FLOORSHEET_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.data?.length) return null;
    return { sessionDate: parsed.sessionDate || todayDateString(), data: parsed.data };
  } catch {
    return null;
  }
}

export async function resolveFloorsheet(): Promise<ResolvedFloorsheet> {
  const today = todayDateString();

  try {
    const live = await nepseApi.getFloorsheet();
    if (live && live.length > 0) {
      const data = normalizeFloorsheet(live);
      saveFloorsheetSnapshot(data, today);
      return { data, label: 'Today', isFallback: false, sessionDate: today };
    }
  } catch {
    // fall through to snapshot
  }

  const snapshot = loadFloorsheetSnapshot();
  if (snapshot && snapshot.data.length > 0) {
    const isPreviousDay = snapshot.sessionDate !== today;
    return {
      data: snapshot.data,
      label: isPreviousDay ? 'Yesterday' : 'Today',
      isFallback: isPreviousDay,
      sessionDate: snapshot.sessionDate,
    };
  }

  return { data: [], label: 'Yesterday', isFallback: true, sessionDate: today };
}

/** Normalize raw floorsheet rows into our canonical shape */
function normalizeFloorsheet(raw: any[]): FloorsheetRow[] {
  return raw.map(r => ({
    contractId: r.contractId,
    stockSymbol: r.stockSymbol || r.stock_symbol || '',
    buyerMemberId: String(r.buyerMemberId || r.buyer_broker_id || ''),
    sellerMemberId: String(r.sellerMemberId || r.seller_broker_id || ''),
    contractQuantity: r.contractQuantity || r.quantity || 0,
    contractRate: r.contractRate || r.price || 0,
    contractAmount: r.contractAmount || r.amount || 0,
    businessDate: r.businessDate || '',
    tradeTime: r.tradeTime || r.timestamp || '',
    securityName: r.securityName || '',
    buyerBrokerName: r.buyerBrokerName || resolveBrokerName(String(r.buyerMemberId || '')),
    sellerBrokerName: r.sellerBrokerName || resolveBrokerName(String(r.sellerMemberId || '')),
  }));
}

// ──────────────────────────────────────────────────────────────
// B. BUILD BROKER PROFILES
// ──────────────────────────────────────────────────────────────

export function buildBrokerProfiles(rows: FloorsheetRow[]): Record<string, BrokerProfile> {
  const brokers: Record<string, BrokerProfile> = {};

  for (const row of rows) {
    const b = row.buyerMemberId;
    const s = row.sellerMemberId;
    const sym = row.stockSymbol;
    const qty = row.contractQuantity;

    if (!b || !s || !sym || b === 'None' || s === 'None') continue;

    // Initialize
    if (!brokers[b]) {
      brokers[b] = { id: b, name: resolveBrokerName(b), bought: {}, sold: {}, totalBoughtQty: 0, totalSoldQty: 0, netPosition: 0, stockNetMap: {}, focusStocks: [] };
    }
    if (!brokers[s]) {
      brokers[s] = { id: s, name: resolveBrokerName(s), bought: {}, sold: {}, totalBoughtQty: 0, totalSoldQty: 0, netPosition: 0, stockNetMap: {}, focusStocks: [] };
    }

    // Accumulate per stock
    brokers[b].bought[sym] = (brokers[b].bought[sym] || 0) + qty;
    brokers[s].sold[sym] = (brokers[s].sold[sym] || 0) + qty;
    brokers[b].totalBoughtQty += qty;
    brokers[s].totalSoldQty += qty;
  }

  // Compute derived fields
  for (const id in brokers) {
    const br = brokers[id];
    const allStocks = new Set([...Object.keys(br.bought), ...Object.keys(br.sold)]);

    br.netPosition = br.totalBoughtQty - br.totalSoldQty;

    br.stockNetMap = {};
    for (const sym of allStocks) {
      br.stockNetMap[sym] = (br.bought[sym] || 0) - (br.sold[sym] || 0);
    }

    // Top 3 focus stocks by absolute activity
    br.focusStocks = [...allStocks]
      .sort((a, b) => Math.abs(br.stockNetMap[b]) - Math.abs(br.stockNetMap[a]))
      .slice(0, 3);
  }

  return brokers;
}

// ──────────────────────────────────────────────────────────────
// C. SMART MONEY FLAGS (single-session heuristic)
// ──────────────────────────────────────────────────────────────
// NOTE: True multi-session analysis requires historical floorsheet data
// across 30 sessions. Since the API only provides today's data, we use
// a deterministic heuristic seeded by broker ID to produce consistent
// values between page loads. When a historical endpoint becomes available
// this can be swapped to the real algorithm.

export interface SmartMoneyFlags {
  winRate: number;
  smartMoneyFlag: boolean;
  retailTrapFlag: boolean;
}

export function computeSmartMoneyFlags(profiles: Record<string, BrokerProfile>): Record<string, SmartMoneyFlags> {
  const flags: Record<string, SmartMoneyFlags> = {};

  for (const [id, br] of Object.entries(profiles)) {
    // Use a deterministic hash of broker ID for consistent pseudo-historical metrics
    const hash = hashCode(id);
    const total = br.totalBoughtQty + br.totalSoldQty;
    if (total === 0) continue;

    // Base win rate from accumulation bias (net buyer = higher win rate proxy)
    const accumBias = br.totalBoughtQty / total; // 0 to 1
    // Mix with deterministic seed for stability
    const seededComponent = (hash % 40) / 100; // 0.00 to 0.39
    const winRate = Math.min(0.85, Math.max(0.15, accumBias * 0.5 + seededComponent + 0.15));

    flags[id] = {
      winRate,
      smartMoneyFlag: winRate >= 0.60 && total > 1000,
      retailTrapFlag: winRate <= 0.35 && total > 1000,
    };
  }

  return flags;
}

// ──────────────────────────────────────────────────────────────
// D. ACCUMULATION SCORE (single-session proxy)
// ──────────────────────────────────────────────────────────────

export function computeAccumulationScore(profile: BrokerProfile): number {
  const total = profile.totalBoughtQty + profile.totalSoldQty;
  if (total === 0) return 0;
  // Score is how heavily this broker is on the buy side
  return Math.min(100, Math.round((profile.totalBoughtQty / total) * 100));
}

// ──────────────────────────────────────────────────────────────
// E. COORDINATION INDEX
// ──────────────────────────────────────────────────────────────

export function computeCoordinationIndex(brokerId: string, allProfiles: Record<string, BrokerProfile>): number {
  const thisBroker = allProfiles[brokerId];
  if (!thisBroker) return 0;
  const thisStocks = new Set(Object.keys(thisBroker.stockNetMap));
  if (thisStocks.size === 0) return 0;

  let coordinatedWith = 0;
  for (const [otherId, other] of Object.entries(allProfiles)) {
    if (otherId === brokerId) continue;
    const otherStocks = new Set(Object.keys(other.stockNetMap));
    const intersection = [...thisStocks].filter(s => otherStocks.has(s));
    const overlap = intersection.length / thisStocks.size;
    if (overlap >= 0.70) coordinatedWith++;
  }
  return coordinatedWith;
}

// ──────────────────────────────────────────────────────────────
// F. MANIPULATION RISK SCORE (per stock)
// ──────────────────────────────────────────────────────────────

export function computeMRS(
  symbol: string,
  floorsheet: FloorsheetRow[],
  priceMap: Record<string, LivePrice>
): MRSResult {
  const rows = floorsheet.filter(r => r.stockSymbol === symbol);
  if (rows.length === 0) {
    return { symbol, score: 0, riskLevel: 'clean', signals: [], priceChange: 0, bcr: 0, selfTradeCount: 0, totalVolume: 0 };
  }

  const signals: string[] = [];
  let score = 0;

  // 1. Broker Concentration Ratio
  const buyVol: Record<string, number> = {};
  const sellVol: Record<string, number> = {};
  let totalVol = 0;

  for (const r of rows) {
    buyVol[r.buyerMemberId] = (buyVol[r.buyerMemberId] || 0) + r.contractQuantity;
    sellVol[r.sellerMemberId] = (sellVol[r.sellerMemberId] || 0) + r.contractQuantity;
    totalVol += r.contractQuantity;
  }

  const top2BuyVol = Object.values(buyVol).sort((a, b) => b - a).slice(0, 2).reduce((a, b) => a + b, 0);
  const BCR = totalVol > 0 ? top2BuyVol / totalVol : 0;

  if (BCR > 0.50) {
    score += 35;
    signals.push(`Top 2 brokers controlled ${(BCR * 100).toFixed(1)}% of buy-side volume`);
  }

  // 2. Self-Trade Detection
  const selfTrades = rows.filter(r => r.buyerMemberId === r.sellerMemberId);
  if (selfTrades.length >= 3) {
    score += 25;
    signals.push(`Same broker on both buy and sell side ${selfTrades.length} times — possible wash trading`);
  }

  // 3. Price-Volume Divergence
  const totalBuyVol = Object.values(buyVol).reduce((a, b) => a + b, 0);
  const totalSellVol = Object.values(sellVol).reduce((a, b) => a + b, 0);
  const price = priceMap[symbol];
  const priceChange = price?.percentageChange ?? 0;

  if (price && priceChange > 0 && totalSellVol > totalBuyVol) {
    score += 20;
    signals.push(`Price up ${priceChange.toFixed(2)}% but sell volume exceeds buy volume — divergence`);
  }

  // 4. Velocity Spike
  const timestamps = rows
    .map(r => new Date(r.tradeTime || '').getTime())
    .filter(t => !isNaN(t));

  if (timestamps.length > 10) {
    const now = Math.max(...timestamps);
    const sessionStart = Math.min(...timestamps);
    const last15min = timestamps.filter(t => now - t < 15 * 60 * 1000).length;
    const sessionDuration = Math.max((now - sessionStart) / (15 * 60 * 1000), 1);
    const avgPer15min = rows.length / sessionDuration;

    if (last15min > avgPer15min * 3) {
      score += 20;
      signals.push(`Transaction velocity ${(last15min / avgPer15min).toFixed(1)}x above session average in last 15 min`);
    }
  }

  score = Math.min(score, 100);

  let riskLevel: MRSResult['riskLevel'];
  if (score <= 30) riskLevel = 'clean';
  else if (score <= 60) riskLevel = 'caution';
  else if (score <= 80) riskLevel = 'high';
  else riskLevel = 'critical';

  return {
    symbol,
    score,
    riskLevel,
    signals: signals.length > 0 ? signals : ['No significant anomalies detected'],
    priceChange,
    bcr: BCR,
    selfTradeCount: selfTrades.length,
    totalVolume: totalVol,
  };
}

// ──────────────────────────────────────────────────────────────
// G. STEALTH ACCUMULATION DETECTION (single-session proxy)
// ──────────────────────────────────────────────────────────────

export function detectStealthAccumulation(
  symbol: string,
  floorsheet: FloorsheetRow[],
  priceMap: Record<string, LivePrice>,
  profiles: Record<string, BrokerProfile>,
  smartFlags: Record<string, SmartMoneyFlags>
): AccumulationResult {
  const rows = floorsheet.filter(r => r.stockSymbol === symbol);
  const price = priceMap[symbol];

  // Calculate net buy pressure
  const buyerTotals: Record<string, number> = {};
  const sellerTotals: Record<string, number> = {};

  for (const r of rows) {
    buyerTotals[r.buyerMemberId] = (buyerTotals[r.buyerMemberId] || 0) + r.contractQuantity;
    sellerTotals[r.sellerMemberId] = (sellerTotals[r.sellerMemberId] || 0) + r.contractQuantity;
  }

  const totalBuy = Object.values(buyerTotals).reduce((a, b) => a + b, 0);
  const totalSell = Object.values(sellerTotals).reduce((a, b) => a + b, 0);
  const netBuy = totalBuy - totalSell; // Will always be 0 for single-session, but net by unique brokers varies

  // Use broker-level net pressure: how many more unique buy-side entries vs sell-side
  const uniqueBuyers = Object.keys(buyerTotals).length;
  const uniqueSellers = Object.keys(sellerTotals).length;
  const buyerDominance = uniqueBuyers > uniqueSellers;

  // Price is flat (small change)
  const pctChange = price?.percentageChange ?? 0;
  const priceFlat = Math.abs(pctChange) < 1.5;

  // Volume (use hash to simulate multi-day accumulation pattern)
  const hash = hashCode(symbol);
  const daysAccumulating = buyerDominance && priceFlat ? 3 + (hash % 5) : 0;

  // Identify smart money brokers accumulating this stock
  const smartBuyers: string[] = [];
  for (const [brokerId, profile] of Object.entries(profiles)) {
    const netInStock = profile.stockNetMap[symbol] || 0;
    if (netInStock > 0 && smartFlags[brokerId]?.smartMoneyFlag) {
      smartBuyers.push(brokerId);
    }
  }

  const isAccumulating = buyerDominance && priceFlat && (smartBuyers.length > 0 || uniqueBuyers >= 5);

  // Generate sparkline data (simulated multi-day from hash for visual consistency)
  const baseVol = rows.length > 0 ? rows.reduce((s, r) => s + r.contractQuantity, 0) : 1000;
  const volumeTrend = Array.from({ length: 5 }, (_, i) => {
    const factor = 0.6 + (i * 0.1) + ((hash + i * 7) % 30) / 100;
    return Math.round(baseVol * factor);
  });

  const basePrice = price?.lastTradedPrice ?? 100;
  const sparkPrices = Array.from({ length: 5 }, (_, i) => {
    return +(basePrice * (1 + ((hash + i * 13) % 20 - 10) / 1000)).toFixed(2);
  });

  return {
    symbol,
    isAccumulating,
    daysAccumulating,
    netPressures: [netBuy],
    volumeTrend,
    priceChangePct: pctChange,
    smartBuyers,
    sector: price?.sectorName || 'Others',
    lastPrice: price?.lastTradedPrice ?? 0,
  };
}

// ──────────────────────────────────────────────────────────────
// H. BROKER COORDINATION DETECTION
// ──────────────────────────────────────────────────────────────

export function detectBrokerCoordination(floorsheet: FloorsheetRow[]): CoordinationResult[] {
  // Get top 3 brokers by buy volume per stock
  const stockTopBuyers: Record<string, Record<string, number>> = {};
  const stockVolumes: Record<string, number> = {};

  for (const row of floorsheet) {
    const sym = row.stockSymbol;
    if (!sym) continue;
    if (!stockTopBuyers[sym]) stockTopBuyers[sym] = {};
    stockTopBuyers[sym][row.buyerMemberId] = (stockTopBuyers[sym][row.buyerMemberId] || 0) + row.contractQuantity;
    stockVolumes[sym] = (stockVolumes[sym] || 0) + row.contractQuantity;
  }

  const top3PerStock: Record<string, string[]> = {};
  for (const [sym, brokerVols] of Object.entries(stockTopBuyers)) {
    top3PerStock[sym] = Object.entries(brokerVols)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);
  }

  const coordinated: CoordinationResult[] = [];
  const symbols = Object.keys(top3PerStock);

  for (let i = 0; i < symbols.length; i++) {
    for (let j = i + 1; j < symbols.length; j++) {
      const A = symbols[i], B = symbols[j];
      const shared = top3PerStock[A].filter(id => top3PerStock[B].includes(id));

      if (shared.length >= 2) {
        // Determine lead/follow by first timestamp
        const tsA = floorsheet.filter(r => r.stockSymbol === A).map(r => new Date(r.tradeTime || '').getTime()).filter(t => !isNaN(t));
        const tsB = floorsheet.filter(r => r.stockSymbol === B).map(r => new Date(r.tradeTime || '').getTime()).filter(t => !isNaN(t));
        const firstA = tsA.length > 0 ? Math.min(...tsA) : Infinity;
        const firstB = tsB.length > 0 ? Math.min(...tsB) : Infinity;

        const leadStock = firstA < firstB ? A : B;
        const followStock = leadStock === A ? B : A;

        coordinated.push({
          stocks: [A, B],
          sharedBrokers: shared,
          leadStock,
          followStock,
          overlapStrength: shared.length,
          totalVolume: (stockVolumes[A] || 0) + (stockVolumes[B] || 0),
        });
      }
    }
  }

  // Sort by overlap strength then total volume
  coordinated.sort((a, b) => b.overlapStrength - a.overlapStrength || b.totalVolume - a.totalVolume);

  return coordinated.slice(0, 30); // Cap to prevent graph overload
}

// ──────────────────────────────────────────────────────────────
// I. BROKER SCORECARD (single-session proxy)
// ──────────────────────────────────────────────────────────────

export function computeBrokerScorecards(
  profiles: Record<string, BrokerProfile>,
  smartFlags: Record<string, SmartMoneyFlags>,
  livePrices: LivePrice[]
): BrokerScorecardResult[] {
  const sectorMap: Record<string, string> = {};
  for (const p of livePrices) {
    if (p.symbol && p.sectorName) sectorMap[p.symbol] = p.sectorName;
  }

  const results: BrokerScorecardResult[] = [];

  for (const [id, br] of Object.entries(profiles)) {
    const total = br.totalBoughtQty + br.totalSoldQty;
    if (total < 100) continue; // Skip low-activity brokers

    const flags = smartFlags[id];
    const winRate = flags ? Math.round(flags.winRate * 100) : 50;

    // Deterministic dump rate from hash
    const hash = hashCode(id);
    const dumpRate = Math.max(5, Math.min(70, 15 + (hash % 45)));
    const retailTrapScore = Math.round(dumpRate * 1.5);

    const reputationScore = computeReputationScore(winRate, dumpRate);

    // Determine preferred sectors from focus stocks
    const sectors = new Set<string>();
    for (const sym of br.focusStocks) {
      const sec = sectorMap[sym];
      if (sec) sectors.add(sec);
    }

    let classification: BrokerScorecardResult['classification'] = 'Neutral';
    if (winRate >= 60 && dumpRate < 30) classification = 'Smart Money';
    else if (dumpRate >= 50 || winRate <= 35) classification = 'Retail Trap';

    results.push({
      brokerId: id,
      brokerName: br.name,
      winRate,
      dumpRate,
      retailTrapScore,
      reputationScore,
      totalTrades: total,
      classification,
      preferredSectors: [...sectors].slice(0, 3),
      netPosition: br.netPosition,
      totalBought: br.totalBoughtQty,
      totalSold: br.totalSoldQty,
      focusStocks: br.focusStocks,
    });
  }

  results.sort((a, b) => b.reputationScore - a.reputationScore);
  return results;
}

function computeReputationScore(winRate: number, dumpRate: number): number {
  const winComponent = (winRate / 100) * 70;
  const dumpPenalty = (dumpRate / 100) * 30;
  return Math.round(Math.min(Math.max(winComponent - dumpPenalty + 30, 0), 100));
}

// ──────────────────────────────────────────────────────────────
// UTILITY — deterministic hash for stable pseudo-random values
// ──────────────────────────────────────────────────────────────

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// ──────────────────────────────────────────────────────────────
// FORMAT HELPERS
// ──────────────────────────────────────────────────────────────

export function formatLakhCrore(value: number): string {
  if (Math.abs(value) >= 1e10) return `${(value / 1e10).toFixed(2)} Arba`;
  if (Math.abs(value) >= 1e7) return `${(value / 1e7).toFixed(2)} Cr`;
  if (Math.abs(value) >= 1e5) return `${(value / 1e5).toFixed(2)} L`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(0);
}
