
import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import PlayerAvatar from '../components/PlayerAvatar';
import {
  defaultAvatar,
  type AvatarAppearance,
} from '../types/playerAvatar';
import type { QuizDefinition } from '../types/quiz';

const QUIZZES_KEY = 'show663-saved-quizzes';

const fallbackQuiz: QuizDefinition = {
  id: 'quiz-demo',
  title: 'Quiz de demonstração',
  hostName: 'Anfitrião',
  questionTime: 20,
  updatedAt: '',
  questions: [
    {
      id: 'pergunta-demo',
      text: 'Qual é o maior planeta do Sistema Solar?',
      options: ['Terra', 'Marte', 'Júpiter', 'Saturno'],
      correctAnswer: 2,
    },
  ],
};

function loadQuiz(quizId?: string): QuizDefinition {
  try {
    const saved = localStorage.getItem(QUIZZES_KEY);

    if (saved) {
      const quizzes = JSON.parse(saved) as QuizDefinition[];

      if (Array.isArray(quizzes) && quizzes.length > 0) {
        if (quizId) {
          const matchingQuiz = quizzes.find(
            (item) => item.id === quizId,
          );

          if (matchingQuiz) return matchingQuiz;
        }

        // Demonstração local: usa o quiz salvo mais recentemente.
        return quizzes[quizzes.length - 1];
      }
    }
  } catch {
    // Se não for possível ler o armazenamento, usa o quiz de demonstração.
  }

  return fallbackQuiz;
}

function PlayerGamePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomCode } = useParams();

  const navigationState = location.state as {
    playerName?: string;
    avatar?: AvatarAppearance;
    quizId?: string;
  } | null;

  const playerName = navigationState?.playerName ?? 'Jogador';
  const avatar = navigationState?.avatar ?? defaultAvatar;

  const [quiz] = useState(() => loadQuiz(navigationState?.quizId));
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [finished, setFinished] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [usedHelp, setUsedHelp] = useState<string[]>([]);
  const [eliminatedAnswers, setEliminatedAnswers] = useState<number[]>([]);
  const [revealedAnswer, setRevealedAnswer] = useState(false);
  const [usedHelpThisQuestion, setUsedHelpThisQuestion] = useState(false);

  const questions = quiz.questions;
  const activeQuestion = questions[currentQuestion];
  const questionCount = questions.length;

  function handleAnswer(index: number) {
    if (answered || eliminatedAnswers.includes(index)) return;

    setSelectedAnswer(index);
    setAnswered(true);

    if (index === activeQuestion.correctAnswer) {
      const points = usedHelpThisQuestion ? 1 : 2;

      setScore((currentScore) => currentScore + points);
      setFeedback(
        `Resposta correta! Você ganhou ${points} ${
          points === 1 ? 'ponto' : 'pontos'
        }.`,
      );
    } else {
      setScore((currentScore) => currentScore - 1);
      setFeedback('Resposta incorreta. Você perdeu 1 ponto.');
    }
  }

  function handleSkip() {
    if (answered) return;

    setAnswered(true);
    setSelectedAnswer(null);
    setFeedback('Você pulou a pergunta. Não ganhou nem perdeu pontos.');
  }

  function useHelp(helpId: string, helpName: string) {
    if (answered || usedHelp.includes(helpId)) return;

    setUsedHelp((current) => [...current, helpId]);
    setUsedHelpThisQuestion(true);

    if (helpId === 'reveal') {
      setRevealedAnswer(true);
      setFeedback(
        `Ajuda utilizada: a resposta correta é ${
          activeQuestion.options[activeQuestion.correctAnswer]
        }. Se acertar, você ganhará 1 ponto.`,
      );
      return;
    }

    if (helpId === 'characters') {
      // Simula a opinião dos quatro personagens.
      const correctIndex = activeQuestion.correctAnswer;
      const votes = activeQuestion.options.map(() =>
        Math.floor(Math.random() * 20) + 1,
      );

      votes[correctIndex] += 25;

      const highestVote = votes.indexOf(Math.max(...votes));

      setFeedback(
        `${helpName}: os personagens votaram mais em "${
          activeQuestion.options[highestVote]
        }". É apenas uma sugestão!`,
      );
      return;
    }

    if (helpId === 'coin') {
      const wrongOptions = activeQuestion.options
        .map((_, index) => index)
        .filter((index) => index !== activeQuestion.correctAnswer);

      // Remove duas alternativas incorretas.
      const shuffled = [...wrongOptions].sort(() => Math.random() - 0.5);
      const eliminated = shuffled.slice(0, 2);

      setEliminatedAnswers(eliminated);
      setFeedback(
        'Cara ou coroa: duas alternativas incorretas foram eliminadas!',
      );
    }
  }

  function handleNextQuestion() {
    if (!answered) return;

    if (currentQuestion + 1 >= questionCount) {
      setFinished(true);
      return;
    }

    setCurrentQuestion((current) => current + 1);
    setSelectedAnswer(null);
    setAnswered(false);
    setFeedback('');
    setUsedHelp([]);
    setEliminatedAnswers([]);
    setRevealedAnswer(false);
    setUsedHelpThisQuestion(false);
  }

  function handlePlayAgain() {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setScore(0);
    setAnswered(false);
    setFinished(false);
    setFeedback('');
    setUsedHelp([]);
    setEliminatedAnswers([]);
    setRevealedAnswer(false);
    setUsedHelpThisQuestion(false);
  }

  if (finished) {
    return (
      <main className="app-shell">
        <header className="topbar">
          <BrandLogo />
          <button
            className="button button-secondary"
            onClick={() => navigate('/')}
          >
            Sair
          </button>
        </header>

        <section className="panel lobby-center">
          <span className="eyebrow">Fim de jogo</span>
          <h1>Quiz concluído!</h1>

          <PlayerAvatar appearance={avatar} size={112} />

          <h2>{playerName}</h2>

          <p className="muted">
            Você respondeu às {questionCount} perguntas.
          </p>

          <div className="score-row">
            <span>Pontuação final</span>
            <strong className="gold">{score} pontos</strong>
          </div>

          <button
            className="button button-primary"
            onClick={handlePlayAgain}
          >
            Jogar novamente
          </button>

          <button
            className="button button-secondary"
            onClick={() => navigate('/')}
          >
            Voltar ao início
          </button>
        </section>
      </main>
    );
  }

  if (!activeQuestion) {
    return (
      <main className="app-shell">
        <section className="panel lobby-center">
          <h1>Nenhuma pergunta encontrada</h1>
          <p className="muted">
            Volte ao editor e salve um quiz com pelo menos uma pergunta.
          </p>
          <button
            className="button button-primary"
            onClick={() => navigate('/')}
          >
            Voltar ao início
          </button>
        </section>
      </main>
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
        <span className="timer">
          ⏱ {quiz.questionTime} segundos por pergunta
        </span>
      </div>

      <div className="game-layout">
        <section className="game-main">
          <div className="panel">
            <div className="eyebrow">
              Pergunta {currentQuestion + 1} de {questionCount}
            </div>

            <h1
              style={{
                fontSize: 'clamp(1.5rem, 4vw, 2.4rem)',
                marginTop: 18,
              }}
            >
              {activeQuestion.text}
            </h1>

            <p className="muted">
              Escolha uma alternativa antes que o tempo termine.
            </p>
          </div>

          <div className="answers-grid">
            {activeQuestion.options.map((answer, index) => (
              <button
                key={`${index}-${answer}`}
                className={`answer-button ${
                  selectedAnswer === index ? 'selected' : ''
                } ${
                  answered && index === activeQuestion.correctAnswer
                    ? 'correct'
                    : ''
                } ${
                  answered &&
                  selectedAnswer === index &&
                  index !== activeQuestion.correctAnswer
                    ? 'wrong'
                    : ''
                } ${
                  revealedAnswer && index === activeQuestion.correctAnswer
                    ? 'correct'
                    : ''
                }`}
                onClick={() => handleAnswer(index)}
                disabled={answered || eliminatedAnswers.includes(index)}
                style={
                  eliminatedAnswers.includes(index)
                    ? { opacity: 0.35, textDecoration: 'line-through' }
                    : undefined
                }
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

          {answered && (
            <button
              className="button button-primary button-full"
              onClick={handleNextQuestion}
            >
              {currentQuestion + 1 >= questionCount
                ? 'Ver resultado final →'
                : 'Próxima pergunta →'}
            </button>
          )}

          <div className="panel stack">
            <h2>Suas ajudas</h2>

            <button
              className="button button-secondary"
              disabled={answered || usedHelp.includes('reveal')}
              onClick={() => useHelp('reveal', 'Revelar resposta')}
            >
              💡 Revelar a resposta certa
              {usedHelp.includes('reveal') ? ' — Usada' : ''}
            </button>

            <button
              className="button button-secondary"
              disabled={answered || usedHelp.includes('characters')}
              onClick={() =>
                useHelp('characters', 'Voto dos quatro personagens')
              }
            >
              🗣️ Consultar os quatro personagens
              {usedHelp.includes('characters') ? ' — Usada' : ''}
            </button>

            <button
              className="button button-secondary"
              disabled={answered || usedHelp.includes('coin')}
              onClick={() => useHelp('coin', 'Cara ou coroa')}
            >
              🪙 Cara ou coroa
              {usedHelp.includes('coin') ? ' — Usada' : ''}
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
            <strong>
              {currentQuestion + 1} / {questionCount}
            </strong>
          </div>

          <div className="score-row">
            <span>Quiz</span>
            <strong>{quiz.title}</strong>
          </div>

          <p
            className="muted"
            style={{ marginTop: 18, fontSize: '0.85rem' }}
          >
            Demonstração local: suas respostas e sua pontuação ainda não são
            sincronizadas com outros jogadores.
          </p>
        </aside>
      </div>
    </main>
  );
}

export default PlayerGamePage;
