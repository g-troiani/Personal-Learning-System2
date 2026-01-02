import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

// Color mapping for knowledge types
const TYPE_COLORS = {
  'factual': '#4338CA',     // Indigo
  'conceptual': '#10B981',  // Green
  'procedural': '#F59E0B',  // Amber
  'metacognitive': '#3B82F6' // Blue
}

const TYPE_BG_COLORS = {
  'factual': '#E0E7FF',
  'conceptual': '#D1FAE5',
  'procedural': '#FEF3C7',
  'metacognitive': '#DBEAFE'
}

// Custom tooltip component - defined outside to avoid recreation on each render
function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload
    return (
      <div className="bg-white p-3 shadow-lg rounded-button border border-gray-200">
        <p className="font-medium text-text-primary mb-1">{data.type}</p>
        <p className="text-sm text-text-secondary">Average Score: {data.avgScore}%</p>
        <p className="text-sm text-text-secondary">Attempts: {data.attempts}</p>
        <p className="text-sm text-text-secondary">Total Items: {data.totalItems}</p>
      </div>
    )
  }
  return null
}

export default function PerformanceByType({ data }) {
  // Format data for display
  const chartData = data.map(item => ({
    type: item.type.charAt(0).toUpperCase() + item.type.slice(1),
    rawType: item.type,
    avgScore: Math.round(item.avgScore || 0),
    attempts: item.attempts || 0,
    totalItems: item.totalItems || 0
  }))

  // Sort by average score descending
  chartData.sort((a, b) => b.avgScore - a.avgScore)

  if (!data || data.length === 0) {
    return (
      <div className="bg-bg-card border border-bg-card-border rounded-card p-6 mb-8">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Performance by Knowledge Type</h3>
        <div className="text-center py-8 text-text-secondary">
          <p>No performance data available yet.</p>
          <p className="text-sm mt-1">Complete practice sessions to see performance by type.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-bg-card border border-bg-card-border rounded-card p-6 mb-8">
      <h3 className="text-lg font-semibold text-text-primary mb-2">Performance by Knowledge Type</h3>
      <p className="text-sm text-text-secondary mb-4">Average scores across different types of knowledge</p>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E4E2" />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              tick={{ fill: '#6B7280', fontSize: 12 }}
            />
            <YAxis
              dataKey="type"
              type="category"
              tick={{ fill: '#6B7280', fontSize: 12 }}
              width={100}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="avgScore" radius={[0, 4, 4, 0]} barSize={24}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={TYPE_COLORS[entry.rawType] || '#6B7280'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend and detail cards */}
      <div className="mt-4 pt-4 border-t border-bg-card-border">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {chartData.map((item) => (
            <div
              key={item.rawType}
              className="p-3 rounded-button"
              style={{ backgroundColor: TYPE_BG_COLORS[item.rawType] || '#F3F4F6' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: TYPE_COLORS[item.rawType] || '#6B7280' }}
                />
                <span className="text-sm font-medium text-text-primary">{item.type}</span>
              </div>
              <div className="text-lg font-semibold text-text-primary">{item.avgScore}%</div>
              <div className="text-xs text-text-secondary">{item.attempts} attempts</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
