import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { SupabaseProvider } from './contexts/SupabaseContext'
import { ZenModeProvider } from './contexts/ZenModeContext'
import Layout from './components/layout/Layout'
import Home from './pages/Home'
import Calendar from './pages/Calendar'
import DueForReview from './pages/DueForReview'
import Sources from './pages/Sources'
import Progress from './pages/Progress'
import Analytics from './pages/Analytics'
import Study from './pages/Study'
import DocumentReader from './pages/DocumentReader'

function App() {
  return (
    <SupabaseProvider>
      <ZenModeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="review" element={<DueForReview />} />
              <Route path="sources" element={<Sources />} />
              <Route path="sources/:id" element={<Sources />} />
              <Route path="progress" element={<Progress />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="reader/:sourceId" element={<DocumentReader />} />
            </Route>
            <Route path="/study" element={<Study />} />
            <Route path="/study/:sourceId" element={<Study />} />
          </Routes>
        </BrowserRouter>
      </ZenModeProvider>
    </SupabaseProvider>
  )
}

export default App
