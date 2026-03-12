import React from 'react';

interface GEOScoreGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export const GEOScoreGauge: React.FC<GEOScoreGaugeProps> = ({ score, size = 'md' }) => {
  const sizeConfig = {
    sm: { width: 120, height: 120 },
    md: { width: 160, height: 160 },
    lg: { width: 200, height: 200 },
  };

  const { width, height } = sizeConfig[size];
  const strokeWidth = width / 10;
  const radius = (width - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getScoreColor = (value: number) => {
    if (value >= 80) return '#10b981'; // green
    if (value >= 60) return '#84cc16'; // light green
    if (value >= 40) return '#f59e0b'; // orange
    if (value >= 20) return '#ef4444'; // red
    return '#dc2626'; // dark red
  };

  return (
    <div className="flex flex-col items-center">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <circle
          cx={width / 2}
          cy={height / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={width / 2}
          cy={height / 2}
          r={radius}
          fill="none"
          stroke={getScoreColor(score)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 0.5s ease-out',
          }}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          className="text-2xl font-bold"
          fill="currentColor"
        >
          {score}
        </text>
      </svg>
      <div className="mt-2 text-sm text-gray-600">GEO Score</div>
    </div>
  );
};