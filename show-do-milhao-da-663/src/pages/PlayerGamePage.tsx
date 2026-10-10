import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import PlayerAvatar from '../components/PlayerAvatar';
import {
  defaultAvatar,
  type AvatarAppearance,
} from '../types/playerAvatar';

const sampleQuestion = {
  question: 'Qual é o maior planeta do Sistema Solar?',
  answers: ['Terra', 'Marte', 'Júpiter', 'Saturno'],
  correctAnswer: 2,
};

function PlayerGamePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomCode } = useParams();

  const navigationState = location.state as {
    playerName?: string;
    avatar?: AvatarAppearance;
    } | null;

  const playerName = navigationState?.playerName ?? 'Jogador';
  const avatar = navigationState?.avatar ?? defaultAvatar;

  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [feedback, setFeedback] = useState('');

  function handleAnswer(index: number) {
    if (answered) return;

    setSelectedAnswer(index);
    setAnswered(true);

    if (index === sampleQuestion.correctAnswer) {
      setScore((currentScore) => currentScore + 2);
      setFeedback('Resposta correta! Você ganhou 2 pontos.');
    } else {
      setScore((currentScore) => currentScore - 1);
      setFeedback('Resposta incorreta. Você perdeu 1 ponto.');
    }
  }

  function handleSkip() {
    if (answered) return;

    setAnswered(true);
    setFeedback('Você pulou a pergunta e não ganhou nem perdeu pontos.');
  }

  function handleHelp(helpName: string) {
    if (answered) return;

    setFeedback(
      `${helpName}: esta ajuda será implementada na próxima etapa.`,
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <BrandLogo />

        <button
          className="button button-secondary"
          onClick={() => navigate('/')}
        >
          Sair da partida
        </button>
      </header>

      <div className="game-topline" style={{ marginBottom: 24 }}>
        <span className="eyebrow">Sala {roomCode}</span>
        <span className="timer">⏱ 20 segundos</span>
      </div>

      <div className="game-layout">
        <section className="game-main">
          <div className="panel">
            <div className="eyebrow">Pergunta 1 de 10</div>

            <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.4rem)', marginTop: 18 }}>
              {sampleQuestion.question}
            </h1>

            <p className="muted">
              Escolha uma alternativa antes que o tempo termine.
            </p>
          </div>

          <div className="answers-grid">
            {sampleQuestion.answers.map((answer, index) => (
              <button
                key={answer}
                className={`answer-button ${
                  selectedAnswer === index ? 'selected' : ''
                } ${
                  answered && index === sampleQuestion.correctAnswer
                    ? 'correct'
                    : ''
                } ${
                  answered &&
                  selectedAnswer === index &&
                  index !== sampleQuestion.correctAnswer
                    ? 'wrong'
                    : ''
                }`}
                onClick={() => handleAnswer(index)}
                disabled={answered}
              >
                <span className="gold">
                  {String.fromCharCode(65 + index)}.
                </span>{' '}
                {answer}
              </button>
            ))}
          </div>

          {feedback && (
            <div className="feedback" role="status">
              {feedback}
            </div>
          )}

          <div className="panel stack">
            <h2>Suas ajudas</h2>

            <button
              className="button button-secondary"
              disabled={answered}
              onClick={() => handleHelp('Ajuda 1 — Resposta certa')}
            >
              💡 Revelar a resposta certa
            </button>

            <button
              className="button button-secondary"
              disabled={answered}
              onClick={() => handleHelp('Ajuda 2 — Os quatro personagens')}
            >
              🗣️ Consultar os quatro personagens
            </button>

            <button
              className="button button-secondary"
              disabled={answered}
              onClick={() => handleHelp('Ajuda 3 — Cara ou coroa')}
            >
              🪙 Cara ou coroa
            </button>

            <button
              className="button button-danger"
              disabled={answered}
              onClick={handleSkip}
            >
              Pular pergunta
            </button>
          </div>
        </section>

        <aside className="panel score-panel">
          <h2>Seu perfil</h2>

          <div className="game-player-profile">
          <PlayerAvatar appearance={avatar} size={112} />

          <strong>{playerName}</strong>
          </div>

          <div className="score-row">
            <span>Pontuação</span>
            <strong className="gold">{score}</strong>
          </div>

          <div className="score-row">
            <span>Pergunta</span>
            <strong>1 / 10</strong>
          </div>

          <p className="muted" style={{ marginTop: 18, fontSize: '0.85rem' }}>
            O placar desta versão é local e serve apenas para testar a interface.
          </p>
        </aside>
      </div>
    </main>
  );
}

export default PlayerGamePage;
