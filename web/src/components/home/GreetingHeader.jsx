import { useState, useEffect } from 'react'

export default function GreetingHeader({ userName = 'Learner' }) {
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) {
      setGreeting('Good morning')
    } else if (hour < 17) {
      setGreeting('Good afternoon')
    } else {
      setGreeting('Good evening')
    }
  }, [])

  return (
    <div className="mb-6">
      <h1 className="text-3xl font-semibold text-text-primary">
        {greeting}, {userName}
      </h1>
      <p className="text-text-secondary mt-1">Ready to learn something?</p>
    </div>
  )
}
