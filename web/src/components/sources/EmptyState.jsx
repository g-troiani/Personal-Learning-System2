import { FileText, Upload, BookOpen, ArrowRight } from 'lucide-react'

export default function EmptyState({ onAddClick, isFiltered = false }) {
  if (isFiltered) {
    // Empty state when filters return no results
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 bg-gray-100 rounded-full mb-4">
          <FileText className="w-12 h-12 text-text-muted" />
        </div>
        <h3 className="text-lg font-medium text-text-primary mb-2">
          No sources match your search
        </h3>
        <p className="text-text-secondary max-w-md">
          Try adjusting your search query or filters to find what you're looking for.
        </p>
      </div>
    )
  }

  // Empty state when no sources exist at all
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 bg-accent-new/10 rounded-full mb-4">
        <BookOpen className="w-12 h-12 text-accent-new" />
      </div>
      <h3 className="text-xl font-semibold text-text-primary mb-2">
        Start Building Your Knowledge Base
      </h3>
      <p className="text-text-secondary max-w-md mb-6">
        Upload documents like PDFs, Word files, or Markdown to extract knowledge components and generate practice items for spaced repetition learning.
      </p>
      <button
        onClick={onAddClick}
        className="flex items-center gap-2 px-6 py-3 bg-btn-primary text-white rounded-lg hover:opacity-90 transition-opacity"
      >
        <Upload className="w-5 h-5" />
        Add Your First Document
      </button>
      {/* How it works - workflow steps */}
      <div className="mt-8 max-w-2xl">
        <p className="text-xs uppercase tracking-wider text-text-muted mb-4">How it works</p>
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-2">
          {/* Step 1: Upload */}
          <div className="flex-1 p-4 bg-bg-card rounded-lg border border-bg-card-border text-center">
            <div className="text-2xl mb-2">📄</div>
            <h4 className="font-medium text-text-primary mb-1 flex items-center justify-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-accent-new/20 text-accent-new text-xs font-bold">1</span>
              Upload
            </h4>
            <p className="text-sm text-text-secondary">
              PDF, PPTX, DOCX, Markdown, or plain text files
            </p>
          </div>

          {/* Arrow */}
          <ArrowRight className="hidden sm:block w-5 h-5 text-text-muted flex-shrink-0" />

          {/* Step 2: Extract */}
          <div className="flex-1 p-4 bg-bg-card rounded-lg border border-bg-card-border text-center">
            <div className="text-2xl mb-2">🧠</div>
            <h4 className="font-medium text-text-primary mb-1 flex items-center justify-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-accent-new/20 text-accent-new text-xs font-bold">2</span>
              Extract
            </h4>
            <p className="text-sm text-text-secondary">
              AI identifies key concepts and skills
            </p>
          </div>

          {/* Arrow */}
          <ArrowRight className="hidden sm:block w-5 h-5 text-text-muted flex-shrink-0" />

          {/* Step 3: Practice */}
          <div className="flex-1 p-4 bg-bg-card rounded-lg border border-bg-card-border text-center">
            <div className="text-2xl mb-2">📝</div>
            <h4 className="font-medium text-text-primary mb-1 flex items-center justify-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-accent-new/20 text-accent-new text-xs font-bold">3</span>
              Practice
            </h4>
            <p className="text-sm text-text-secondary">
              Auto-generated questions for active recall
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
