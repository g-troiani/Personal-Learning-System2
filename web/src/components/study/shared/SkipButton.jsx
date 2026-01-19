export default function SkipButton({
  onClick,
  disabled = false,
  children = 'Skip and show answer',
  className = ''
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`text-text-secondary hover:text-text-primary text-sm underline disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  )
}
