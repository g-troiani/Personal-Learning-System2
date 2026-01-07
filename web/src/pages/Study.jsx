import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useSupabase } from '../contexts/SupabaseContext'
import SessionHeader from '../components/study/SessionHeader'
import QuestionCard from '../components/study/QuestionCard'
import AnswerInput from '../components/study/AnswerInput'
import SelfAssessment from '../components/study/SelfAssessment'
import SessionSummary from '../components/study/SessionSummary'

export default function Study() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { supabase } = useSupabase()

  const sourceId = searchParams.get('source')

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
  const [showAssessment, setShowAssessment] = useState(false)
  const [itemStartTime, setItemStartTime] = useState(null)

  // Completed attempts tracking
  const [completedAttempts, setCompletedAttempts] = useState([])
  const [showSummary, setShowSummary] = useState(false)

  // Fetch study queue
  const fetchStudyQueue = useCallback(async () => {
    try {
      setLoading(true)

      // Get practice items via backend API (bypasses RLS issue on practice_items)
      // TODO: Fix RLS policy on practice_items table and revert to direct Supabase query
      const authSession = await supabase.auth.getSession()
      const token = authSession?.data?.session?.access_token

      if (!token) {
        setError('Please log in to study.')
        setLoading(false)
        return
      }

      const apiUrl = `http://localhost:8001/api/migration/study-items${sourceId ? `?source_id=${sourceId}` : ''}`
      const response = await fetch(apiUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch study items')
      }

      const result = await response.json()
      const practiceItems = result.items || []

      if (!practiceItems || practiceItems.length === 0) {
        setError('No items to study. Try adding some documents first!')
        setLoading(false)
        return
      }

      // Shuffle items for variety
      const shuffled = [...practiceItems].sort(() => Math.random() - 0.5)
      setItems(shuffled)

      // Create session via backend API (bypasses RLS issue on sessions table)
      const sessionResponse = await fetch('http://localhost:8001/api/migration/create-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_type: sourceId ? 'source_review' : 'mixed',
          source_id: sourceId || null
        })
      })

      if (!sessionResponse.ok) {
        throw new Error('Failed to create study session')
      }

      const session = await sessionResponse.json()
      setSessionId(session.id)
      setSessionStartTime(Date.now())
      setItemStartTime(Date.now())

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
  }, [supabase, sourceId])

  useEffect(() => {
    fetchStudyQueue()
  }, [fetchStudyQueue])

  // Handle answer submission
  const handleSubmit = (answer) => {
    setUserAnswer(answer)
    setShowAssessment(true)
  }

  // Handle skip (show answer without user response)
  const handleSkip = () => {
    setUserAnswer('')
    setShowAssessment(true)
  }

  // Handle rating and move to next item
  const handleRate = async ({ score, difficulty }) => {
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
        response: userAnswer || null,
        score: score / 5, // Normalize to 0-1
        correctness: score >= 4 ? 'correct' : score >= 3 ? 'partial' : 'incorrect',
        difficulty_rating: difficulty,
      }

      const { error: attemptError } = await supabase
        .from('attempts')
        .insert(attemptData)

      if (attemptError) {
        console.error('Error recording attempt:', attemptError)
      }

      // Update KC state (simplified mastery update)
      const { data: kcState, error: stateError } = await supabase
        .from('kc_state')
        .select('*')
        .eq('kc_id', currentItem.kc_id)
        .single()

      if (!stateError && kcState) {
        const alpha = kcState.exposure_count <= 2 ? 0.7 : kcState.exposure_count <= 5 ? 0.5 : 0.35
        const newMastery = alpha * (score / 5) + (1 - alpha) * kcState.mastery_level

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
            mastery_level: score / 5,
            exposure_count: 1,
            last_exposure_at: new Date().toISOString(),
          })
      }

      // Track completed attempt
      setCompletedAttempts(prev => [...prev, { score, difficulty }])

    } catch (err) {
      console.error('Error saving attempt:', err)
    }

    // Move to next item or show summary
    if (currentIndex < items.length - 1) {
      const nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)
      setCurrentKc(items[nextIndex].knowledge_components)
      setUserAnswer('')
      setShowAssessment(false)
      setItemStartTime(Date.now())
    } else {
      // End of session
      endSession()
    }
  }

  // End session
  const endSession = async () => {
    if (sessionId) {
      const duration = Math.round((Date.now() - sessionStartTime) / 1000)
      const avgScore = completedAttempts.length > 0
        ? completedAttempts.reduce((sum, a) => sum + a.score, 0) / completedAttempts.length
        : 0

      try {
        await supabase
          .from('sessions')
          .update({
            ended_at: new Date().toISOString(),
            actual_duration_minutes: Math.round(duration / 60),
            items_completed: completedAttempts.length,
            average_score: avgScore / 5,
          })
          .eq('id', sessionId)
      } catch (err) {
        console.error('Error ending session:', err)
      }
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
    fetchStudyQueue()
  }

  // Loading state
  if (loading) {
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
      />

      <div className="py-12 px-6">
        {!showAssessment ? (
          <>
            <QuestionCard item={currentItem} kc={currentKc} />
            <div className="mt-8">
              <AnswerInput
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
