import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

// Custom tooltip component - defined outside to avoid recreation on each render
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload
    return (
      <div className="bg-white p-3 shadow-lg rounded-button border border-gray-200">
        <p className="font-medium text-text-primary mb-2">{data?.fullName || label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}%
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function TechniqueComparison({ data }) {
  // Transform data for the chart - expects data with bundles and their retention rates
  const chartData = data.map(bundle => ({
    name: bundle.name.length > 15 ? bundle.name.substring(0, 15) + '...' : bundle.name,
    fullName: bundle.name,
    '7-Day Retention': Math.round(bundle.retention7Day || 0),
    '30-Day Retention': Math.round(bundle.retention30Day || 0),
  }))

  if (!data || data.length === 0) {
    return (
      <div className="bg-bg-card border border-bg-card-border rounded-card p-6 mb-8">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Technique Bundle Effectiveness</h3>
        <div className="text-center py-8 text-text-secondary">
          <p>No technique bundle data available yet.</p>
          <p className="text-sm mt-1">Complete more practice sessions to see retention data.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-bg-card border border-bg-card-border rounded-card p-6 mb-8">
      <h3 className="text-lg font-semibold text-text-primary mb-2">Technique Bundle Effectiveness</h3>
      <p className="text-sm text-text-secondary mb-4">Compare retention rates across different learning techniques</p>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E4E2" />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              tick={{ fill: '#6B7280', fontSize: 12 }}
            />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fill: '#6B7280', fontSize: 12 }}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              dataKey="7-Day Retention"
              fill="#10B981"
              radius={[0, 4, 4, 0]}
              barSize={16}
            />
            <Bar
              dataKey="30-Day Retention"
              fill="#3B82F6"
              radius={[0, 4, 4, 0]}
              barSize={16}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary stats below chart */}
      <div className="mt-4 pt-4 border-t border-bg-card-border">
        <div className="flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-accent-progress"></div>
            <span className="text-text-secondary">7-Day Retention</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-accent-new"></div>
            <span className="text-text-secondary">30-Day Retention</span>
          </div>
        </div>
      </div>
    </div>
  )
}
