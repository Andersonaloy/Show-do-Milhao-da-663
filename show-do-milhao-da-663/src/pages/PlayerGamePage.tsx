import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import PlayerAvatar from '../components/PlayerAvatar';
import { defaultAvatar, type AvatarAppearance, } from '../types/playerAvatar';
import type { QuizDefinition } from '../types/quiz';
import { supabase } from '../lib/supabaseClient';
import { loadPlayerRoom, submitPlayerAnswer, type PlayerRoomData, } from '../lib/roomRepository';

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

  const [roomData, setRoomData] = useState<PlayerRoomData | null>(null);
  const [roomLoading, setRoomLoading] = useState(true);
  const [roomError, setRoomError] = useState('');
  const [answerSubmitting, setAnswerSubmitting] = useState(false);
  const [submittedQuestionId, setSubmittedQuestionId] = useState<string | null>(null);
  const [multiplayerSelectedOption, setMultiplayerSelectedOption] = useState<number | null>(null);
  const [multiplayerFeedback, setMultiplayerFeedback] = useState('');
  const [multiplayerScore, setMultiplayerScore] = useState<number | null>(null);

  async function handleMultiplayerAnswer(
        questionId: string,
        selectedOption: number | null,
        ) {
        if (!roomCode || !roomData || answerSubmitting) return;

        if (submittedQuestionId === questionId) return;

        setAnswerSubmitting(true);
        setMultiplayerFeedback('');

        try {
            const result = await submitPlayerAnswer(
            roomCode,
            questionId,
            selectedOption,
            false,
            );

            setSubmittedQuestionId(questionId);
            setMultiplayerSelectedOption(selectedOption);
            setMultiplayerScore(result.total_score);

            if (selectedOption === null) {
            setMultiplayerFeedback(
                'Você pulou a pergunta. Não ganhou nem perdeu pontos.',
            );
            } else if (result.is_correct) {
            setMultiplayerFeedback(
                `Resposta correta! Você ganhou ${result.points_awarded} ${
                result.points_awarded === 1 ? 'ponto' : 'pontos'
                }.`,
            );
            } else {
            setMultiplayerFeedback(
                `Resposta incorreta. Você perdeu ${Math.abs(
                result.points_awarded,
                )} ponto.`,
            );
            }
        } catch (error: unknown) {
            setMultiplayerFeedback(
            error instanceof Error
                ? error.message
                : 'Não foi possível registrar sua resposta.',
            );
        } finally {
            setAnswerSubmitting(false);
        }
    }
  
  useEffect(() => {
    if (!roomCode) {
      setRoomError('Código da sala não encontrado.');
      setRoomLoading(false);
      return;
    }

    let isActive = true;
    let roomChannel: ReturnType<typeof supabase.channel> | null = null;
    let refreshInterval: ReturnType<typeof setInterval> | null = null;
    let isRefreshing = false;

    async function refreshRoom(showLoading = false) {
      if (isRefreshing || !isActive) return;

      isRefreshing = true;

      if (showLoading) {
        setRoomLoading(true);
      }

      try {
        const room = await loadPlayerRoom(roomCode!);

        if (!isActive) return;

        setRoomData(room);
        setRoomError('');
      } catch (error: unknown) {
        if (!isActive) return;

        setRoomError(
          error instanceof Error
            ? error.message
            : 'Não foi possível atualizar a partida.',
        );
      } finally {
        isRefreshing = false;

        if (isActive) {
          setRoomLoading(false);
        }
      }
    }

    async function connectToRoom() {
      try {
        const room = await loadPlayerRoom(roomCode!);

        if (!isActive) return;

        setRoomData(room);
        setRoomError('');
        setRoomLoading(false);

        roomChannel = supabase
          .channel(`player-room-${room.roomId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'game_rooms',
              filter: `id=eq.${room.roomId}`,
            },
            () => {
              void refreshRoom();
            },
          )
          .subscribe((status) => {
            if (!isActive) return;

            if (status === 'SUBSCRIBED') {
              // Confere o estado atual assim que a conexão é estabelecida.
              void refreshRoom();
            }

            if (
              status === 'CHANNEL_ERROR' ||
              status === 'TIMED_OUT' ||
              status === 'CLOSED'
            ) {
              console.warn(
                'A conexão em tempo real da partida foi interrompida:',
                status,
              );
            }
          });

        // Plano alternativo: confere a sala a cada 3 segundos.
        // Assim, a partida também pode avançar se o Realtime não notificar.
        refreshInterval = setInterval(() => {
          void refreshRoom();
        }, 3000);
      } catch (error: unknown) {
        if (!isActive) return;

        setRoomError(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar a sala.',
        );
        setRoomLoading(false);
      }
    }

    void connectToRoom();

    return () => {
      isActive = false;

      if (refreshInterval !== null) {
        clearInterval(refreshInterval);
      }

      if (roomChannel) {
        void supabase.removeChannel(roomChannel);
      }
    };
  }, [roomCode]);


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

  if (roomLoading) {
    return (
        <main className="app-shell">
        <header className="topbar">
            <BrandLogo />
        </header>

        <section className="panel lobby-center">
            <h1>Conectando à partida...</h1>
            <p className="muted">
            Estamos buscando a sala e as perguntas.
            </p>
        </section>
        </main>
    );
    }

    if (!roomData) {
    return (
        <main className="app-shell">
        <header className="topbar">
            <BrandLogo />
        </header>

        <section className="panel lobby-center">
            <h1>Não foi possível carregar a sala</h1>
            <p className="feedback error" role="alert">
            {roomError || 'Verifique o código e tente novamente.'}
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

    if (roomData.status === 'waiting') {
    return (
        <main className="app-shell">
        <header className="topbar">
            <BrandLogo />
            <button
            className="button button-secondary"
            onClick={() => navigate('/')}
            >
            Sair da sala
            </button>
        </header>

        <section className="panel lobby-center">
            <span className="eyebrow">Sala {roomData.roomCode}</span>

            <h1>Aguardando o anfitrião...</h1>

            <PlayerAvatar appearance={avatar} size={112} />

            <h2>{playerName}</h2>

            <p className="muted">
            Você entrou em <strong>{roomData.quiz.title}</strong>.
            A partida começará assim que o anfitrião iniciar o quiz.
            </p>

            <div className="feedback">
            <span className="gold">●</span> Conectado à sala
            </div>

            {roomError && (
            <p className="muted" role="status">
                Aviso: {roomError}
            </p>
            )}
        </section>
        </main>
    );
    }

    if (roomData.status === 'finished') {
    return (
        <main className="app-shell">
        <header className="topbar">
            <BrandLogo />
        </header>

        <section className="panel lobby-center">
            <span className="eyebrow">Fim de jogo</span>
            <h1>Quiz concluído!</h1>

            <PlayerAvatar appearance={avatar} size={112} />

            <h2>{playerName}</h2>

            <p className="muted">
            O anfitrião encerrou a partida.
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

    const synchronizedQuestion =
    roomData.quiz.questions[roomData.currentQuestion];

    if (roomData.status === 'playing') {
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
            <span className="eyebrow">Sala {roomData.roomCode}</span>

            <span className="timer">
            ⏱ {roomData.quiz.questionTime} segundos por pergunta
            </span>
        </div>

        {!synchronizedQuestion ? (
            <section className="panel lobby-center">
            <h1>Pergunta não encontrada</h1>
            <p className="muted">
                Confira se o quiz possui perguntas salvas na nuvem.
            </p>
            </section>
        ) : (
            <div className="game-layout">
            <section className="game-main">
                <div className="panel">
                <span className="eyebrow">
                    Pergunta {roomData.currentQuestion + 1} de{' '}
                    {roomData.quiz.questions.length}
                </span>

                <h1
                    style={{
                    fontSize: 'clamp(1.5rem, 4vw, 2.4rem)',
                    marginTop: 18,
                    }}
                >
                    {synchronizedQuestion.text}
                </h1>

                <p className="muted">
                    Escolha uma alternativa. Sua resposta será registrada na nuvem.
                </p>
                </div>

                <div className="answers-grid">
                    {synchronizedQuestion.options.map((answer, index) => {
                        const hasAnswered =
                        submittedQuestionId === synchronizedQuestion.id;

                        const isSelected = multiplayerSelectedOption === index;

                        return (
                        <button
                            key={`${index}-${answer}`}
                            className={`answer-button ${isSelected ? 'selected' : ''}`}
                            onClick={() =>
                            void handleMultiplayerAnswer(
                                synchronizedQuestion.id,
                                index,
                            )
                            }
                            disabled={answerSubmitting || hasAnswered}
                        >
                            <span className="gold">
                            {String.fromCharCode(65 + index)}.
                            </span>{' '}
                            {answer}
                        </button>
                        );
                    })}
                </div>

                {answerSubmitting && (
                    <div className="feedback" role="status">
                        Registrando sua resposta...
                    </div>
                    )}

                    {multiplayerFeedback && (
                    <div className="feedback" role="status">
                        {multiplayerFeedback}
                    </div>
                    )}

                    {!answerSubmitting &&
                    !multiplayerFeedback &&
                    submittedQuestionId !== synchronizedQuestion.id && (
                        <button
                        className="button button-danger"
                        onClick={() =>
                            void handleMultiplayerAnswer(
                            synchronizedQuestion.id,
                            null,
                            )
                        }
                        disabled={answerSubmitting}
                        >
                        Pular pergunta
                        </button>
                )}
            </section>

            <aside className="panel score-panel">
                <h2>Seu perfil</h2>

                <div className="game-player-profile">
                <PlayerAvatar appearance={avatar} size={112} />
                <strong>{playerName}</strong>
                </div>

                <div className="score-row">
                    <span>Pontuação</span>
                    <strong className="gold">
                        {multiplayerScore ?? '—'}
                    </strong>
                </div>

                <div className="score-row">
                <span>Quiz</span>
                <strong>{roomData.quiz.title}</strong>
                </div>

                <div className="score-row">
                <span>Status</span>
                <strong>Em andamento</strong>
                </div>
            </aside>
            </div>
        )}
        </main>
    );
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
