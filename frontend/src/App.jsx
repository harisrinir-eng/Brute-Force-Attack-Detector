import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import ParticleBackground from './components/ParticleBackground.jsx'

export default function App() {
  return (
    <div className="scanlines min-h-screen relative">
      <ParticleBackground />
      <div className="relative z-10">
        <Routes>
          <Route path="/"          element={<Navigate to="/login" replace />} />
          <Route path="/login"     element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </div>
    </div>
  )
}
