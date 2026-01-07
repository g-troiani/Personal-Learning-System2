import { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, FileText, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import UploadProgress from './UploadProgress'
import { useSourceProcessing } from '../../hooks/useSourceProcessing'
import { uploadSource } from '../../lib/api'

// Supported file types and max size
const SUPPORTED_TYPES = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/markdown': '.md',
  'text/plain': '.txt'
}
const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.md', '.txt']
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

// Upload states
const STATES = {
  IDLE: 'idle',
  DRAGOVER: 'dragover',
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  COMPLETE: 'complete',
  ERROR: 'error'
}

export default function UploadZone({ onUpload, onClose, onComplete, isExpanded = true }) {
  const [state, setState] = useState(STATES.IDLE)
  const [selectedFile, setSelectedFile] = useState(null)
  const [error, setError] = useState(null)
  const [processingStep, setProcessingStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [sourceId, setSourceId] = useState(null)
  const fileInputRef = useRef(null)

  // Monitor processing status via Supabase Realtime
  const {
    status: processingStatus,
    progress: processingProgress,
    step: processingStepMsg,
    isComplete,
    hasError,
    error: processingError
  } = useSourceProcessing(sourceId)

  // Sync UI state with processing status from Supabase Realtime
  useEffect(() => {
    // Only update if we have a sourceId and are in a processing state
    if (!sourceId) return

    // If we have a sourceId but status hasn't loaded yet, keep showing processing
    if (!processingStatus) {
      // Ensure we're in processing state while waiting for status
      if (state !== STATES.PROCESSING && state !== STATES.COMPLETE && state !== STATES.ERROR) {
        setState(STATES.PROCESSING)
      }
      return
    }

    // Update progress from realtime data (only if > 0 to avoid resetting)
    if (processingProgress > 0) {
      setProgress(processingProgress)
    }

    // Map processing status to step number
    // Note: processingStatus is the full status object, use processing_status field
    const stepMap = {
      'pending': 0,
      'extracting_text': 1,
      'extracting_kcs': 2,
      'generating_items': 3,
      'ready': 4
    }
    const statusString = processingStatus?.processing_status
    if (stepMap[statusString] !== undefined) {
      setProcessingStep(stepMap[statusString])
      // Ensure we're in processing state if backend is processing
      if (statusString !== 'ready' && statusString !== 'error' && state !== STATES.PROCESSING) {
        setState(STATES.PROCESSING)
      }
    }

    // Handle completion
    if (isComplete) {
      setState(STATES.COMPLETE)
      setProgress(100)
      setProcessingStep(4)
      if (onComplete) {
        onComplete(sourceId)
      }
    }

    // Handle error
    if (hasError) {
      setState(STATES.ERROR)
      setError(processingError || 'Processing failed. Please try again.')
    }
  }, [sourceId, processingStatus, processingProgress, isComplete, hasError, processingError, onComplete, state])

  // Validate file type and size
  const validateFile = useCallback((file) => {
    // Check file extension
    const fileName = file.name.toLowerCase()
    const hasValidExtension = SUPPORTED_EXTENSIONS.some(ext => fileName.endsWith(ext))

    if (!hasValidExtension) {
      return { valid: false, error: `Unsupported file type. Please upload ${SUPPORTED_EXTENSIONS.join(', ')} files.` }
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `File too large. Maximum size is 25MB.` }
    }

    return { valid: true, error: null }
  }, [])

  // Handle file selection
  const handleFileSelect = useCallback((file) => {
    const validation = validateFile(file)

    if (!validation.valid) {
      setError(validation.error)
      setState(STATES.ERROR)
      setSelectedFile(null)
      return
    }

    setSelectedFile(file)
    setError(null)
    setState(STATES.IDLE)
  }, [validateFile])

  // Handle drag events
  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setState(STATES.DRAGOVER)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setState(STATES.IDLE)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setState(STATES.IDLE)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  // Handle file input change
  const handleInputChange = useCallback((e) => {
    const files = e.target.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  // Upload file to real API with authentication
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return

    setState(STATES.UPLOADING)
    setProgress(0)
    setProcessingStep(0)
    setSourceId(null)
    setError(null)

    try {
      // Upload using authenticated API
      const data = await uploadSource(selectedFile, 'general')

      // Set source ID to start monitoring via Supabase Realtime
      setSourceId(data.source_id)
      setProgress(10)

      // Transition to processing state - the useEffect will handle the rest
      setState(STATES.PROCESSING)

      // Call onUpload callback with initial info
      if (onUpload) {
        onUpload({
          file: selectedFile,
          sourceId: data.source_id,
          status: 'processing'
        })
      }
    } catch (err) {
      console.error('Upload error:', err)
      setState(STATES.ERROR)
      setError(err.message || 'Failed to upload file. Please try again.')
    }
  }, [selectedFile, onUpload])

  // Reset the upload zone
  const handleReset = useCallback(() => {
    setSelectedFile(null)
    setError(null)
    setState(STATES.IDLE)
    setProgress(0)
    setProcessingStep(0)
    setSourceId(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  // Format file size
  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (!isExpanded) return null

  return (
    <div className="bg-bg-card border border-bg-card-border rounded-card p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-text-primary">Upload Document</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Drag and drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
          ${state === STATES.DRAGOVER
            ? 'border-accent-new bg-accent-new/5'
            : state === STATES.ERROR
            ? 'border-accent-overdue bg-accent-overdue/5'
            : state === STATES.COMPLETE
            ? 'border-accent-progress bg-accent-progress/5'
            : 'border-bg-card-border hover:border-accent-new/50 hover:bg-gray-50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={SUPPORTED_EXTENSIONS.join(',')}
          onChange={handleInputChange}
          className="hidden"
        />

        {/* Idle state */}
        {(state === STATES.IDLE || state === STATES.DRAGOVER) && !selectedFile && (
          <div className="space-y-3">
            <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${state === STATES.DRAGOVER ? 'bg-accent-new/20' : 'bg-gray-100'}`}>
              <Upload className={`w-6 h-6 ${state === STATES.DRAGOVER ? 'text-accent-new' : 'text-text-muted'}`} />
            </div>
            <div>
              <p className="text-text-primary font-medium">
                {state === STATES.DRAGOVER ? 'Drop file here' : 'Drag and drop your document'}
              </p>
              <p className="text-sm text-text-muted mt-1">
                or click to browse
              </p>
            </div>
            <p className="text-xs text-text-muted">
              Supports PDF, PPTX, DOCX, Markdown, and TXT (max 25MB)
            </p>
          </div>
        )}

        {/* File selected state */}
        {selectedFile && state !== STATES.UPLOADING && state !== STATES.PROCESSING && state !== STATES.COMPLETE && (
          <div className="space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-accent-new/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-accent-new" />
            </div>
            <div>
              <p className="text-text-primary font-medium truncate max-w-xs mx-auto" title={selectedFile.name}>
                {selectedFile.name}
              </p>
              <p className="text-sm text-text-muted mt-1">
                {formatSize(selectedFile.size)}
              </p>
            </div>
          </div>
        )}

        {/* Uploading/Processing state */}
        {(state === STATES.UPLOADING || state === STATES.PROCESSING) && (
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-accent-new/10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-accent-new animate-spin" />
            </div>
            <UploadProgress step={processingStep} progress={progress} />
          </div>
        )}

        {/* Complete state */}
        {state === STATES.COMPLETE && (
          <div className="space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-accent-progress/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-accent-progress" />
            </div>
            <div>
              <p className="text-accent-progress font-medium">Upload Complete!</p>
              <p className="text-sm text-text-muted mt-1">
                Document processed successfully
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {state === STATES.ERROR && (
          <div className="space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-accent-overdue/20 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-accent-overdue" />
            </div>
            <div>
              <p className="text-accent-overdue font-medium">Upload Failed</p>
              <p className="text-sm text-text-muted mt-1">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mt-4">
        {selectedFile && state !== STATES.UPLOADING && state !== STATES.PROCESSING && state !== STATES.COMPLETE && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); handleUpload(); }}
              className="flex-1 py-2 bg-btn-primary text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Upload & Process
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleReset(); }}
              className="px-4 py-2 bg-btn-secondary text-text-primary rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </>
        )}

        {state === STATES.ERROR && (
          <button
            onClick={(e) => { e.stopPropagation(); handleReset(); }}
            className="flex-1 py-2 bg-btn-secondary text-text-primary rounded-lg hover:bg-gray-200 transition-colors"
          >
            Try Again
          </button>
        )}

        {state === STATES.COMPLETE && (
          <button
            onClick={(e) => { e.stopPropagation(); handleReset(); }}
            className="flex-1 py-2 bg-btn-secondary text-text-primary rounded-lg hover:bg-gray-200 transition-colors"
          >
            Upload Another
          </button>
        )}
      </div>
    </div>
  )
}
