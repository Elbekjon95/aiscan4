'use client';
import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

export default function ChartComponent({ labels, data, chartTitle }: { labels: string[], data: number[], chartTitle: string }) {
  const chartData = {
    labels,
    datasets: [
      {
        fill: true,
        label: chartTitle,
        data,
        borderColor: '#4C63A8',
        backgroundColor: 'rgba(76, 99, 168, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { grid: { display: false } }
    },
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  return <Line options={options as any} data={chartData} />;
}
