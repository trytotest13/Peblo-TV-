import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import ShowDetail from './pages/ShowDetail'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/show/:slug" element={<ShowDetail />} />
    </Routes>
  )
}
