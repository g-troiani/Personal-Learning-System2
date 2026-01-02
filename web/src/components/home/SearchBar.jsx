import { Search } from 'lucide-react'

export default function SearchBar({ value, onChange, onSubmit }) {
  const handleSubmit = (e) => {
    e.preventDefault()
    if (onSubmit) onSubmit(value)
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange && onChange(e.target.value)}
          placeholder="Search your knowledge base..."
          className="w-full pl-12 pr-4 py-3 bg-bg-card border border-bg-card-border rounded-card text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-progress focus:border-transparent"
        />
      </div>
    </form>
  )
}
