'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface WeeklyGraphProps {
  data: { day: string; calories: number }[];
}

export default function WeeklyGraph({ data }: WeeklyGraphProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
      <h3 className="text-lg font-bold text-darkGray dark:text-white mb-4">
        📈 Weekly Trend
      </h3>
      
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="day"
            stroke="#9E9E9E"
            fontSize={12}
          />
          <YAxis
            stroke="#9E9E9E"
            fontSize={12}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #F77F5B',
              borderRadius: '8px',
            }}
          />
          <Line
            type="monotone"
            dataKey="calories"
            stroke="#F77F5B"
            strokeWidth={3}
            dot={{ fill: '#F77F5B', r: 5 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
