// ============================================
// NEPSE Elite — API Service Layer
// Fetches real data from NEPSE via our proxy server
// Falls back to seed data when API is unavailable
// ============================================

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    console.warn(`API fetch failed: ${path}`);
    return null;
  }
}

// ─── Market Status ────────────────────────────────────
export async function fetchMarketStatus() {
  return apiFetch<{ isOpen: string }>('/market-status');
}

// ─── Market Summary / Indices ─────────────────────────
export async function fetchMarketSummary() {
  return apiFetch<any>('/market-summary');
}

export async function fetchIndex() {
  return apiFetch<any>('/index');
}

// ─── Today's Prices (all stocks) ──────────────────────
export async function fetchTodayPrices() {
  return apiFetch<any>('/today-price');
}

// ─── Top Lists ────────────────────────────────────────
export async function fetchTopGainers() {
  return apiFetch<any[]>('/top-gainers');
}

export async function fetchTopLosers() {
  return apiFetch<any[]>('/top-losers');
}

export async function fetchTopVolume() {
  return apiFetch<any[]>('/top-volume');
}

export async function fetchTopTurnover() {
  return apiFetch<any[]>('/top-turnover');
}

// ─── Company / Security ───────────────────────────────
export async function fetchCompanies() {
  return apiFetch<any[]>('/companies');
}

export async function fetchSecurityDetail(id: string | number) {
  return apiFetch<any>(`/security/${id}`);
}

export async function fetchGraphData(id: string | number) {
  return apiFetch<any>(`/graph/${id}`);
}

// ─── Floorsheet ───────────────────────────────────────
export async function fetchFloorsheet(size = 200) {
  return apiFetch<any>('/floorsheet', {
    method: 'POST',
    body: JSON.stringify({
      id: '',
      size,
      sort: { sort: [{ field: 'contractId', dir: 'asc' }] },
    }),
  });
}

// ─── Sectors ──────────────────────────────────────────
export async function fetchSectors() {
  return apiFetch<any[]>('/sectors');
}

// ─── Supply / Demand ──────────────────────────────────
export async function fetchSupplyDemand() {
  return apiFetch<any>('/supply-demand');
}

// ─── Brokers ──────────────────────────────────────────
export async function fetchBrokers() {
  return apiFetch<any>('/brokers');
}

// ─── Company Price (for Charts) ───────────────────────
export async function fetchCompanyPrice(symbol: string) {
  return apiFetch<any>(`/company-price/${symbol}`);
}

// ─── Health Check ─────────────────────────────────────
export async function checkApiHealth() {
  return apiFetch<{ status: string; cache_size: number }>('/health');
}
