import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useSupabase } from '../contexts/SupabaseContext'
import { useSessionPersistence } from '../hooks/useSessionPersistence'
import SessionHeader from '../components/study/SessionHeader'
import QuestionCard from '../components/study/QuestionCard'
import AnswerInput from '../components/study/AnswerInput'
import SelfAssessment from '../components/study/SelfAssessment'
import SessionSummary from '../components/study/SessionSummary'
import SessionRecoveryDialog from '../components/study/SessionRecoveryDialog'

export default function Study() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { supabase } = useSupabase()

  const sourceId = searchParams.get('source')

  // Session persistence hook
  const {
    incompleteSession,
    checkingSession,
    showRecoveryDialog,
    resumeSession,
    startFresh,
    saveStatus,
    lastSaveTime,
    saveSessionState,
    initializeSession,
    completeSession,
    pauseSession,
    isTabLocked
  } = useSessionPersistence({ sourceId })

  // Session state
  const [sessionId, setSessionId] = useState(null)
  const [sessionStartTime, setSessionStartTime] = useState(null)
  const [items, setItems] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Current item state
  const [currentKc, setCurrentKc] = useState(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [userResponse, setUserResponse] = useState(null) // Full response object from input components
  const [showAssessment, setShowAssessment] = useState(false)
  const [itemStartTime, setItemStartTime] = useState(null)

  // Completed attempts tracking
  const [completedAttempts, setCompletedAttempts] = useState([])
  const [showSummary, setShowSummary] = useState(false)

  // Recovery state
  const [isResuming, setIsResuming] = useState(false)
  const [recoveryLoading, setRecoveryLoading] = useState(false)

  // Refs for beforeunload
  const sessionStateRef = useRef(null)

  // Keep sessionStateRef updated
  useEffect(() => {
    if (sessionId && items.length > 0) {
      sessionStateRef.current = {
        id: sessionId,
        currentIndex,
        queueItemIds: items.map(item => item.id),
        itemsCompleted: completedAttempts.length
      }
    }
  }, [sessionId, items, currentIndex, completedAttempts])

  // BeforeUnload handler - pause session on tab close/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionStateRef.current && !showSummary) {
        pauseSession()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [pauseSession, showSummary])

  // Handle resuming session
  const handleResumeSession = async () => {
    setRecoveryLoading(true)
    const sessionData = await resumeSession()

    if (sessionData) {
      setIsResuming(true)
      setSessionId(sessionData.id)
      setSessionStartTime(new Date(sessionData.started_at).getTime())

      // Fetch items and restore position
      await fetchStudyQueueForResume(sessionData)
    }
    setRecoveryLoading(false)
  }

  // Handle starting fresh
  const handleStartFresh = async () => {
    setRecoveryLoading(true)
    await startFresh()
    setRecoveryLoading(false)
    // fetchStudyQueue will be called by useEffect since showRecoveryDialog becomes false
  }

  // Fetch study queue for resume
  const fetchStudyQueueForResume = async (sessionData) => {
    try {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Not authenticated')
        setLoading(false)
        return
      }

      // If we have queue item IDs, fetch items in that order
      if (sessionData.queueItemIds && sessionData.queueItemIds.length > 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('practice_items')
          .select('*, knowledge_components(*)')
          .in('id', sessionData.queueItemIds)

        if (itemsError) {
          throw new Error('Failed to fetch practice items')
        }

        // Reorder items to match saved queue order
        const itemsMap = Object.fromEntries(itemsData.map(item => [item.id, item]))
        const orderedItems = sessionData.queueItemIds
          .map(id => itemsMap[id])
          .filter(Boolean)
          .map(item => ({
            ...item,
            knowledge_components: item.knowledge_components
          }))

        setItems(orderedItems)
        setCurrentIndex(sessionData.currentIndex || 0)
        setCompletedAttempts(new Array(sessionData.itemsCompleted || 0).fill({ score: 0, difficulty: 3 }))

        if (orderedItems.length > 0 && sessionData.currentIndex < orderedItems.length) {
          setCurrentKc(orderedItems[sessionData.currentIndex].knowledge_components)
        }

        setItemStartTime(Date.now())
        setLoading(false)
      } else {
        // No queue data, start fresh
        await fetchStudyQueue()
      }
    } catch (err) {
      console.error('Error resuming study queue:', err)
      setError(err.message || 'Failed to resume session')
      setLoading(false)
    }
  }

  // Fetch study queue (fresh start)
  const fetchStudyQueue = useCallback(async () => {
    try {
      setLoading(true)

      // Get current user for session creation
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Not authenticated')
        setLoading(false)
        return
      }

      // Get KCs directly from Supabase (RLS policy fixed)
      let kcsQuery = supabase
        .from('knowledge_components')
        .select('id, name, knowledge_type, source_id')

      if (sourceId) {
        kcsQuery = kcsQuery.eq('source_id', sourceId)
      }

      const { data: kcsData, error: kcsError } = await kcsQuery

      if (kcsError) {
        throw new Error('Failed to fetch knowledge components')
      }

      if (!kcsData || kcsData.length === 0) {
        setError('No items to study. Try adding some documents first!')
        setLoading(false)
        return
      }

      // Get practice items for those KCs (RLS policy fixed)
      const kcIds = kcsData.map(kc => kc.id)
      const { data: itemsData, error: itemsError } = await supabase
        .from('practice_items')
        .select('*')
        .in('kc_id', kcIds)
        .limit(20)

      if (itemsError) {
        throw new Error('Failed to fetch practice items')
      }

      if (!itemsData || itemsData.length === 0) {
        setError('No practice items found. Try adding some documents first!')
        setLoading(false)
        return
      }

      // Attach KC info to each item
      const kcMap = Object.fromEntries(kcsData.map(kc => [kc.id, kc]))
      const practiceItems = itemsData.map(item => ({
        ...item,
        knowledge_components: kcMap[item.kc_id]
      }))

      // Shuffle items for variety
      const shuffled = [...practiceItems].sort(() => Math.random() - 0.5)
      setItems(shuffled)

      // Create session directly in Supabase (RLS policy allows insert with user_id)
      const newSessionId = `sess_${Date.now().toString(36)}`
      const { error: sessionError } = await supabase
        .from('sessions')
        .insert({
          id: newSessionId,
          user_id: user.id,
          session_type: sourceId ? 'source_review' : 'mixed',
          started_at: new Date().toISOString(),
          status: 'active',
          current_item_index: 0,
          queue_item_ids: JSON.stringify(shuffled.map(item => item.id)),
          last_activity_at: new Date().toISOString()
        })

      if (sessionError) {
        console.error('Session creation error:', sessionError)
        throw new Error('Failed to create study session')
      }

      setSessionId(newSessionId)
      setSessionStartTime(Date.now())
      setItemStartTime(Date.now())

      // Initialize session persistence
      await initializeSession(newSessionId, shuffled.map(item => item.id))

      // Load first KC
      if (shuffled.length > 0) {
        setCurrentKc(shuffled[0].knowledge_components)
      }

      setLoading(false)
    } catch (err) {
      console.error('Error fetching study queue:', err)
      setError(err.message || 'Failed to load study items')
      setLoading(false)
    }
  }, [supabase, sourceId, initializeSession])

  // Fetch study queue on mount (only if not showing recovery dialog)
  useEffect(() => {
    if (!checkingSession && !showRecoveryDialog && !isResuming) {
      fetchStudyQueue()
    }
  }, [checkingSession, showRecoveryDialog, isResuming, fetchStudyQueue])

  // Record attempt and move to next item (shared logic)
  const recordAttemptAndMoveNext = async (score, correctness, responseText, extraData = {}) => {
    const currentItem = items[currentIndex]
    const responseTimeMs = Date.now() - itemStartTime

    try {
      // Record attempt
      const attemptData = {
        id: `att_${Date.now().toString(36)}`,
        session_id: sessionId,
        practice_item_id: currentItem.id,
        kc_id: currentItem.kc_id,
        started_at: new Date(itemStartTime).toISOString(),
        completed_at: new Date().toISOString(),
        response_time_ms: responseTimeMs,
        response: responseText || null,
        score: score,
        correctness: correctness,
        ...extraData
      }

      const { error: attemptError } = await supabase
        .from('attempts')
        .insert(attemptData)

      if (attemptError) {
        console.error('Error recording attempt:', attemptError)
      }

      // Update KC state
      const { data: kcState, error: stateError } = await supabase
        .from('kc_state')
        .select('*')
        .eq('kc_id', currentItem.kc_id)
        .single()

      if (!stateError && kcState) {
        const alpha = kcState.exposure_count <= 2 ? 0.7 : kcState.exposure_count <= 5 ? 0.5 : 0.35
        const newMastery = alpha * score + (1 - alpha) * kcState.mastery_level

        await supabase
          .from('kc_state')
          .update({
            mastery_level: newMastery,
            exposure_count: kcState.exposure_count + 1,
            last_exposure_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('kc_id', currentItem.kc_id)
      } else if (stateError && stateError.code === 'PGRST116') {
        // No existing state, create one
        await supabase
          .from('kc_state')
          .insert({
            kc_id: currentItem.kc_id,
            mastery_level: score,
            exposure_count: 1,
            last_exposure_at: new Date().toISOString(),
          })
      }

      // Track completed attempt (convert score to 1-5 scale for summary)
      const newCompletedAttempts = [...completedAttempts, { score: score * 5, difficulty: 3 }]
      setCompletedAttempts(newCompletedAttempts)

      // Save session state after each answer
      const nextIndex = currentIndex + 1
      saveSessionState({
        id: sessionId,
        currentIndex: nextIndex,
        queueItemIds: items.map(item => item.id),
        itemsCompleted: newCompletedAttempts.length
      })

    } catch (err) {
      console.error('Error saving attempt:', err)
    }

    // Move to next item or show summary
    if (currentIndex < items.length - 1) {
      const nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)
      setCurrentKc(items[nextIndex].knowledge_components)
      setUserAnswer('')
      setUserResponse(null)
      setShowAssessment(false)
      setItemStartTime(Date.now())
    } else {
      // End of session
      endSession()
    }
  }

  // Handle answer submission
  // Response can be a string (legacy) or an object with type field
  const handleSubmit = async (response) => {
    if (typeof response === 'string') {
      // Legacy string response
      setUserAnswer(response)
      setUserResponse({ type: 'text', value: response })
      setShowAssessment(true)
    } else if (response.type === 'selection') {
      // Recognition mode: auto-grade and skip self-assessment
      const isCorrect = response.isCorrect
      const score = response.score // Already 0.0 or 1.0
      const correctness = isCorrect ? 'correct' : 'incorrect'

      // Record attempt immediately and move to next
      await recordAttemptAndMoveNext(score, correctness, response.value)
    } else if (response.type === 'completion') {
      // Execution mode: skip self-assessment, use independence-based scoring
      const score = response.score // Already calculated from independence level
      const correctness = response.completed
        ? (response.independenceLevel >= 3 ? 'correct' : 'partial')
        : 'incorrect'

      // Record attempt with execution-specific fields
      await recordAttemptAndMoveNext(score, correctness, response.value, {
        task_completed: response.completed ? 1 : 0,
        independence_level: response.independenceLevel?.toString(),
        iterations_to_complete: response.iterations,
        errors_encountered: response.errors
      })
    } else {
      // Other new response object formats (text, etc.)
      setUserAnswer(response.value || '')
      setUserResponse(response)
      setShowAssessment(true)
    }
  }

  // Handle skip (show answer without user response)
  const handleSkip = () => {
    setUserAnswer('')
    setUserResponse(null)
    setShowAssessment(true)
  }

  // Handle rating and move to next item (for self-assessment modes)
  const handleRate = async ({ score, difficulty }) => {
    // Convert 1-5 score to 0-1 normalized score
    const normalizedScore = score / 5
    const correctness = score >= 4 ? 'correct' : score >= 3 ? 'partial' : 'incorrect'

    // Include hints tracking if available from cued_recall mode
    const extraData = {
      difficulty_rating: difficulty
    }
    if (userResponse?.hintsUsed !== undefined) {
      extraData.hints_requested = userResponse.hintsUsed
    }

    await recordAttemptAndMoveNext(normalizedScore, correctness, userAnswer, extraData)
  }

  // End session
  const endSession = async () => {
    if (sessionId) {
      const duration = Math.round((Date.now() - sessionStartTime) / 1000)
      const avgScore = completedAttempts.length > 0
        ? completedAttempts.reduce((sum, a) => sum + a.score, 0) / completedAttempts.length
        : 0

      // Mark session as completed via persistence hook
      await completeSession(sessionId, {
        itemsCompleted: completedAttempts.length,
        averageScore: avgScore / 5,
        durationMinutes: Math.round(duration / 60)
      })
    }

    setShowSummary(true)
  }

  // Handle end session button
  const handleEndSession = () => {
    if (completedAttempts.length > 0) {
      endSession()
    } else {
      navigate('/')
    }
  }

  // Handle study more after summary
  const handleStudyMore = () => {
    setShowSummary(false)
    setCompletedAttempts([])
    setCurrentIndex(0)
    setIsResuming(false)
    fetchStudyQueue()
  }

  // Show recovery dialog if incomplete session found
  if (showRecoveryDialog && incompleteSession) {
    return (
      <SessionRecoveryDialog
        session={incompleteSession}
        onResume={handleResumeSession}
        onStartFresh={handleStartFresh}
        loading={recoveryLoading}
      />
    )
  }

  // Show tab locked message
  if (isTabLocked) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-text-secondary mb-4">This session is already open in another tab.</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-btn-primary text-white rounded-button"
        >
          Go Home
        </button>
      </div>
    )
  }

  // Loading state (including checking for session)
  if (loading || checkingSession) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-progress"></div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-text-secondary mb-4">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-btn-primary text-white rounded-button"
        >
          Go Home
        </button>
      </div>
    )
  }

  const currentItem = items[currentIndex]
  const sessionDuration = sessionStartTime ? Math.round((Date.now() - sessionStartTime) / 1000) : 0
  const avgScore = completedAttempts.length > 0
    ? completedAttempts.reduce((sum, a) => sum + a.score, 0) / completedAttempts.length
    : 0

  return (
    <div className="min-h-screen bg-bg-main">
      <SessionHeader
        currentIndex={currentIndex}
        totalItems={items.length}
        onEndSession={handleEndSession}
        saveStatus={saveStatus}
        lastSaveTime={lastSaveTime}
      />

      <div className="py-12 px-6">
        {!showAssessment ? (
          <>
            <QuestionCard item={currentItem} kc={currentKc} />
            <div className="mt-8">
              <AnswerInput
                practiceMode={currentItem?.practice_mode}
                item={currentItem}
                onSubmit={handleSubmit}
                onSkip={handleSkip}
                disabled={showAssessment}
              />
            </div>
          </>
        ) : (
          <SelfAssessment
            expectedAnswer={currentItem?.expected_response || 'No expected answer provided'}
            userAnswer={userAnswer}
            onRate={handleRate}
          />
        )}
      </div>

      {showSummary && (
        <SessionSummary
          itemsCompleted={completedAttempts.length}
          averageScore={avgScore}
          duration={sessionDuration}
          onClose={handleStudyMore}
        />
      )}
    </div>
  )
}
