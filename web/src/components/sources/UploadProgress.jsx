import { Upload, FileSearch, Brain, Sparkles, Check } from 'lucide-react'

const STEPS = [
  { id: 0, label: 'Upload', icon: Upload, description: 'Uploading file...' },
  { id: 1, label: 'Extract', icon: FileSearch, description: 'Extracting text...' },
  { id: 2, label: 'Analyze', icon: Brain, description: 'Analyzing content...' },
  { id: 3, label: 'Generate', icon: Sparkles, description: 'Generating practice items...' }
]

export default function UploadProgress({ step = 0, progress = 0 }) {
  return (
    <div className="w-full max-w-md mx-auto">
      {/* Step indicators */}
      <div className="flex justify-between mb-4">
        {STEPS.map((s, index) => {
          const Icon = s.icon
          const isActive = index === step
          const isComplete = index < step
          const isPending = index > step

          return (
            <div key={s.id} className="flex flex-col items-center flex-1">
              {/* Step circle */}
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center transition-all
                  ${isComplete ? 'bg-accent-progress text-white' : ''}
                  ${isActive ? 'bg-accent-new text-white' : ''}
                  ${isPending ? 'bg-gray-100 text-text-muted' : ''}
                `}
              >
                {isComplete ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Icon className={`w-5 h-5 ${isActive ? 'animate-pulse' : ''}`} />
                )}
              </div>

              {/* Step label */}
              <span
                className={`
                  text-xs mt-2 font-medium
                  ${isComplete ? 'text-accent-progress' : ''}
                  ${isActive ? 'text-accent-new' : ''}
                  ${isPending ? 'text-text-muted' : ''}
                `}
              >
                {s.label}
              </span>

              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div
                  className={`
                    absolute top-5 left-1/2 w-full h-0.5 -z-10
                    ${index < step ? 'bg-accent-progress' : 'bg-gray-200'}
                  `}
                  style={{
                    left: `calc(${(index + 0.5) / STEPS.length * 100}% + 20px)`,
                    width: `calc(${100 / STEPS.length}% - 40px)`
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-accent-new rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Current step description */}
      <p className="text-sm text-text-secondary text-center mt-3">
        {STEPS[step]?.description || 'Processing...'}
      </p>

      {/* Progress percentage */}
      <p className="text-xs text-text-muted text-center mt-1">
        {Math.round(progress)}% complete
      </p>
    </div>
  )
}
