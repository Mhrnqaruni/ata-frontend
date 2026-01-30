// /ata-frontend/src/components/common/ChartRenderer.jsx

import React from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Paper, Typography, Box, Alert } from '@mui/material';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

/**
 * ChartRenderer - Renders different chart types from chatbot analysis results
 *
 * @param {object} props
 * @param {object} props.data - Chart data object with structure:
 *   {
 *     chart_type: "bar" | "line" | "pie" | "histogram",
 *     labels: [...],
 *     data: [...],
 *     title: "..."
 *   }
 */
const ChartRenderer = ({ data }) => {
  if (!data || !data.chart_type) {
    return null;
  }

  try {
    const { chart_type, labels, data: values, title } = data;

    // Transform data for recharts format
    const chartData = labels?.map((label, index) => ({
      name: label,
      value: values?.[index] || 0
    })) || [];

    const renderChart = () => {
      switch (chart_type) {
        case 'bar':
          return (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          );

        case 'histogram':
          return (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          );

        case 'line':
          return (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          );

        case 'pie':
          return (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.name}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          );

        default:
          return (
            <Alert severity="info">
              Unknown chart type: {chart_type}
            </Alert>
          );
      }
    };

    return (
      <Paper
        elevation={1}
        sx={{ p: 1.5, mt: 0.5 }}  // Reduced padding and margin
        ref={(el) => {
          if (el) {
            console.log('[ChartRenderer] Chart dimensions:', {
              height: el.offsetHeight,
              title: title || 'untitled'
            });
          }
        }}
      >
        {title && (
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
        )}
        <Box sx={{ width: '100%', height: 300 }}>
          {renderChart()}
        </Box>
      </Paper>
    );

  } catch (error) {
    console.error('Chart rendering error:', error);
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        Unable to display chart. Data visualization error occurred.
      </Alert>
    );
  }
};

export default ChartRenderer;
