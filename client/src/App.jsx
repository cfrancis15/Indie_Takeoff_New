import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ProtectedOutlet from './components/ProtectedOutlet.jsx'
import Home from './pages/Home.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ColdEmail from './pages/ColdEmail.jsx'
import PhysicalMail from './pages/PhysicalMail.jsx'
import Social from './pages/Social.jsx'
import Newsletter from './pages/Newsletter.jsx'
import Prospecting from './pages/Prospecting.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route element={<ProtectedOutlet />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/cold-email" element={<ColdEmail />} />
          <Route path="/dashboard/physical-mail" element={<PhysicalMail />} />
          <Route path="/dashboard/social" element={<Social />} />
          <Route path="/dashboard/newsletter" element={<Newsletter />} />
          <Route path="/dashboard/prospecting" element={<Prospecting />} />
        </Route>
      </Route>
    </Routes>
  )
}
