import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Leaderboard from './pages/Leaderboard';
import Queue from './pages/Queue';
import ReportPage from './pages/ReportPage';
import RoadPage from './pages/RoadPage';
import HazardPage from './pages/HazardPage';
import Municipal from './pages/Municipal';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/queue" element={<Queue />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/roads/:id" element={<RoadPage />} />
        <Route path="/hazards/:id" element={<HazardPage />} />
        <Route path="/municipal" element={<Municipal />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
