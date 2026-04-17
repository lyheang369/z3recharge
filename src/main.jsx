import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// eslint-disable-next-line react-refresh/only-export-components
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'))
// eslint-disable-next-line react-refresh/only-export-components
const AdminLogin = lazy(() => import('./pages/AdminLogin.jsx'))
// eslint-disable-next-line react-refresh/only-export-components
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute.jsx'))

// eslint-disable-next-line react-refresh/only-export-components
const Loading = () => (
  <div className="min-h-screen flex items-center justify-center bg-dark-900">
    <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin-slow" />
  </div>
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename="/z3recharge">
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          } />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
)
