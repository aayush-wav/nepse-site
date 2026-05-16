import { motion } from 'framer-motion';
import { BookOpen, TrendingUp, Shield, BarChart2, Calculator, ChevronRight } from 'lucide-react';

const topics = [
  {
    icon: TrendingUp, title: 'How NEPSE Works', color: 'text-brand-cyan', bg: 'bg-brand-cyan/10',
    description: 'Understand the mechanics of Nepal Stock Exchange — trading hours, settlement cycles, and market participants.',
    articles: ['Trading hours: Sunday–Thursday, 11:00 AM–3:00 PM', 'T+3 settlement cycle for all equity trades', 'SEBON regulations and investor protections'],
  },
  {
    icon: Shield, title: 'Fundamental Analysis', color: 'text-bull-green', bg: 'bg-bull-green/10',
    description: 'Learn how to evaluate company health using financial ratios, earnings reports, and balance sheets.',
    articles: ['P/E Ratio: What it tells you', 'EPS growth and profitability', 'Understanding book value and NAV'],
  },
  {
    icon: BarChart2, title: 'Technical Analysis', color: 'text-brand-violet', bg: 'bg-brand-violet/10',
    description: 'Master chart reading, candlestick patterns, and technical indicators to time your trades better.',
    articles: ['Reading candlestick charts', 'Support and resistance levels', 'RSI, MACD, and moving averages'],
  },
  {
    icon: Calculator, title: 'Taxes & Regulations', color: 'text-brand-gold', bg: 'bg-brand-gold/10',
    description: 'Understand Capital Gains Tax (CGT), bonus shares taxation, and SEBON compliance requirements.',
    articles: ['7.5% CGT for short-term gains (<365 days)', '5% CGT for long-term gains (365+ days)', 'How bonus shares are taxed in Nepal'],
  },
  {
    icon: BookOpen, title: 'IPO Guide', color: 'text-bear-red', bg: 'bg-bear-red/10',
    description: 'Step-by-step guide to applying for IPOs through Mero Share, from BOID creation to allotment.',
    articles: ['Creating a BOID account on CDSC', 'How to apply via Mero Share', 'Checking IPO results and allotment'],
  },
  {
    icon: Shield, title: 'Risk Management', color: 'text-brand-violet', bg: 'bg-brand-violet/10',
    description: 'Build a resilient portfolio through diversification, position sizing, and stop-loss strategies.',
    articles: ['Portfolio diversification across sectors', 'Position sizing: never risk more than 5%', 'Using stop-loss orders effectively'],
  },
];

export default function Education() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-syne text-2xl font-bold">Education Hub</h1>
        <p className="text-xs text-text-secondary">Learn to invest wisely in Nepal's stock market</p>
      </div>

      {/* Hero Banner */}
      <div className="card p-8 bg-gradient-to-r from-brand-cyan/10 via-brand-violet/10 to-bg-surface border-brand-cyan/20 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-widest font-bold text-brand-cyan">Start Here</div>
          <h2 className="font-syne text-2xl font-bold text-text-primary">New to Stock Investing?</h2>
          <p className="text-sm text-text-secondary max-w-md">Our beginner's guide walks you through everything you need to know to start investing in Nepal's stock market with confidence.</p>
        </div>
        <button className="btn-primary px-8 py-3 whitespace-nowrap text-sm font-bold flex items-center gap-2">
          <BookOpen size={18} /> Start Learning
        </button>
      </div>

      {/* Topics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {topics.map((topic, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="card p-5 hover:border-bg-border/80 transition-all group cursor-pointer flex flex-col"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl ${topic.bg} flex items-center justify-center ${topic.color}`}>
                <topic.icon size={20} />
              </div>
              <h3 className={`font-syne font-bold group-hover:${topic.color} transition-colors`}>{topic.title}</h3>
            </div>
            <p className="text-xs text-text-secondary mb-4 leading-relaxed flex-1">{topic.description}</p>
            <div className="space-y-2">
              {topic.articles.map((art, j) => (
                <div key={j} className="flex items-center gap-2 text-xs text-text-secondary hover:text-text-primary cursor-pointer transition-colors">
                  <ChevronRight size={12} className={topic.color} />
                  <span>{art}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Glossary */}
      <div className="card p-6">
        <h3 className="font-syne font-bold text-lg mb-6">Quick Glossary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { term: 'LTP', def: 'Last Traded Price — the most recent price at which a security was bought or sold.' },
            { term: 'EPS', def: 'Earnings Per Share — net profit divided by total number of outstanding shares.' },
            { term: 'CGT', def: 'Capital Gains Tax — tax levied on profits from selling shares.' },
            { term: 'BOID', def: 'Beneficial Owner Identification — unique ID to hold shares in demat form.' },
            { term: 'P/E Ratio', def: 'Price-to-Earnings — measures how much investors pay per unit of earnings.' },
            { term: 'IPO', def: 'Initial Public Offering — first sale of shares by a company to the public.' },
          ].map((g, i) => (
            <div key={i} className="p-4 rounded-lg bg-bg-base/40 border border-bg-border/30">
              <span className="font-syne font-black text-brand-cyan">{g.term}: </span>
              <span className="text-sm text-text-secondary">{g.def}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
