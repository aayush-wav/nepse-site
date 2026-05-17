import { useQuery } from "@tanstack/react-query";
import { nepseApi } from "@/lib/api";
import { useMemo } from "react";

function useIsMarketOpen(): boolean {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const npt = new Date(utcMs + 5.75 * 3600000);
  const day = npt.getDay();
  if (day === 5 || day === 6) return false;
  const mins = npt.getHours() * 60 + npt.getMinutes();
  return mins >= 595 && mins < 910; // 9:55 AM to 3:10 PM NPT (slight buffer)
}

const FAST = 10 * 1000;       // 10s — aggressive live polling
const MEDIUM = 30 * 1000;     // 30s
const SLOW = 2 * 60 * 1000;   // 2min (off-hours)
const STATIC = 30 * 60 * 1000; // 30min (rarely changes)

function useLiveInterval() {
  const open = useIsMarketOpen();
  return useMemo(() => ({
    fast: open ? FAST : SLOW,
    medium: open ? MEDIUM : SLOW,
    stale: open ? FAST : SLOW,
    staleMed: open ? MEDIUM : SLOW,
  }), [open]);
}

export const useDashboard = () => {
  const { fast, stale } = useLiveInterval();
  return useQuery({ queryKey: ["dashboard"], queryFn: nepseApi.getDashboard, staleTime: stale, refetchInterval: fast });
};

export const useLiveTrading = () => {
  const { fast, stale } = useLiveInterval();
  return useQuery({ queryKey: ["live-trading"], queryFn: nepseApi.getLiveTrading, staleTime: stale, refetchInterval: fast });
};

export const useTopGainers = () => {
  const { fast, stale } = useLiveInterval();
  return useQuery({ queryKey: ["top-gainers"], queryFn: nepseApi.getTopGainers, staleTime: stale, refetchInterval: fast });
};

export const useTopLosers = () => {
  const { fast, stale } = useLiveInterval();
  return useQuery({ queryKey: ["top-losers"], queryFn: nepseApi.getTopLosers, staleTime: stale, refetchInterval: fast });
};

export const useTopTurnover = () => {
  const { fast, stale } = useLiveInterval();
  return useQuery({ queryKey: ["top-turnover"], queryFn: nepseApi.getTopTurnover, staleTime: stale, refetchInterval: fast });
};

export const useTopVolume = () => {
  const { fast, stale } = useLiveInterval();
  return useQuery({ queryKey: ["top-volume"], queryFn: nepseApi.getTopVolume, staleTime: stale, refetchInterval: fast });
};

export const useMarketStatus = () => {
  const { fast, stale } = useLiveInterval();
  return useQuery({ queryKey: ["market-status"], queryFn: nepseApi.getMarketStatus, staleTime: stale, refetchInterval: fast });
};

export const useMarketSummary = () => {
  const { fast, stale } = useLiveInterval();
  return useQuery({ queryKey: ["market-summary"], queryFn: nepseApi.getMarketSummary, staleTime: stale, refetchInterval: fast });
};

export const useNepseIndex = () => {
  const { fast, stale } = useLiveInterval();
  return useQuery({ queryKey: ["nepse-index"], queryFn: nepseApi.getNepseIndex, staleTime: stale, refetchInterval: fast });
};

export const useSectorIndices = () => {
  const { medium, staleMed } = useLiveInterval();
  return useQuery({ queryKey: ["sector-indices"], queryFn: nepseApi.getSectorIndices, staleTime: staleMed, refetchInterval: medium });
};

export const useCompanyList = () =>
  useQuery({ queryKey: ["company-list"], queryFn: nepseApi.getCompanyList, staleTime: STATIC });

export const useStockPrice = (symbol: string) => {
  const { fast, stale } = useLiveInterval();
  return useQuery({ queryKey: ["stock-price", symbol], queryFn: () => nepseApi.getStockPrice(symbol), staleTime: stale, refetchInterval: fast, enabled: !!symbol });
};

export const useStockDetail = (symbol: string) => {
  const { medium, staleMed } = useLiveInterval();
  return useQuery({ queryKey: ["stock-detail", symbol], queryFn: () => nepseApi.getStockDetail(symbol), staleTime: staleMed, refetchInterval: medium, enabled: !!symbol });
};

export const useStockChart = (symbol: string) => {
  const { medium, staleMed } = useLiveInterval();
  return useQuery({ queryKey: ["stock-chart", symbol], queryFn: () => nepseApi.getStockChart(symbol), staleTime: staleMed, refetchInterval: medium, enabled: !!symbol });
};

export const useFloorsheet = () => {
  const { medium, staleMed } = useLiveInterval();
  return useQuery({ queryKey: ["floorsheet"], queryFn: nepseApi.getFloorsheet, staleTime: staleMed, refetchInterval: medium });
};

export const useCompanyFloorsheet = (symbol: string) => {
  const { medium, staleMed } = useLiveInterval();
  return useQuery({ queryKey: ["floorsheet", symbol], queryFn: () => nepseApi.getCompanyFloorsheet(symbol), staleTime: staleMed, refetchInterval: medium, enabled: !!symbol });
};

export const useNews = () => {
  const { medium, staleMed } = useLiveInterval();
  return useQuery({ queryKey: ["news"], queryFn: nepseApi.getNews, staleTime: staleMed, refetchInterval: medium });
};

export const useBrokers = () =>
  useQuery({ queryKey: ["brokers"], queryFn: nepseApi.getBrokers, staleTime: STATIC });

export const useBrokerDetail = (id: string) => {
  const { medium, staleMed } = useLiveInterval();
  return useQuery({ queryKey: ["broker-detail", id], queryFn: () => nepseApi.getBrokerDetail(id), staleTime: staleMed, refetchInterval: medium, enabled: !!id });
};
