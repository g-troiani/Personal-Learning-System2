import { TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react'

export default function InsightCards({ performanceData, calibrationData, strugglingItems }) {
  // Calculate insights from real data
  const getWhatsWorking = () => {
    const insights = []

    // Find best performing knowledge type
    if (performanceData && performanceData.length > 0) {
      const bestType = performanceData.reduce((best, current) =>
        current.avgScore > best.avgScore ? current : best
      , performanceData[0])

      if (bestType.avgScore >= 70) {
        insights.push(`Strong ${bestType.type} knowledge (${Math.round(bestType.avgScore)}% avg)`)
      }
    }

    // Check calibration accuracy
    if (calibrationData) {
      const wellCalibrated = calibrationData.filter(d =>
        Math.abs(d.confidence - d.actualScore) < 20
      ).length
      const total = calibrationData.length
      if (total > 0 && wellCalibrated / total > 0.6) {
        insights.push(`Good self-assessment accuracy (${Math.round(wellCalibrated / total * 100)}%)`)
      }
    }

    // Default insight if none found
    if (insights.length === 0) {
      insights.push('Keep practicing to see your strengths')
    }

    return insights
  }

  const getNeedsAttention = () => {
    const insights = []

    // Find struggling knowledge types
    if (performanceData && performanceData.length > 0) {
      const strugglingTypes = performanceData.filter(d => d.avgScore < 60 && d.attempts > 0)
      strugglingTypes.forEach(type => {
        insights.push(`${type.type} items need more practice (${Math.round(type.avgScore)}% avg)`)
      })
    }

    // Count struggling items
    if (strugglingItems && strugglingItems.length > 0) {
      insights.push(`${strugglingItems.length} items flagged as struggling`)
    }

    // Check for overconfidence
    if (calibrationData && calibrationData.length > 0) {
      const overconfident = calibrationData.filter(d =>
        d.confidence - d.actualScore > 25
      ).length
      if (overconfident > calibrationData.length * 0.3) {
        insights.push('Consider lowering confidence estimates')
      }
    }

    if (insights.length === 0) {
      insights.push('No major issues detected')
    }

    return insights
  }

  const getOptimizations = () => {
    const insights = []

    // Suggest focusing on weak areas
    if (performanceData && performanceData.length > 0) {
      const weakestType = performanceData.reduce((worst, current) =>
        current.attempts > 0 && current.avgScore < worst.avgScore ? current : worst
      , { avgScore: 100, type: null })

      if (weakestType.type && weakestType.avgScore < 70) {
        insights.push(`Focus on ${weakestType.type} items for fastest improvement`)
      }
    }

    // Suggest practice session length
    if (strugglingItems && strugglingItems.length > 5) {
      insights.push('Try shorter, more frequent sessions for struggling items')
    }

    // Default optimization tips
    if (insights.length === 0) {
      insights.push('Maintain consistent daily practice for best results')
    }

    return insights
  }

  const whatsWorking = getWhatsWorking()
  const needsAttention = getNeedsAttention()
  const optimizations = getOptimizations()

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {/* What's Working Card - Green */}
      <div className="bg-green-50 border border-green-200 rounded-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <h3 className="font-semibold text-green-800">What&apos;s Working</h3>
        </div>
        <ul className="space-y-2">
          {whatsWorking.map((insight, idx) => (
            <li key={idx} className="text-sm text-green-700 flex items-start gap-2">
              <span className="text-green-500 mt-0.5">•</span>
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Needs Attention Card - Amber */}
      <div className="bg-amber-50 border border-amber-200 rounded-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <h3 className="font-semibold text-amber-800">Needs Attention</h3>
        </div>
        <ul className="space-y-2">
          {needsAttention.map((insight, idx) => (
            <li key={idx} className="text-sm text-amber-700 flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">•</span>
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Optimization Card - Blue */}
      <div className="bg-blue-50 border border-blue-200 rounded-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="font-semibold text-blue-800">Optimization</h3>
        </div>
        <ul className="space-y-2">
          {optimizations.map((insight, idx) => (
            <li key={idx} className="text-sm text-blue-700 flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
