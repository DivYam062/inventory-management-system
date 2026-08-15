import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<div>Inventory Management System</div>} />
      </Routes>
    </Router>
  )
}

export default AppRoutes