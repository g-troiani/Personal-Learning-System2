import { forwardRef } from 'react'

const TextArea = forwardRef(function TextArea({
  value,
  onChange,
  placeholder = '',
  rows = 4,
  disabled = false,
  className = '',
  showCharCount = false,
  maxChars,
  ...props
}, ref) {
  const charCount = value?.length || 0
  const isOverLimit = maxChars && charCount > maxChars

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={`w-full px-4 py-3 bg-bg-card border border-bg-card-border rounded-card text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-progress focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`}
        {...props}
      />
      {showCharCount && (
        <div className={`absolute bottom-2 right-3 text-xs ${isOverLimit ? 'text-red-500' : 'text-text-muted'}`}>
          {charCount}{maxChars ? `/${maxChars}` : ''}
        </div>
      )}
    </div>
  )
})

export default TextArea
