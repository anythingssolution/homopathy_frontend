import React from 'react';
import { motion } from 'motion/react';
import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';

type TrendDirection = 'up' | 'down' | 'neutral';
type TrendTone = 'good' | 'bad' | 'info';
type CardTheme = 'rose' | 'green' | 'blue' | 'teal' | 'amber' | 'violet';

interface SummaryMetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  theme: CardTheme;
  trend?: {
    direction: TrendDirection;
    tone: TrendTone;
    label: string;
  };
  subtitle?: string;
  sparkline?: number[];
  progress?: number;
  delay?: number;
}

const themeStyles: Record<CardTheme, {
  card: string;
  iconWrap: string;
  icon: string;
  stroke: string;
  fillFrom: string;
  progressTrack: string;
}> = {
  rose: {
    card: 'bg-gradient-to-br from-rose-50 to-white border-rose-100',
    iconWrap: 'bg-rose-100',
    icon: 'text-rose-500',
    stroke: '#F43F5E',
    fillFrom: '#FDA4AF',
    progressTrack: '#FECACA',
  },
  green: {
    card: 'bg-gradient-to-br from-emerald-50 to-white border-emerald-100',
    iconWrap: 'bg-emerald-100',
    icon: 'text-emerald-600',
    stroke: '#10B981',
    fillFrom: '#6EE7B7',
    progressTrack: '#A7F3D0',
  },
  blue: {
    card: 'bg-gradient-to-br from-sky-50 to-white border-sky-100',
    iconWrap: 'bg-sky-100',
    icon: 'text-sky-600',
    stroke: '#3B82F6',
    fillFrom: '#93C5FD',
    progressTrack: '#BFDBFE',
  },
  teal: {
    card: 'bg-gradient-to-br from-[#e7f5f4] to-white border-[#549E9E]/20',
    iconWrap: 'bg-[#549E9E]/15',
    icon: 'text-[#2d8789]',
    stroke: '#549E9E',
    fillFrom: '#99D4D4',
    progressTrack: '#C7EBEB',
  },
  amber: {
    card: 'bg-gradient-to-br from-amber-50 to-white border-amber-100',
    iconWrap: 'bg-amber-100',
    icon: 'text-amber-600',
    stroke: '#F59E0B',
    fillFrom: '#FCD34D',
    progressTrack: '#FDE68A',
  },
  violet: {
    card: 'bg-gradient-to-br from-violet-50 to-white border-violet-100',
    iconWrap: 'bg-violet-100',
    icon: 'text-violet-600',
    stroke: '#8B5CF6',
    fillFrom: '#C4B5FD',
    progressTrack: '#DDD6FE',
  },
};

const toneClass: Record<TrendTone, string> = {
  good: 'text-emerald-600',
  bad: 'text-rose-500',
  info: 'text-sky-600',
};

export const SummaryMetricCard: React.FC<SummaryMetricCardProps> = ({
  title,
  value,
  icon: Icon,
  theme,
  trend,
  subtitle,
  sparkline,
  progress,
  delay = 0,
}) => {
  const styles = themeStyles[theme];
  const gradientId = `spark-${theme}-${title.replace(/\s+/g, '-').toLowerCase()}-${delay}`;
  const chartData = (sparkline && sparkline.length > 0 ? sparkline : [0, 0]).map((pointValue, index) => ({ index, value: pointValue }));
  const sparkMax = Math.max(...chartData.map((point) => point.value), 0);
  const TrendIcon = trend?.direction === 'up' ? ArrowUp : trend?.direction === 'down' ? ArrowDown : ArrowRight;
  const clampedProgress = Math.max(0, Math.min(100, progress ?? 0));
  const footer = trend?.label || subtitle;
  const hasChart = typeof progress === 'number' || Boolean(sparkline && sparkline.length > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`flex min-h-[76px] items-center justify-between gap-3 overflow-visible px-4 py-3 rounded-2xl border shadow-sm ${styles.card}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${styles.iconWrap}`}>
          <Icon size={14} className={styles.icon} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-gray-500 leading-tight">{title}</p>
          <p className="text-lg font-black text-gray-900 leading-none mt-0.5">{value}</p>
          {footer && (
            <p className={`mt-0.5 text-[10px] leading-tight font-semibold flex items-center gap-1 ${trend ? toneClass[trend.tone] : 'text-gray-500'}`}>
              {trend && <TrendIcon size={10} className="shrink-0" />}
              <span>{footer}</span>
            </p>
          )}
        </div>
      </div>

      {hasChart && (
        typeof progress === 'number' ? (
          <CircularProgress value={clampedProgress} stroke={styles.stroke} track={styles.progressTrack} />
        ) : (
        <div className="h-[44px] w-[84px] shrink-0 overflow-visible">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 4, left: 4, bottom: 8 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={styles.fillFrom} stopOpacity={0.7} />
                  <stop offset="95%" stopColor={styles.fillFrom} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <YAxis hide domain={[0, Math.max(sparkMax * 1.25, 1)]} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={styles.stroke}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        )
      )}
    </motion.div>
  );
};

const CircularProgress = ({ value, stroke, track }: { value: number; stroke: string; track: string }) => {
  const size = 48;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2 - 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="block shrink-0 overflow-visible -rotate-90"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={track}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  );
};
