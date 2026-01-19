import {
  FreeRecallInput,
  RecognitionInput,
  CuedRecallInput,
  ExecutionInput,
  ExplanationInput,
  ApplicationInput
} from './inputs'

// Mode-to-component mapping
const MODE_COMPONENTS = {
  free_recall: FreeRecallInput,       // Simple textarea, no hints
  cued_recall: CuedRecallInput,       // Textarea with progressive hint reveal
  recognition: RecognitionInput,      // Multiple choice buttons with auto-grading
  explanation: ExplanationInput,      // Expanded textarea with rubric preview
  application: ApplicationInput,      // Scenario card with styled task
  execution: ExecutionInput,          // Task checklist with completion tracking
}

export default function AnswerInput({ practiceMode, item, onSubmit, onSkip, disabled }) {
  // Get the appropriate input component for this mode
  // Default to FreeRecallInput for unknown modes
  const InputComponent = MODE_COMPONENTS[practiceMode] || FreeRecallInput

  return (
    <div className="max-w-2xl mx-auto">
      <InputComponent
        item={item}
        onSubmit={onSubmit}
        onSkip={onSkip}
        disabled={disabled}
      />
    </div>
  )
}
