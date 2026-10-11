import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import PlayerAvatar from '../components/PlayerAvatar';
import { defaultAvatar, type AvatarAppearance, } from '../types/playerAvatar';
import type { QuizDefinition } from '../types/quiz';
import { supabase } from '../lib/supabaseClient';

type RoomPlayer = {
  id: string;
  player_name: string;
  score: number;
  avatar: AvatarAppearance;
};

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
  const { roomCode } = useParams<{ roomCode: string }>();

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
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [gameFinished, setGameFinished] = useState(false);
  const [questionStartedAt, setQuestionStartedAt] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(questionTime);

  const advancingRef = useRef(false);

  useEffect(() => {
        if (!roomCode) {
            return;
        }

        const code = roomCode.toUpperCase();

        let isActive = true;

        let roomChannel:
            | ReturnType<typeof supabase.channel>
            | null = null;

        async function connectToRoom() {
            try {
            // Busca a sala pelo código exibido na tela.
            const { data: room, error: roomError } = await supabase
                .from('game_rooms')
                .select('id')
                .eq('room_code', code)
                .maybeSingle();

                if (roomError) {
                    throw roomError;
                }

                if (!room) {
                    throw new Error('Sala não encontrada. Verifique o código da sala.');
                }

                const roomId = room.id;

            // Busca os jogadores registrados nessa sala.
            async function loadPlayers() {
              const { data, error } = await supabase
                .from('room_players')
                .select('id, player_name, score, avatar')
                .eq('room_id', roomId)
                .order('joined_at', { ascending: true });

              if (error) {
                throw error;
              }

              if (isActive) {
                const formattedPlayers: RoomPlayer[] = (data ?? []).map((player) => ({
                  id: player.id,
                  player_name: player.player_name,
                  score: player.score,
                  avatar:
                    (player.avatar as unknown as AvatarAppearance | null) ??
                    defaultAvatar,
                }));

                setPlayers(formattedPlayers);
              }
            }

            // Carrega a lista assim que o anfitrião abre a tela.
            await loadPlayers();

            if (!isActive) {
                return;
            }

            // Escuta alterações na lista de jogadores.
            roomChannel = supabase
                .channel(`host-room-${roomId}`)
                .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'room_players',
                    filter: `room_id=eq.${roomId}`,
                },
                () => {
                    void loadPlayers().catch((error: unknown) => {
                    console.error(
                        'Erro ao atualizar os jogadores:',
                        error,
                    );
                    });
                },
                )
                .subscribe((status) => {
                if (status === 'CHANNEL_ERROR') {
                    console.error(
                    'Não foi possível conectar às atualizações em tempo real.',
                    );
                }
                });
            } catch (error: unknown) {
            console.error(
                'Erro ao carregar a sala e seus jogadores:',
                error,
            );

            if (isActive) {
                setNotice(
                error instanceof Error
                    ? error.message
                    : 'Não foi possível carregar os jogadores da sala.',
                );
            }
            }
        }

        void connectToRoom();

        return () => {
            isActive = false;

            if (roomChannel) {
            void supabase.removeChannel(roomChannel);
            }
        };
    }, [roomCode]);

    useEffect(() => {
      if (!roomCode || !gameStarted) {
        return;
      }

      let isActive = true;
      let intervalId: ReturnType<typeof setInterval> | null = null;

      async function loadAnswerCount() {
        try {
          // 1. Buscar a sala e o quiz.
          const { data: room, error: roomError } = await supabase
            .from('game_rooms')
            .select('id, quiz_id')
            .eq('room_code', roomCode!.toUpperCase())
            .maybeSingle();

          if (roomError) throw roomError;
          if (!room) throw new Error('Sala não encontrada.');

          // 2. Buscar a pergunta atual.
          const { data: questions, error: questionsError } = await supabase
            .from('quiz_questions')
            .select('id')
            .eq('quiz_id', room.quiz_id)
            .order('position', { ascending: true })
            .range(currentQuestion, currentQuestion);

          if (questionsError) throw questionsError;

          const question = questions?.[0];

          if (!question) {
            if (isActive) setAnsweredCount(0);
            return;
          }

          // 3. Buscar somente os jogadores desta sala.
          const { data: roomPlayers, error: playersError } = await supabase
            .from('room_players')
            .select('id')
            .eq('room_id', room.id);

          if (playersError) throw playersError;

          const playerIds = (roomPlayers ?? []).map((player) => player.id);

          if (!isActive) return;

          // Não avançar automaticamente se não houver jogadores.
          if (playerIds.length === 0) {
            setAnsweredCount(0);
            return;
          }

          // 4. Buscar as respostas desses jogadores para esta pergunta.
          const { data: answers, error: answersError } = await supabase
            .from('player_answers')
            .select('player_id')
            .eq('question_id', question.id)
            .in('player_id', playerIds);

          if (answersError) throw answersError;
          if (!isActive) return;

          // Contar jogadores únicos que responderam.
          const answeredPlayerIds = new Set(
            (answers ?? []).map((answer) => answer.player_id),
          );

          const count = answeredPlayerIds.size;

          setAnsweredCount(count);

          // 5. Se todos responderam, avançar sem esperar o tempo acabar.
          if (count >= playerIds.length) {
            void handleNextQuestion();
          }
        } catch (error: unknown) {
          console.error('Erro ao consultar respostas:', error);
        }
      }

      void loadAnswerCount();

      intervalId = setInterval(() => {
        void loadAnswerCount();
      }, 2000);

      return () => {
        isActive = false;

        if (intervalId !== null) {
          clearInterval(intervalId);
        }
      };
    }, [roomCode, currentQuestion, gameStarted, players]);

    useEffect(() => {
      if (!gameStarted || !questionStartedAt) {
        return;
      }

      const updateTimer = () => {
        const startedAt = new Date(questionStartedAt).getTime();
        const elapsedSeconds = Math.floor(
          (Date.now() - startedAt) / 1000,
        );

        const remaining = Math.max(
          0,
          questionTime - elapsedSeconds,
        );

        setRemainingSeconds(remaining);

        if (remaining <= 0) {
          void handleNextQuestion();
        }
      };

      updateTimer();

      const intervalId = window.setInterval(updateTimer, 250);

      return () => {
        window.clearInterval(intervalId);
      };
    }, [
      gameStarted,
      questionStartedAt,
      questionTime,
      currentQuestion,
    ]);


  const activeQuestion = quiz?.questions[currentQuestion];

  async function updateRoom(
    updates: {
      status?: 'waiting' | 'playing' | 'finished';
      current_question?: number;
      question_started_at?: string | null;
    },
  ) {
    if (!roomCode) {
      throw new Error('Código da sala não encontrado.');
    }

    const { error } = await supabase
      .from('game_rooms')
      .update(updates)
      .eq('room_code', roomCode.toUpperCase());

    if (error) {
      throw error;
    }
  }

  async function handleReturnToHome() {
    if (!roomCode) {
      setNotice('Não foi possível identificar a sala.');
      return;
    }

    try {
      setNotice('');

      const { data, error } = await supabase
        .from('game_rooms')
        .delete()
        .eq('room_code', roomCode.toUpperCase())
        .select('id');

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error(
          'A sala não foi excluída. Verifique as permissões do Supabase.',
        );
      }

      // Só volta ao início depois de confirmar a exclusão.
      navigate('/');
    } catch (error: unknown) {
      console.error('Erro ao excluir a sala:', error);

      setNotice(
        error instanceof Error
          ? `Não foi possível excluir a sala: ${error.message}`
          : 'Não foi possível excluir a sala. Tente novamente.',
      );
    }
  }

  async function handleStartGame() {
        if (!quiz || quiz.questions.length === 0) {
            setNotice(
            'Não foi possível carregar as perguntas. Volte ao editor e salve o quiz novamente.',
            );
            return;
        }

        try {
            setNotice('');

            const startedAt = new Date().toISOString();

            await updateRoom({
              status: 'playing',
              current_question: 0,
              question_started_at: startedAt,
            });

            setQuestionStartedAt(startedAt);
            setRemainingSeconds(questionTime);
            setAnsweredCount(0);
            setCurrentQuestion(0);
            setGameStarted(true);
        } catch (error: unknown) {
            console.error('Erro ao iniciar o quiz:', error);

            setNotice(
            error instanceof Error
                ? `Não foi possível iniciar o quiz: ${error.message}`
                : 'Não foi possível iniciar o quiz. Tente novamente.',
            );
        }
    }

  async function handleNextQuestion() {
    if (!quiz || advancingRef.current) {
      return;
    }

    advancingRef.current = true;

    try {
      setNotice('');

      // Se esta era a última pergunta, finalizar a partida.
      if (currentQuestion + 1 >= questionCount) {
        await updateRoom({
          status: 'finished',
          question_started_at: null,
        });

        setQuestionStartedAt(null);
        setGameStarted(false);
        setGameFinished(true);
        setRemainingSeconds(0);

        return;
      }

      // Preparar a próxima pergunta.
      const nextQuestion = currentQuestion + 1;
      const startedAt = new Date().toISOString();

      await updateRoom({
        status: 'playing',
        current_question: nextQuestion,
        question_started_at: startedAt,
      });

      setQuestionStartedAt(startedAt);
      setRemainingSeconds(questionTime);
      setAnsweredCount(0);
      setCurrentQuestion(nextQuestion);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível avançar a pergunta.';

      setNotice(message);
    } finally {
      advancingRef.current = false;
    }
  }

    async function handleEndGame() {
        try {
            setNotice('');

            await updateRoom({
                status: 'finished',
            });

            setGameStarted(false);
            setGameFinished(true);
            setNotice('');
        } catch (error: unknown) {
            console.error('Erro ao encerrar o quiz:', error);

            setNotice(
            error instanceof Error
                ? `Não foi possível encerrar o quiz: ${error.message}`
                : 'Não foi possível encerrar o quiz. Tente novamente.',
            );
        }
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

      

      {gameFinished ? (
        <section className="panel lobby-center">
            <span className="eyebrow">Show do Milhão da 663</span>

            <h1>🏆 Resultado final</h1>

            <p className="muted">
            A partida terminou! Confira a classificação de todos os jogadores.
            </p>

            <div
            className="panel"
            style={{
                width: '100%',
                maxWidth: 650,
                textAlign: 'left',
                marginTop: 20,
            }}
            >
            <h2 style={{ textAlign: 'center' }}>
                Ranking da partida
            </h2>

            {[...players]
              .sort((a, b) => b.score - a.score)
              .map((player, index) => (
                <div
                  className="score-row"
                  key={player.id}
                  style={{ gap: 10 }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <PlayerAvatar appearance={player.avatar} size={44} />

                    <span>
                      {index === 0
                        ? '🥇'
                        : index === 1
                          ? '🥈'
                          : index === 2
                            ? '🥉'
                            : `${index + 1}º`}{' '}
                      {player.player_name}
                    </span>
                  </div>

                  <strong className="gold">
                    {player.score} pts
                  </strong>
                </div>
            ))}

            {players.length === 0 && (
                <p className="muted">
                Nenhum jogador foi encontrado nesta partida.
                </p>
            )}
            </div>

            {notice && (
              <div className="feedback" role="alert">
                {notice}
              </div>
            )}

            <button
              className="button button-primary"
              style={{ marginTop: 20 }}
              onClick={handleReturnToHome}
            >
              Voltar ao início
            </button>
        </section>

      ) : !gameStarted ? (
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
                <strong>{players.length}</strong>
                </div>

                <div style={{ marginTop: 16 }}>
                <h3>Jogadores na sala</h3>

                {players.length === 0 ? (
                    <p className="muted">
                    Aguardando jogadores entrarem...
                    </p>
                ) : (
                    <div style={{ display: 'grid', gap: 12 }}>
                      {[...players]
                        .sort((a, b) => b.score - a.score)
                        .map((player, index) => (
                          <div
                            key={player.id}
                            className="score-row"
                            style={{ justifyContent: 'space-between', gap: 12 }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                minWidth: 0,
                              }}
                            >
                              <PlayerAvatar appearance={player.avatar} size={48} />

                              <div>
                                <strong>
                                  {index + 1}º — {player.player_name}
                                </strong>
                                <div className="muted">
                                  Participante da sala
                                </div>
                              </div>
                            </div>

                            <strong className="gold">
                              {player.score} pts
                            </strong>
                          </div>
                        ))}
                    </div>
                )}
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
            Os jogadores conectados acompanham o andamento da partida automaticamente.
          </p>
        </section>
      ) : (
        <div className="game-layout">
          <section className="game-main">
            <div className="game-topline">
              <span className="eyebrow">Quiz em andamento</span>
              <span className="timer">
                ⏱ {remainingSeconds}s restantes
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
                <strong>{players.length}</strong>
            </div>

            <div className="score-row">
                <span>Já responderam</span>
                <strong>
                    {answeredCount}/{players.length}
                </strong>
            </div>

            <div style={{ marginTop: 20 }}>
                <h3>🏆 Ranking ao vivo</h3>

                {[...players]
                  .sort((a, b) => b.score - a.score)
                  .map((player, index) => (
                    <div
                      className="score-row"
                      key={player.id}
                      style={{ gap: 10 }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          minWidth: 0,
                        }}
                      >
                        <PlayerAvatar appearance={player.avatar} size={36} />

                        <span>
                          {index + 1}º — {player.player_name}
                        </span>
                      </div>

                      <strong className="gold">
                        {player.score} pts
                      </strong>
                    </div>
                ))}
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
              onClick={handleEndGame}
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
