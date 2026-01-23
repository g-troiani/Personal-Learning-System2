import { Send } from 'lucide-react'

export default function SubmitButton({
  onClick,
  disabled = false,
  children,
  type = 'button',
  variant = 'icon',
  className = ''
}) {
  if (variant === 'icon') {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`p-2 bg-btn-primary text-white rounded-button hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        <Send className="w-5 h-5" />
      </button>
    )
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-6 py-3 bg-btn-primary text-white rounded-button font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children || 'Submit'}
    </button>
  )
}
