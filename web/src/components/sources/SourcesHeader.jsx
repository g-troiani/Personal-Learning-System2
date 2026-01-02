import { BookOpen } from 'lucide-react'

export default function SourcesHeader({ sourceCount = 0 }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-accent-new/10 rounded-lg">
          <BookOpen className="w-6 h-6 text-accent-new" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold text-text-primary">Sources</h1>
          <p className="text-text-secondary mt-1">
            {sourceCount === 0
              ? 'No documents yet'
              : `${sourceCount} document${sourceCount === 1 ? '' : 's'} in your knowledge base`}
          </p>
        </div>
      </div>
    </div>
  )
}
