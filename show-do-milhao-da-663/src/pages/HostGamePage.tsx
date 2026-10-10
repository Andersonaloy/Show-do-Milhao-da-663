import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';

function HostGamePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomCode } = useParams();

  const roomSettings = location.state as {
    hostName?: string;
    questionCount?: number;
    questionTime?: number;
  } | null;

  const hostName = roomSettings?.hostName ?? 'Anfitrião';
  const questionCount = roomSettings?.questionCount ?? 10;
  const questionTime = roomSettings?.questionTime ?? 20;

  const [gameStarted, setGameStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [notice, setNotice] = useState('');

  function handleNextQuestion() {
    if (currentQuestion >= questionCount) {
      setGameStarted(false);
      setNotice('Fim da demonstração! O ranking será implementado depois.');
      return;
    }

    setCurrentQuestion((current) => current + 1);
    setNotice('Pergunta avançada manualmente pelo anfitrião.');
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <BrandLogo />

        <button
          className="button button-danger"
          onClick={() => navigate('/')}
        >
          Encerrar demonstração
        </button>
      </header>

      {!gameStarted ? (
        <section className="panel lobby-center">
          <span className="eyebrow">Painel do anfitrião</span>

          <h1 style={{ marginBottom: 0 }}>
            {notice ? 'Demonstração encerrada' : 'Sala criada!'}
          </h1>

          <p className="muted">
            Bem-vindo, {hostName}. Compartilhe o código com os participantes.
          </p>

          <div>
            <p className="muted">Código da sala</p>
            <div className="room-code">{roomCode}</div>
          </div>

          <div className="player-list">
            <span className="player-chip">🎙️ {hostName} (anfitrião)</span>
          </div>

          <div className="panel" style={{ width: '100%', textAlign: 'left' }}>
            <h2>Configurações da partida</h2>

            <div className="score-row">
              <span>Quantidade de perguntas</span>
              <strong>{questionCount}</strong>
            </div>

            <div className="score-row">
              <span>Tempo por pergunta</span>
              <strong>{questionTime}s</strong>
            </div>

            <div className="score-row">
              <span>Jogadores conectados</span>
              <strong>0</strong>
            </div>
          </div>

          {notice && (
            <div className="feedback" role="status">
              {notice}
            </div>
          )}

          <p className="muted">
            Os participantes e o início da partida serão sincronizados
            quando conectarmos o multiplayer.
          </p>

          <button
            className="button button-primary"
            onClick={() => {
              setCurrentQuestion(1);
              setNotice('');
              setGameStarted(true);
            }}
          >
            ▶ Iniciar demonstração
          </button>
        </section>
      ) : (
        <div className="game-layout">
          <section className="game-main">
            <div className="game-topline">
              <span className="eyebrow">Você está transmitindo</span>
              <span className="timer">⏱ {questionTime} segundos</span>
            </div>

            <div className="panel">
              <span className="eyebrow">
                Pergunta {currentQuestion} de {questionCount}
              </span>

              <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.4rem)', marginTop: 18 }}>
                Qual é o maior planeta do Sistema Solar?
              </h1>

              <p className="muted">
                Esta é uma demonstração. A pergunta real será carregada
                a partir das configurações da sala.
              </p>
            </div>

            <div className="answers-grid">
              {['Terra', 'Marte', 'Júpiter', 'Saturno'].map((answer, index) => (
                <div className="answer-button" key={answer}>
                  <span className="gold">
                    {String.fromCharCode(65 + index)}.
                  </span>{' '}
                  {answer}
                </div>
              ))}
            </div>

            <div className="feedback">
              🔒 As respostas corretas não são exibidas no painel do anfitrião.
            </div>
          </section>

          <aside className="panel score-panel">
            <h2>Administração</h2>

            <p className="muted">
              Controles exclusivos do anfitrião.
            </p>

            <div className="score-row">
              <span>Jogadores</span>
              <strong>0</strong>
            </div>

            <div className="score-row">
              <span>Respondidas</span>
              <strong>0</strong>
            </div>

            <button
              className="button button-primary button-full"
              style={{ marginTop: 18 }}
              onClick={handleNextQuestion}
            >
              Avançar pergunta →
            </button>

            <button
              className="button button-danger button-full"
              style={{ marginTop: 10 }}
              onClick={() => {
                setGameStarted(false);
                setNotice('Partida encerrada pelo anfitrião.');
              }}
            >
              Encerrar partida
            </button>
          </aside>
        </div>
      )}
    </main>
  );
}

export default HostGamePage;
