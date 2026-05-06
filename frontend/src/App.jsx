import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import PageWrapper from './components/PageWrapper';
import Home from './pages/Home';
import Apply from './pages/Apply';
import Result from './pages/Result';
import Dashboard from './pages/Dashboard';

export default function App() {
  return (
    <>
      <Navbar />
      <PageWrapper>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/apply" element={<Apply />} />
          <Route path="/result/:id" element={<Result />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </PageWrapper>
    </>
  );
}
