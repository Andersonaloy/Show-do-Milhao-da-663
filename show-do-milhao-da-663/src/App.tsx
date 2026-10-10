import { Navigate, Route, Routes } from 'react-router-dom';

import HomePage from './pages/HomePage';
import CreateRoomPage from './pages/CreateRoomPage';
import JoinRoomPage from './pages/JoinRoomPage';
import PlayerGamePage from './pages/PlayerGamePage';
import HostGamePage from './pages/HostGamePage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      <Route path="/criar-sala" element={<CreateRoomPage />} />

      <Route path="/entrar-sala" element={<JoinRoomPage />} />

      <Route path="/jogar/:roomCode" element={<PlayerGamePage />} />

      <Route path="/anfitriao/:roomCode" element={<HostGamePage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
