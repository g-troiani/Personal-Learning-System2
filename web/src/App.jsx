import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { SupabaseProvider } from './contexts/SupabaseContext'
import { ZenModeProvider } from './contexts/ZenModeContext'
import { ProtectedRoute } from './components/auth'
import AdminRoute from './components/auth/AdminRoute'
import Layout from './components/layout/Layout'
import Home from './pages/Home'
import Calendar from './pages/Calendar'
import DueForReview from './pages/DueForReview'
import Sources from './pages/Sources'
import Progress from './pages/Progress'
import Analytics from './pages/Analytics'
import Study from './pages/Study'
import DocumentReader from './pages/DocumentReader'
import Admin from './pages/Admin'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

function App() {
  return (
    <AuthProvider>
      <SupabaseProvider>
        <ZenModeProvider>
          <BrowserRouter>
            <Routes>
              {/* Auth routes (public) */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Protected routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Home />} />
                <Route path="calendar" element={<Calendar />} />
                <Route path="review" element={<DueForReview />} />
                <Route path="sources" element={<Sources />} />
                <Route path="sources/:id" element={<Sources />} />
                <Route path="progress" element={<Progress />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="reader/:sourceId" element={<DocumentReader />} />
              </Route>
              <Route path="/study" element={
                <ProtectedRoute>
                  <Study />
                </ProtectedRoute>
              } />
              <Route path="/study/:sourceId" element={
                <ProtectedRoute>
                  <Study />
                </ProtectedRoute>
              } />
              {/* Admin route (admin-only) */}
              <Route path="/admin" element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              } />
            </Routes>
          </BrowserRouter>
        </ZenModeProvider>
      </SupabaseProvider>
    </AuthProvider>
  )
}

export default App
