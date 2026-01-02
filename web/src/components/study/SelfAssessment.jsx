import { useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'

export default function SelfAssessment({ expectedAnswer, userAnswer, onRate }) {
  const [score, setScore] = useState(null)
  const [difficulty, setDifficulty] = useState(null)

  const scoreLabels = [
    { value: 1, label: 'Incorrect', color: 'bg-red-500' },
    { value: 2, label: 'Mostly wrong', color: 'bg-orange-500' },
    { value: 3, label: 'Partial', color: 'bg-yellow-500' },
    { value: 4, label: 'Mostly correct', color: 'bg-lime-500' },
    { value: 5, label: 'Perfect', color: 'bg-green-500' },
  ]

  const difficultyLabels = [
    { value: 1, label: 'Very Easy' },
    { value: 2, label: 'Easy' },
    { value: 3, label: 'Medium' },
    { value: 4, label: 'Hard' },
    { value: 5, label: 'Very Hard' },
  ]

  const handleContinue = () => {
    if (score !== null && difficulty !== null) {
      onRate({ score, difficulty })
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Expected Answer */}
      <div className="bg-green-50 border border-green-200 rounded-card p-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="font-medium text-green-800">Expected Answer</span>
        </div>
        <p className="text-text-primary">{expectedAnswer}</p>
      </div>

      {/* User Answer (if provided) */}
      {userAnswer && (
        <div className="bg-blue-50 border border-blue-200 rounded-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-blue-800">Your Answer</span>
          </div>
          <p className="text-text-primary">{userAnswer}</p>
        </div>
      )}

      {/* Self-Assessment Rating */}
      <div className="mb-6">
        <h3 className="font-medium text-text-primary mb-3">How did you do?</h3>
        <div className="flex gap-2">
          {scoreLabels.map((item) => (
            <button
              key={item.value}
              onClick={() => setScore(item.value)}
              className={`flex-1 py-3 px-2 rounded-button text-sm font-medium transition-all ${
                score === item.value
                  ? `${item.color} text-white`
                  : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty Rating */}
      <div className="mb-6">
        <h3 className="font-medium text-text-primary mb-3">How difficult was this?</h3>
        <div className="flex gap-2">
          {difficultyLabels.map((item) => (
            <button
              key={item.value}
              onClick={() => setDifficulty(item.value)}
              className={`flex-1 py-3 px-2 rounded-button text-sm font-medium transition-all ${
                difficulty === item.value
                  ? 'bg-btn-primary text-white'
                  : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Continue Button */}
      <button
        onClick={handleContinue}
        disabled={score === null || difficulty === null}
        className="w-full py-3 bg-btn-primary text-white rounded-button font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue
      </button>
    </div>
  )
}
