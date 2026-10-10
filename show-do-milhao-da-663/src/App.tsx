import { useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import HomePage from './pages/HomePage';
import CreateRoomPage from './pages/CreateRoomPage';
import JoinRoomPage from './pages/JoinRoomPage';
import PlayerGamePage from './pages/PlayerGamePage';
import HostGamePage from './pages/HostGamePage';

import { ensureAnonymousSession } from './lib/anonymousAuth';

function App() {
  const authStarted = useRef(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    // Evita iniciar a autenticação duas vezes durante testes do React.
    if (authStarted.current) {
      return;
    }

    authStarted.current = true;

    async function initializeAuth() {
      try {
        const user = await ensureAnonymousSession();

        console.log('Autenticação Supabase funcionando!', user.id);
        setAuthError('');
      } catch (error) {
        console.error('Erro na autenticação do Supabase:', error);

        setAuthError(
          error instanceof Error
            ? error.message
            : 'Não foi possível conectar ao Supabase.',
        );
      }
    }

    void initializeAuth();
  }, []);

  return (
    <>
      {authError && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            margin: '12px',
            border: '1px solid #dc2626',
            borderRadius: '8px',
            backgroundColor: '#fef2f2',
            color: '#991b1b',
          }}
        >
          <strong>Erro de autenticação:</strong> {authError}
          <p style={{ marginBottom: 0 }}>
            Verifique a configuração do Supabase e tente recarregar a página.
          </p>
        </div>
      )}

      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route path="/criar-sala" element={<CreateRoomPage />} />

        <Route path="/entrar-sala" element={<JoinRoomPage />} />

        <Route path="/jogar/:roomCode" element={<PlayerGamePage />} />

        <Route path="/anfitriao/:roomCode" element={<HostGamePage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;