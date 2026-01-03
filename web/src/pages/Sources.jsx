import { useState, useCallback } from 'react'
import { useSources } from '../hooks/useSources'
import SourcesHeader from '../components/sources/SourcesHeader'
import SourcesToolbar from '../components/sources/SourcesToolbar'
import SourcesList from '../components/sources/SourcesList'
import EmptyState from '../components/sources/EmptyState'
import UploadZone from '../components/sources/UploadZone'
import SourceDetailPanel from '../components/sources/SourceDetailPanel'
import ConfirmationDialog from '../components/shared/ConfirmationDialog'
import { Loader2, CheckCircle } from 'lucide-react'

// API base URL from environment or default to localhost:8001
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'

export default function Sources() {
  const {
    sources,
    allSources,
    loading,
    error,
    refresh,
    searchQuery,
    setSearchQuery,
    domainFilter,
    setDomainFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    domains
  } = useSources()

  // Upload zone visibility state
  const [showUploadZone, setShowUploadZone] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(null)
  const [processingSourceId, setProcessingSourceId] = useState(null)

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [sourceToDelete, setSourceToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Source detail panel state
  const [detailPanelOpen, setDetailPanelOpen] = useState(false)
  const [selectedSource, setSelectedSource] = useState(null)

  const handleAddClick = () => {
    setShowUploadZone(true)
    setUploadSuccess(null)
  }

  const handleCloseUpload = () => {
    setShowUploadZone(false)
  }

  // Called when upload starts and file is sent to API
  const handleUploadStart = useCallback((result) => {
    console.log('Upload started:', result)
    if (result.sourceId) {
      setProcessingSourceId(result.sourceId)
    }
    // Refresh to show the new source in processing state
    refresh()
  }, [refresh])

  // Called when processing completes via Supabase Realtime
  const handleProcessingComplete = useCallback((sourceId) => {
    console.log('Processing complete for:', sourceId)
    setUploadSuccess({ sourceId })
    setProcessingSourceId(null)

    // Refresh sources list to get final data
    refresh()
  }, [refresh])

  // Retry a failed source
  const handleRetry = useCallback(async (sourceId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sources/${sourceId}/retry`, {
        method: 'POST'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Retry failed:', errorData.detail || response.status)
        return
      }

      // Refresh to show updated status
      refresh()
    } catch (err) {
      console.error('Retry error:', err)
    }
  }, [refresh])

  // Handle delete action - show confirmation dialog
  const handleDeleteRequest = useCallback((source) => {
    setSourceToDelete(source)
    setDeleteDialogOpen(true)
    // Close detail panel if open
    setDetailPanelOpen(false)
  }, [])

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    if (!sourceToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/sources/${sourceToDelete.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Delete failed:', errorData.detail || response.status)
        return
      }

      // Close dialog and refresh
      setDeleteDialogOpen(false)
      setSourceToDelete(null)
      refresh()
    } catch (err) {
      console.error('Delete error:', err)
    } finally {
      setIsDeleting(false)
    }
  }, [sourceToDelete, refresh])

  // Handle delete dialog close
  const handleDeleteCancel = useCallback(() => {
    setDeleteDialogOpen(false)
    setSourceToDelete(null)
  }, [])

  // Handle view details - open detail panel
  const handleViewDetails = useCallback((source) => {
    setSelectedSource(source)
    setDetailPanelOpen(true)
  }, [])

  // Handle detail panel close
  const handleDetailPanelClose = useCallback(() => {
    setDetailPanelOpen(false)
    setSelectedSource(null)
  }, [])

  // Determine if empty state should show
  const hasNoSources = allSources.length === 0
  const hasNoFilteredResults = sources.length === 0 && !hasNoSources

  // Only show full-page loading on initial load, not during refresh
  // This prevents UploadZone from being unmounted during upload
  if (loading && allSources.length === 0 && !showUploadZone) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-accent-new" />
        <span className="ml-3 text-text-secondary">Loading sources...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-accent-overdue text-lg mb-2">Error loading sources</div>
        <p className="text-text-secondary">{error}</p>
      </div>
    )
  }

  return (
    <div>
      <SourcesHeader sourceCount={allSources.length} />

      {/* Only show toolbar if there are sources or upload zone is visible */}
      {(!hasNoSources || showUploadZone) && (
        <SourcesToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          domainFilter={domainFilter}
          onDomainChange={setDomainFilter}
          domains={domains}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          onAddClick={handleAddClick}
        />
      )}

      {/* Upload zone */}
      {showUploadZone && (
        <UploadZone
          onUpload={handleUploadStart}
          onComplete={handleProcessingComplete}
          onClose={handleCloseUpload}
          isExpanded={true}
        />
      )}

      {/* Upload success notification */}
      {uploadSuccess && (
        <div className="mb-6 p-4 bg-accent-progress/10 border border-accent-progress/30 rounded-lg flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-accent-progress flex-shrink-0" />
          <div>
            <p className="text-text-primary font-medium">Document processed successfully!</p>
            <p className="text-sm text-text-secondary">
              Your document has been analyzed and practice items have been generated.
            </p>
          </div>
          <button
            onClick={() => setUploadSuccess(null)}
            className="ml-auto text-text-muted hover:text-text-primary"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Empty states */}
      {hasNoSources && !showUploadZone && (
        <EmptyState onAddClick={handleAddClick} isFiltered={false} />
      )}

      {hasNoFilteredResults && (
        <EmptyState onAddClick={handleAddClick} isFiltered={true} />
      )}

      {/* Sources list */}
      {sources.length > 0 && (
        <SourcesList
          sources={sources}
          onRetry={handleRetry}
          onDelete={handleDeleteRequest}
          onViewDetails={handleViewDetails}
        />
      )}

      {/* Source Detail Panel */}
      <SourceDetailPanel
        source={selectedSource}
        isOpen={detailPanelOpen}
        onClose={handleDetailPanelClose}
        onDelete={handleDeleteRequest}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Source"
        message={
          <div>
            <p className="mb-2">
              Are you sure you want to delete <strong>{sourceToDelete?.title}</strong>?
            </p>
            <p className="text-sm text-gray-500">
              This will permanently remove the source and all associated knowledge components
              ({sourceToDelete?.kcCount || 0} concepts) and practice items ({sourceToDelete?.itemCount || 0} items).
              This action cannot be undone.
            </p>
          </div>
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  )
}
