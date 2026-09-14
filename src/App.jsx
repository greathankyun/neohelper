import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './components/Home'
import ModulePage from './components/ModulePage'
import RequireAuth from './components/RequireAuth'
import PatientsList from './components/PatientsList'
import PatientDetail from './components/PatientDetail'
import { AuthProvider } from './components/AuthContext'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/module/:id" element={<ModulePage />} />
          <Route element={<RequireAuth />}>
            <Route path="/patients" element={<PatientsList />} />
            <Route path="/patients/:id" element={<PatientDetail />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  )
}
