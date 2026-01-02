import { Search, Filter, SortAsc, SortDesc, Plus } from 'lucide-react'

const domainLabels = {
  'all': 'All Domains',
  'ai_ml': 'AI/ML',
  'programming': 'Programming',
  'math': 'Math',
  'science': 'Science',
  'history': 'History',
  'language': 'Language',
  'business': 'Business',
  'health': 'Health',
  'general': 'General'
}

const sortLabels = {
  'date': 'Date Added',
  'name': 'Name',
  'mastery': 'Mastery'
}

export default function SourcesToolbar({
  searchQuery,
  onSearchChange,
  domainFilter,
  onDomainChange,
  domains,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  onAddClick
}) {
  return (
    <div className="flex flex-col gap-4 mb-6">
      {/* Top row: Search and Add button */}
      <div className="flex gap-3">
        {/* Search input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          <input
            type="text"
            placeholder="Search sources..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-bg-card border border-bg-card-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-new/50"
          />
        </div>

        {/* Add Document button */}
        <button
          onClick={onAddClick}
          className="flex items-center gap-2 px-4 py-2.5 bg-btn-primary text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Add Document</span>
        </button>
      </div>

      {/* Bottom row: Filters and Sort */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Domain filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-muted" />
          <select
            value={domainFilter}
            onChange={(e) => onDomainChange(e.target.value)}
            className="px-3 py-1.5 bg-bg-card border border-bg-card-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-new/50"
          >
            {domains.map(domain => (
              <option key={domain} value={domain}>
                {domainLabels[domain] || domain}
              </option>
            ))}
          </select>
        </div>

        {/* Sort by */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-text-muted">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
            className="px-3 py-1.5 bg-bg-card border border-bg-card-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-new/50"
          >
            {Object.entries(sortLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          {/* Sort order toggle */}
          <button
            onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-1.5 bg-bg-card border border-bg-card-border rounded-lg hover:bg-btn-secondary transition-colors"
            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortOrder === 'asc' ? (
              <SortAsc className="w-4 h-4 text-text-primary" />
            ) : (
              <SortDesc className="w-4 h-4 text-text-primary" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
