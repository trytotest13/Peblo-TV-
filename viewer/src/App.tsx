import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import ShowDetail from './pages/ShowDetail'
import MyList from './pages/MyList'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import About from './pages/About'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import Cookies from './pages/Cookies'
import Accessibility from './pages/Accessibility'
import Help from './pages/Help'
import Report from './pages/Report'
import Footer from './components/Footer'
import { ErrorBoundary, NotFoundPage } from './components/StateComponents'

export default function App() {
  return (
    <ErrorBoundary>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/show/:slug" element={<ShowDetail />} />
            <Route path="/my-list" element={<MyList />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/about" element={<About />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/cookies" element={<Cookies />} />
            <Route path="/accessibility" element={<Accessibility />} />
            <Route path="/help" element={<Help />} />
            <Route path="/report" element={<Report />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </ErrorBoundary>
  )
}
