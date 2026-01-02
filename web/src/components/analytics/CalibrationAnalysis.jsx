import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ZAxis } from 'recharts'

export default function CalibrationAnalysis({ data }) {
  // Calculate calibration metrics
  const calculateCalibrationMetrics = () => {
    if (!data || data.length === 0) {
      return { overconfident: 0, underconfident: 0, wellCalibrated: 0, avgDifference: 0 }
    }

    let overconfident = 0
    let underconfident = 0
    let wellCalibrated = 0
    let totalDifference = 0

    data.forEach(point => {
      const diff = point.confidence - point.actualScore
      totalDifference += Math.abs(diff)

      if (diff > 15) overconfident++
      else if (diff < -15) underconfident++
      else wellCalibrated++
    })

    return {
      overconfident,
      underconfident,
      wellCalibrated,
      avgDifference: Math.round(totalDifference / data.length)
    }
  }

  const metrics = calculateCalibrationMetrics()

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload
      const diff = data.confidence - data.actualScore
      let calibrationStatus = 'Well calibrated'
      let statusColor = 'text-green-600'

      if (diff > 15) {
        calibrationStatus = 'Overconfident'
        statusColor = 'text-amber-600'
      } else if (diff < -15) {
        calibrationStatus = 'Underconfident'
        statusColor = 'text-blue-600'
      }

      return (
        <div className="bg-white p-3 shadow-lg rounded-button border border-gray-200">
          <p className="font-medium text-text-primary mb-1">{data.itemName || 'Practice Item'}</p>
          <p className="text-sm text-text-secondary">Confidence: {data.confidence}%</p>
          <p className="text-sm text-text-secondary">Actual Score: {data.actualScore}%</p>
          <p className={`text-sm font-medium ${statusColor}`}>{calibrationStatus}</p>
        </div>
      )
    }
    return null
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-bg-card border border-bg-card-border rounded-card p-6 mb-8">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Calibration Analysis</h3>
        <div className="text-center py-8 text-text-secondary">
          <p>No calibration data available yet.</p>
          <p className="text-sm mt-1">Provide confidence ratings before practice to see calibration.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-bg-card border border-bg-card-border rounded-card p-6 mb-8">
      <h3 className="text-lg font-semibold text-text-primary mb-2">Calibration Analysis</h3>
      <p className="text-sm text-text-secondary mb-4">How well your confidence predicts actual performance</p>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E4E2" />
            <XAxis
              type="number"
              dataKey="confidence"
              domain={[0, 100]}
              name="Confidence"
              tick={{ fill: '#6B7280', fontSize: 12 }}
              label={{ value: 'Confidence Before (%)', position: 'insideBottom', offset: -15, fill: '#6B7280', fontSize: 12 }}
            />
            <YAxis
              type="number"
              dataKey="actualScore"
              domain={[0, 100]}
              name="Actual Score"
              tick={{ fill: '#6B7280', fontSize: 12 }}
              label={{ value: 'Actual Score (%)', angle: -90, position: 'insideLeft', fill: '#6B7280', fontSize: 12 }}
            />
            <ZAxis range={[50, 200]} />
            <Tooltip content={<CustomTooltip />} />
            {/* Perfect calibration line */}
            <ReferenceLine
              segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]}
              stroke="#10B981"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{ value: 'Perfect Calibration', position: 'insideTopRight', fill: '#10B981', fontSize: 11 }}
            />
            <Scatter
              name="Attempts"
              data={data}
              fill="#3B82F6"
              opacity={0.7}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Calibration Summary */}
      <div className="mt-4 pt-4 border-t border-bg-card-border">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-button">
            <div className="text-2xl font-semibold text-green-600">{metrics.wellCalibrated}</div>
            <div className="text-xs text-green-700">Well Calibrated</div>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-button">
            <div className="text-2xl font-semibold text-amber-600">{metrics.overconfident}</div>
            <div className="text-xs text-amber-700">Overconfident</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-button">
            <div className="text-2xl font-semibold text-blue-600">{metrics.underconfident}</div>
            <div className="text-xs text-blue-700">Underconfident</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-button">
            <div className="text-2xl font-semibold text-text-primary">{metrics.avgDifference}%</div>
            <div className="text-xs text-text-secondary">Avg Difference</div>
          </div>
        </div>

        <p className="text-xs text-text-muted mt-3 text-center">
          Points above the green line indicate overconfidence; points below indicate underconfidence.
        </p>
      </div>
    </div>
  )
}
