import { useEffect, useRef, useState, useMemo } from 'react';
import { useCoordination } from '../../hooks/useSBIE';
import { Network, Bell, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import * as d3 from 'd3-force';
import { resolveBrokerName } from '../../lib/sbie-algorithms';

function FallbackBanner({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-yellow/10 border border-neutral-yellow/20 text-neutral-yellow text-xs font-bold mb-4">
      <div className="w-1.5 h-1.5 rounded-full bg-neutral-yellow animate-pulse" />
      Market not yet open — showing {label.toLowerCase()}'s data
    </div>
  );
}

// React wrapper for d3-force simulation
function useD3Force(initialNodes: any[], initialLinks: any[], width: number, height: number) {
  const [nodes, setNodes] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);

  useEffect(() => {
    if (!initialNodes.length) return;

    // Deep copy for D3 to mutate
    const d3Nodes = initialNodes.map(n => ({ ...n }));
    const d3Links = initialLinks.map(l => ({ ...l }));

    const simulation = d3.forceSimulation(d3Nodes)
      .force("link", d3.forceLink(d3Links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius((d: any) => d.val + 10))
      .on("tick", () => {
        // Trigger React re-render on every tick
        setNodes([...d3Nodes]);
        setLinks([...d3Links]);
      });

    // Run for a fixed number of ticks then stop to avoid infinite re-renders
    simulation.tick(100);
    setNodes([...d3Nodes]);
    setLinks([...d3Links]);
    simulation.stop();

    return () => {
      simulation.stop();
    };
  }, [initialNodes, initialLinks, width, height]);

  return { nodes, links };
}

export default function BrokerCoordinationAlert() {
  const { data, isLoading } = useCoordination();
  const [subscribed, setSubscribed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const width = 800;
  const height = 500;
  
  const { nodes, links } = useD3Force(
    data?.nodes || [], 
    data?.links || [], 
    width, 
    height
  );

  const sectorColors: Record<string, string> = {
    'Commercial Banks': '#10B981', // green
    'Hydropower': '#3B82F6', // blue
    'Life Insurance': '#8B5CF6', // purple
    'Microfinance': '#F59E0B', // orange
    'Finance': '#14B8A6', // teal
    'Development Banks': '#EAB308', // yellow
    'Others': '#6B7280' // gray
  };

  const activeSectors = useMemo(() => {
    if (!data?.nodes) return [];
    return [...new Set(data.nodes.map(n => n.sector))].sort();
  }, [data?.nodes]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-cyan" />
        <p className="text-text-secondary animate-pulse text-sm font-syne uppercase tracking-widest">Mapping Broker Networks...</p>
      </div>
    );
  }

  const { alerts = [] } = data || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-syne text-2xl font-bold flex items-center gap-3">
            <Network className="text-brand-cyan" /> Broker Coordination Map
          </h1>
          <p className="text-xs text-text-secondary mt-1">Network analysis identifying clusters of brokers active across multiple stocks simultaneously.</p>
        </div>
      </div>
      
      {data?.isFallback && <FallbackBanner label={data.dataLabel} />}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 card p-1 overflow-hidden" ref={containerRef}>
          <div className="relative w-full aspect-[16/10] lg:aspect-video bg-bg-surface/50 rounded-xl overflow-hidden flex items-center justify-center">
            {nodes.length > 0 ? (
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                {/* Edges */}
                <g strokeOpacity={0.6}>
                  {links.map((link: any, i: number) => {
                    return (
                      <line 
                        key={i} 
                        x1={link.source.x} 
                        y1={link.source.y} 
                        x2={link.target.x} 
                        y2={link.target.y} 
                        stroke="rgba(100, 116, 139, 0.5)" 
                        strokeWidth={Math.max(1, link.strength)} 
                      />
                    );
                  })}
                </g>
                {/* Nodes */}
                <g>
                  {nodes.map((node: any) => (
                    <g key={node.id} transform={`translate(${node.x || width/2}, ${node.y || height/2})`} className="cursor-pointer group">
                      <circle 
                        r={Math.max(node.val, 15)} 
                        fill={sectorColors[node.sector] || sectorColors['Others']} 
                        className="opacity-80 group-hover:opacity-100 transition-opacity drop-shadow-lg"
                      />
                      <text 
                        dy=".3em" textAnchor="middle" 
                        className="text-[10px] font-bold font-syne pointer-events-none fill-white drop-shadow-md"
                      >
                        {node.id}
                      </text>
                      
                      {/* Tooltip on hover (SVG title) */}
                      <title>{node.id} ({node.sector}){'\n'}Shared Brokers: {node.brokers.map((b: string) => resolveBrokerName(b)).join(', ')}</title>
                    </g>
                  ))}
                </g>
              </svg>
            ) : (
              <div className="text-center text-text-muted">
                <Network size={48} className="mx-auto mb-4 opacity-20" />
                <p>No significant broker coordination networks detected.</p>
              </div>
            )}
            
            <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
              {activeSectors.map((name) => (
                <div key={name} className="flex items-center gap-2 text-[10px] text-text-secondary bg-bg-base/80 px-2 py-1 rounded backdrop-blur border border-bg-border/50">
                  <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: sectorColors[name] || sectorColors['Others'] }} />
                  {name}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-4">
          <div className="card p-5 h-[calc(100%-140px)] flex flex-col">
            <h3 className="font-syne font-bold mb-4 flex items-center gap-2"><Bell size={16} className="text-brand-gold"/> Live Alerts</h3>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
              {alerts.length > 0 ? (
                alerts.map((alert: string, i: number) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                    key={i} className="text-xs p-3 rounded-lg border border-brand-gold/20 bg-brand-gold/5 text-text-primary leading-relaxed"
                  >
                    {alert}
                  </motion.div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-text-muted opacity-50 space-y-2">
                  <Bell size={24} />
                  <p className="text-xs text-center">No coordination alerts right now.</p>
                </div>
              )}
            </div>
          </div>

          <div className="card p-5 bg-gradient-to-br from-bg-surface to-brand-cyan/5 border-brand-cyan/20 shrink-0">
            <h3 className="font-syne font-bold mb-2">Smart Money Tracking</h3>
            <p className="text-[10px] text-text-secondary mb-4 leading-relaxed">Get instant push notifications when high-reputation brokers enter a new position simultaneously.</p>
            <button 
              onClick={() => setSubscribed(!subscribed)}
              className={`w-full py-2 text-xs rounded-lg font-bold transition-colors ${
                subscribed ? 'bg-bg-elevated text-text-muted border border-bg-border' : 'btn-primary'
              }`}
            >
              {subscribed ? 'Notifications Active' : 'Enable Coordination Alerts'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
