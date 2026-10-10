
import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import type { QuizDefinition } from '../types/quiz';

const QUIZZES_KEY = 'show663-saved-quizzes';

function loadSavedQuiz(quizId?: string): QuizDefinition | null {
  try {
    const saved = localStorage.getItem(QUIZZES_KEY);

    if (!saved) {
      return null;
    }

    const quizzes = JSON.parse(saved) as QuizDefinition[];

    if (!Array.isArray(quizzes)) {
      return null;
    }

    if (quizId) {
      return quizzes.find((quiz) => quiz.id === quizId) ?? null;
    }

    return null;
  } catch {
    return null;
  }
}

function HostGamePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomCode } = useParams();

  const roomSettings = location.state as {
    hostName?: string;
    questionCount?: number;
    questionTime?: number;
    quizId?: string;
    quizTitle?: string;
  } | null;

  const quiz = loadSavedQuiz(roomSettings?.quizId);

  const hostName = roomSettings?.hostName ?? quiz?.hostName ?? 'Anfitrião';
  const questionCount = quiz?.questions.length ?? 0;
  const questionTime = quiz?.questionTime ?? roomSettings?.questionTime ?? 20;

  const [gameStarted, setGameStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [notice, setNotice] = useState('');

  const activeQuestion = quiz?.questions[currentQuestion];

  function handleStartGame() {
    if (!quiz || quiz.questions.length === 0) {
      setNotice(
        'Não foi possível carregar as perguntas. Volte ao editor e salve o quiz novamente.',
      );
      return;
    }

    setCurrentQuestion(0);
    setNotice('');
    setGameStarted(true);
  }

  function handleNextQuestion() {
    if (!quiz) {
      return;
    }

    if (currentQuestion + 1 >= quiz.questions.length) {
      setGameStarted(false);
      setNotice('Quiz concluído! O ranking será implementado em uma próxima etapa.');
      return;
    }

    setCurrentQuestion((current) => current + 1);
    setNotice('');
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <BrandLogo />

        <button
          className="button button-danger"
          onClick={() => navigate('/')}
        >
          Sair
        </button>
      </header>

      {!gameStarted ? (
        <section className="panel lobby-center">
          <span className="eyebrow">Painel do anfitrião</span>

          <h1 style={{ marginBottom: 0 }}>
            {notice.startsWith('Quiz concluído')
              ? 'Quiz finalizado!'
              : 'Sala criada!'}
          </h1>

          <p className="muted">
            Bem-vindo, {hostName}.
          </p>

          <div>
            <p className="muted">Código da sala</p>
            <div className="room-code">{roomCode}</div>
          </div>

          <div className="panel" style={{ width: '100%', textAlign: 'left' }}>
            <h2>{quiz?.title ?? roomSettings?.quizTitle ?? 'Seu quiz'}</h2>

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

          {!quiz && (
            <p className="muted">
              O quiz salvo não foi encontrado. Tente voltar ao editor e salvar
              novamente antes de criar a sala.
            </p>
          )}

          <button
            className="button button-primary"
            onClick={handleStartGame}
            disabled={!quiz || questionCount === 0}
          >
            ▶ Iniciar quiz
          </button>

          <p className="muted">
            Esta etapa funciona como demonstração local. Os jogadores ainda
            não estão conectados em tempo real.
          </p>
        </section>
      ) : (
        <div className="game-layout">
          <section className="game-main">
            <div className="game-topline">
              <span className="eyebrow">Quiz em andamento</span>
              <span className="timer">
                ⏱ {questionTime} segundos por pergunta
              </span>
            </div>

            <div className="panel">
              <span className="eyebrow">
                Pergunta {currentQuestion + 1} de {questionCount}
              </span>

              <h1
                style={{
                  fontSize: 'clamp(1.5rem, 4vw, 2.4rem)',
                  marginTop: 18,
                }}
              >
                {activeQuestion?.text}
              </h1>
            </div>

            <div className="answers-grid">
              {activeQuestion?.options.map((answer, index) => (
                <div className="answer-button" key={`${index}-${answer}`}>
                  <span className="gold">
                    {String.fromCharCode(65 + index)}.
                  </span>{' '}
                  {answer}
                </div>
              ))}
            </div>

            <div className="feedback">
              🔒 As alternativas corretas não são reveladas nesta tela.
            </div>
          </section>

          <aside className="panel score-panel">
            <h2>Administração</h2>
            <p className="muted">
              Controles exclusivos do anfitrião.
            </p>

            <div className="score-row">
              <span>Pergunta atual</span>
              <strong>{currentQuestion + 1}/{questionCount}</strong>
            </div>

            <div className="score-row">
              <span>Jogadores</span>
              <strong>0</strong>
            </div>

            <button
              className="button button-primary button-full"
              style={{ marginTop: 18 }}
              onClick={handleNextQuestion}
            >
              {currentQuestion + 1 >= questionCount
                ? 'Finalizar quiz'
                : 'Próxima pergunta →'}
            </button>

            <button
              className="button button-danger button-full"
              style={{ marginTop: 10 }}
              onClick={() => {
                setGameStarted(false);
                setNotice('Quiz encerrado pelo anfitrião.');
              }}
            >
              Encerrar quiz
            </button>
          </aside>
        </div>
      )}
    </main>
  );
}

export default HostGamePage;
