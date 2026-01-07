import { useState, useCallback } from 'react'
import { useSupabase } from '../contexts/SupabaseContext'

// Supported file types
const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.md', '.txt', '.pptx', '.ppt']
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

/**
 * Custom hook for handling source file uploads
 * Manages file validation, upload state, and optimistic UI updates
 */
export function useSourceUpload() {
  const { addToUploadQueue, updateUploadItem, removeFromUploadQueue } = useSupabase()

  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  /**
   * Validate a file for upload
   */
  const validateFile = useCallback((file) => {
    const errors = []

    // Check file extension
    const fileName = file.name.toLowerCase()
    const hasValidExtension = SUPPORTED_EXTENSIONS.some(ext => fileName.endsWith(ext))

    if (!hasValidExtension) {
      errors.push(`Unsupported file type. Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`)
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      errors.push('File too large. Maximum size is 25MB.')
    }

    // Check if file is empty
    if (file.size === 0) {
      errors.push('File is empty.')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }, [])

  /**
   * Get file type from extension
   */
  const getFileType = useCallback((fileName) => {
    const lower = fileName.toLowerCase()
    if (lower.endsWith('.pdf')) return 'pdf'
    if (lower.endsWith('.docx')) return 'docx'
    if (lower.endsWith('.md')) return 'markdown'
    if (lower.endsWith('.txt')) return 'text'
    if (lower.endsWith('.pptx') || lower.endsWith('.ppt')) return 'pptx'
    return 'unknown'
  }, [])

  /**
   * Create an optimistic source entry for immediate UI feedback
   */
  const createOptimisticSource = useCallback((file) => {
    const id = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const fileType = getFileType(file.name)

    return {
      id,
      title: file.name,
      file_path: null,
      content: '',
      content_type: fileType,
      domain: 'general',
      word_count: null,
      metadata: JSON.stringify({ originalName: file.name, size: file.size }),
      ingested_at: new Date().toISOString(),
      status: 'active',
      // Processing fields
      processing_status: 'pending',
      processing_progress: 0,
      processing_step: 'Waiting...',
      error_message: null,
      // Computed fields for display
      kcCount: 0,
      itemCount: 0,
      mastery: 0,
      overdueCount: 0,
      dueCount: 0,
      newCount: 0,
      // Flag to identify optimistic entries
      isOptimistic: true
    }
  }, [getFileType])

  /**
   * Start the upload process for a file
   * In M17, this creates an optimistic entry and simulates progress
   * In M18+, this will call the actual API
   */
  const uploadFile = useCallback(async (file, options = {}) => {
    const { domain = 'general', onProgress, onComplete, onError } = options

    // Validate file
    const validation = validateFile(file)
    if (!validation.valid) {
      const error = validation.errors.join(' ')
      setUploadError(error)
      if (onError) onError(error)
      return { success: false, error }
    }

    setIsUploading(true)
    setUploadError(null)

    // Add to upload queue
    const queueId = addToUploadQueue(file)

    try {
      // Simulate upload progress (M17 - will be replaced by real API in M18)
      const simulateProgress = () => {
        return new Promise((resolve) => {
          let progress = 0
          let step = 0

          const steps = [
            { progress: 25, status: 'uploading', step: 'Uploading...' },
            { progress: 50, status: 'processing', step: 'Extracting text...' },
            { progress: 75, status: 'processing', step: 'Analyzing content...' },
            { progress: 100, status: 'complete', step: 'Complete!' }
          ]

          const interval = setInterval(() => {
            if (step >= steps.length) {
              clearInterval(interval)
              resolve({ success: true })
              return
            }

            const currentStep = steps[step]
            progress = currentStep.progress

            updateUploadItem(queueId, {
              status: currentStep.status,
              progress,
              step: currentStep.step
            })

            if (onProgress) {
              onProgress({
                progress,
                status: currentStep.status,
                step: currentStep.step
              })
            }

            step++
          }, 1000)
        })
      }

      const result = await simulateProgress()

      // Generate mock results
      const mockResults = {
        sourceId: `src_${Date.now()}`,
        kcCount: Math.floor(Math.random() * 15) + 5,
        itemCount: Math.floor(Math.random() * 45) + 15
      }

      updateUploadItem(queueId, {
        status: 'complete',
        progress: 100,
        sourceId: mockResults.sourceId
      })

      if (onComplete) {
        onComplete(mockResults)
      }

      setIsUploading(false)
      return { success: true, ...mockResults }

    } catch (err) {
      const error = err.message || 'Upload failed'
      setUploadError(error)

      updateUploadItem(queueId, {
        status: 'error',
        error
      })

      if (onError) onError(error)

      setIsUploading(false)
      return { success: false, error }
    }
  }, [validateFile, addToUploadQueue, updateUploadItem])

  /**
   * Cancel an upload in progress
   */
  const cancelUpload = useCallback((queueId) => {
    removeFromUploadQueue(queueId)
  }, [removeFromUploadQueue])

  /**
   * Clear upload error
   */
  const clearError = useCallback(() => {
    setUploadError(null)
  }, [])

  return {
    // State
    isUploading,
    uploadError,
    // Actions
    validateFile,
    uploadFile,
    cancelUpload,
    clearError,
    createOptimisticSource,
    // Constants
    SUPPORTED_EXTENSIONS,
    MAX_FILE_SIZE
  }
}
