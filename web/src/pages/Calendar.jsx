import { useState, useEffect } from 'react'
import { useSupabase } from '../contexts/SupabaseContext'
import MonthNavigation from '../components/calendar/MonthNavigation'
import CalendarGrid from '../components/calendar/CalendarGrid'
import ScheduleForm from '../components/calendar/ScheduleForm'

export default function Calendar() {
  const { supabase, sources } = useSupabase()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [scheduledSessions, setScheduledSessions] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch scheduled sessions for the current month
  useEffect(() => {
    const fetchScheduledSessions = async () => {
      setLoading(true)
      try {
        // Get first and last day of month
        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .gte('started_at', firstDay.toISOString())
          .lte('started_at', lastDay.toISOString())

        if (error) throw error
        setScheduledSessions(data || [])
      } catch (err) {
        console.error('Error fetching sessions:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchScheduledSessions()
  }, [supabase, currentDate])

  // Navigate to previous month
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  // Navigate to next month
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  // Handle date selection
  const handleSelectDate = (date) => {
    setSelectedDate(date)
  }

  // Handle scheduling a new session
  const handleSchedule = async (sessionData) => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          id: `sess_${Date.now().toString(36)}`,
          session_type: sessionData.session_type,
          started_at: sessionData.scheduled_for,
          target_duration_minutes: sessionData.duration_minutes,
        })
        .select()
        .single()

      if (error) throw error

      // Add to local state
      setScheduledSessions(prev => [...prev, data])
      alert('Study session scheduled!')
    } catch (err) {
      console.error('Error scheduling session:', err)
      alert('Failed to schedule session')
    }
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-text-primary">Learning Calendar</h1>
        <p className="text-text-secondary mt-2">Plan and schedule your study sessions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar section */}
        <div className="lg:col-span-2">
          <MonthNavigation
            currentDate={currentDate}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
          />
          <CalendarGrid
            currentDate={currentDate}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            scheduledSessions={scheduledSessions}
          />

          {/* Sessions for selected date */}
          {selectedDate && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-text-primary mb-3">
                Sessions on {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              {scheduledSessions.filter(s => {
                const sessionDate = new Date(s.started_at)
                return (
                  sessionDate.getDate() === selectedDate.getDate() &&
                  sessionDate.getMonth() === selectedDate.getMonth() &&
                  sessionDate.getFullYear() === selectedDate.getFullYear()
                )
              }).length > 0 ? (
                <div className="space-y-2">
                  {scheduledSessions.filter(s => {
                    const sessionDate = new Date(s.started_at)
                    return (
                      sessionDate.getDate() === selectedDate.getDate() &&
                      sessionDate.getMonth() === selectedDate.getMonth() &&
                      sessionDate.getFullYear() === selectedDate.getFullYear()
                    )
                  }).map(session => (
                    <div
                      key={session.id}
                      className="bg-bg-card rounded-button border border-bg-card-border p-4 flex justify-between items-center"
                    >
                      <div>
                        <span className="font-medium text-text-primary capitalize">
                          {session.session_type} Session
                        </span>
                        {session.target_duration_minutes && (
                          <span className="text-text-secondary ml-2">
                            ({session.target_duration_minutes} min)
                          </span>
                        )}
                      </div>
                      {session.ended_at ? (
                        <span className="text-sm text-accent-progress">Completed</span>
                      ) : (
                        <span className="text-sm text-accent-alert">Scheduled</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-text-secondary">No sessions scheduled for this date.</p>
              )}
            </div>
          )}
        </div>

        {/* Schedule form */}
        <div>
          <ScheduleForm
            sources={sources}
            selectedDate={selectedDate}
            onSchedule={handleSchedule}
          />
        </div>
      </div>
    </div>
  )
}
