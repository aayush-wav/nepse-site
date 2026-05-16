import { motion } from 'framer-motion';

interface GaugeProps {
  value: number; // -100 to 100
  label: string;
  subLabel?: string;
}

export default function TechnicalGauge({ value, label, subLabel }: GaugeProps) {
  // Map value (-100 to 100) to rotation (-90 to 90 degrees)
  const rotation = (value / 100) * 90;
  
  const getColor = (v: number) => {
    if (v < -40) return '#FF4D4F'; // Strong Sell
    if (v < -10) return '#FFA39E'; // Sell
    if (v < 10) return '#7B8DB0';  // Neutral
    if (v < 40) return '#B5F5EC';  // Buy
    return '#00C48C';              // Strong Buy
  };

  const getStatusText = (v: number) => {
    if (v < -60) return 'Strong Sell';
    if (v < -20) return 'Sell';
    if (v < 20) return 'Neutral';
    if (v < 60) return 'Buy';
    return 'Strong Buy';
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative w-48 h-24 overflow-hidden">
        {/* Semi-circle track */}
        <div className="absolute inset-0 border-[12px] border-bg-border rounded-t-full opacity-30" />
        
        {/* Colored Segments (Simplified) */}
        <div className="absolute inset-0 border-[12px] border-transparent border-t-bear-red rounded-t-full rotate-[-90deg] clip-path-half" />
        <div className="absolute inset-0 border-[12px] border-transparent border-t-bull-green rounded-t-full rotate-[90deg] clip-path-half" />

        {/* Needle */}
        <motion.div 
          className="absolute bottom-0 left-1/2 w-1 h-20 bg-text-primary origin-bottom -translate-x-1/2 z-10 rounded-full shadow-glow-cyan"
          initial={{ rotate: -90 }}
          animate={{ rotate: rotation }}
          transition={{ type: 'spring', stiffness: 60, damping: 15 }}
        >
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-brand-cyan rounded-full shadow-glow-cyan" />
        </motion.div>
        
        {/* Center hub */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-6 bg-bg-surface border-4 border-bg-border rounded-full z-20" />
      </div>

      <div className="mt-4 text-center">
         <div className="text-[10px] text-text-muted uppercase tracking-[0.2em] font-bold mb-1">{label}</div>
         <div className="text-xl font-syne font-black" style={{ color: getColor(value) }}>{getStatusText(value)}</div>
         {subLabel && <div className="text-[10px] text-text-secondary mt-1 font-jetbrains">{subLabel}</div>}
      </div>

      {/* Scale labels */}
      <div className="flex justify-between w-full mt-2 px-2 text-[8px] font-bold text-text-muted uppercase">
         <span>Sell</span>
         <span>Neutral</span>
         <span>Buy</span>
      </div>
    </div>
  );
}
