import { useQuery } from '@tanstack/react-query';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

import { endpoints } from '../../lib/api';
import Skeleton from '../ui/Skeleton';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const RevenueChart = (): JSX.Element => {
  const { data, isLoading } = useQuery({
    queryKey: ['host-revenue-chart', 30],
    queryFn: async () => {
      const response = await endpoints.creator.dashboard.revenue({ days: 30 });
      return response.data.data || [];
    }
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const chartData = {
    labels: data?.map((item: { _id: string }) => item._id) || [],
    datasets: [
      {
        label: 'Omzet (€)',
        data: data?.map((item: { revenue: number }) => item.revenue) || [],
        borderColor: 'rgb(14, 165, 233)',
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: string | number) => {
            const numValue = typeof value === 'string' ? parseFloat(value) : value;
            return `€${numValue}`;
          }
        }
      }
    }
  };

  return (
    <div className="h-64">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default RevenueChart;

