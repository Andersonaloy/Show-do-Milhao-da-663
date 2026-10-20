import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import PlayerAvatar from '../components/PlayerAvatar';
import { defaultAvatar, type AvatarAppearance, } from '../types/playerAvatar';
import { supabase } from '../lib/supabaseClient';
import { getServerTimeOffset, loadPlayerRoom, loadPlayerUsedHelps, loadPlayerAnswerFeedback, submitPlayerAnswer, usePlayerHelp, type HelpType, type PlayerHelpResult, type PlayerUsedHelp, type PlayerRoomData, } from '../lib/roomRepository';
import HelpModal from '../components/HelpModal';

type RoomPlayer = {
  id: string;
  player_name: string;
  score: number;
  avatar: AvatarAppearance;
};

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
  const [usedHelps, setUsedHelps] = useState<PlayerUsedHelp[]>([]);
  const [helpLoading, setHelpLoading] = useState(false);
  const [multiplayerHelpFeedback, setMultiplayerHelpFeedback] = useState('');
  const [activeHelp, setActiveHelp] = useState<HelpType | null>(null);
  const [multiplayerConfirmationOpen, setMultiplayerConfirmationOpen] = useState(false);
  const [multiplayerScore, setMultiplayerScore] = useState<number | null>(null);
  const [rankingRefresh, setRankingRefresh] = useState(0);
  const [roomPlayers, setRoomPlayers] = useState<RoomPlayer[]>([]);
  const [finalRanking, setFinalRanking] = useState<RoomPlayer[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingError, setRankingError] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const [answerFeedback, setAnswerFeedback] = useState<{
    questionId: string;
    correctOption: number | null;
    isCorrect: boolean | null;
  } | null>(null);

  async function handleUseMultiplayerHelp(helpType: HelpType) {
    if (!roomCode || !roomData || helpLoading) return;

    const question =
      roomData.quiz.questions[roomData.currentQuestion];

    if (!question) return;

    if (submittedQuestionId === question.id) {
      setMultiplayerHelpFeedback(
        'Você já respondeu a esta pergunta.',
      );
      return;
    }

    if (usedHelps.some((help) => help.help_type === helpType)) {
      setMultiplayerHelpFeedback(
        'Você já utilizou esta ajuda nesta partida.',
      );
      return;
    }

    setActiveHelp(helpType);
    setHelpLoading(true);
    setMultiplayerHelpFeedback('');

    try {
      const result: PlayerHelpResult = await usePlayerHelp(
        roomCode,
        question.id,
        helpType,
      );

      const savedHelp: PlayerUsedHelp = {
        help_type: helpType,
        question_id: question.id,
        result,
      };

      setUsedHelps((current) => [...current, savedHelp]);

      if (helpType === 'leader' && result.correct_option !== undefined) {
        const correctLetter = String.fromCharCode(
          65 + result.correct_option,
        );

        setMultiplayerHelpFeedback(
          `💡 A resposta correta é ${correctLetter}.`,
        );
      } else if (helpType === 'focus_points' && result.opinions) {
        const focusPointNames = [
          'Anderson',
          'Letícia',
          'Elis',
          'Maya',
        ];

        const opinions = result.opinions
          .map((opinion) => {
            const name = focusPointNames[opinion.character - 1]
              ?? `Ponto Focal ${opinion.character}`;

            const selectedLetter = String.fromCharCode(
              65 + opinion.selected_option,
            );

            return `${name}: ${selectedLetter}`;
          })
          .join(' | ');

        setMultiplayerHelpFeedback(`🗣️ ${opinions}`);
      } else if (helpType === 'coin') {
        if (
          result.outcome === 'cara' &&
          result.correct_option !== undefined
        ) {
          const correctLetter = String.fromCharCode(
            65 + result.correct_option,
          );

          setMultiplayerHelpFeedback(
            `🪙 Deu cara! A resposta certa é ${correctLetter}.`,
          );
        } else if (
          result.outcome === 'coroa' &&
          result.wrong_option !== undefined
        ) {
          const wrongLetter = String.fromCharCode(
            65 + result.wrong_option,
          );

          setMultiplayerHelpFeedback(
            `🪙 Deu coroa! Uma resposta errada é ${wrongLetter}.`,
          );
        }
      }
    } catch (error: unknown) {
      setMultiplayerHelpFeedback(
        error instanceof Error
          ? error.message
          : 'Não foi possível utilizar esta ajuda.',
      );
    } finally {
      setHelpLoading(false);
    }
  }

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

      setAnswerFeedback({
        questionId,
        correctOption: null,
        isCorrect: result.is_correct,
      });

      if (selectedOption === null) {
        setMultiplayerFeedback(
          'Você pulou a pergunta. Não ganhou nem perdeu pontos.',
        );
      } else if (result.is_correct) {
        const ganhouBonusVelocidade =
          result.points_awarded === 5 ||
          result.points_awarded === 3;

        setMultiplayerFeedback(
          ganhouBonusVelocidade
            ? `Resposta correta e mais rápida! Você ganhou ${result.points_awarded} pontos, incluindo +1 ponto de bônus de velocidade!`
            : `Resposta correta! Você ganhou ${result.points_awarded} pontos.`,
        );
      } else {
        const pontosPerdidos = Math.abs(result.points_awarded);

        setMultiplayerFeedback(
          `Resposta incorreta. Você perdeu ${pontosPerdidos} ${
            pontosPerdidos === 1 ? 'ponto' : 'pontos'
          }.`,
        );
      }

      try {
        const correctOption = await loadPlayerAnswerFeedback(
          roomCode,
          questionId,
        );

        setAnswerFeedback({
          questionId,
          correctOption,
          isCorrect: result.is_correct,
        });
      } catch (feedbackError: unknown) {
        console.error(
          'Não foi possível revelar a resposta correta:',
          feedbackError,
        );
      }

      setRankingRefresh((previous) => previous + 1);
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

  function handleSelectMultiplayerAnswer(
      questionId: string,
      selectedOption: number,
  ) {
      if (!roomData || answerSubmitting) return;

      if (submittedQuestionId === questionId) return;

      setMultiplayerSelectedOption(selectedOption);
      setMultiplayerConfirmationOpen(true);
      setMultiplayerFeedback('');
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

  useEffect(() => {
    if (!roomCode || !roomData?.roomId) return;

    let isActive = true;

    async function loadHelps() {
      try {
        const history = await loadPlayerUsedHelps(roomCode!);

        if (isActive) {
          setUsedHelps(history);
        }
      } catch (error: unknown) {
          if (isActive) {
            console.error(
              'Não foi possível carregar o histórico das ajudas:',
              error,
            );
          }
        }
    }

    void loadHelps();

    return () => {
      isActive = false;
    };
  }, [roomCode, roomData?.roomId]);

  useEffect(() => {
    const questionId =
      roomData?.quiz.questions[roomData.currentQuestion]?.id;

    if (!questionId) return;

    setMultiplayerSelectedOption(null);
    setMultiplayerConfirmationOpen(false);
    setMultiplayerFeedback('');

    // Limpa a mensagem da ajuda ao mudar de pergunta.
    setMultiplayerHelpFeedback('');

    // Garante que a janela da ajuda anterior não fique aberta.
    setActiveHelp(null);
  }, [roomData?.roomId, roomData?.currentQuestion]);

  useEffect(() => {
    if (!roomData?.roomId) {
      return;
    }

    const roomId = roomData.roomId;
    let isActive = true;
    let isRefreshing = false;

    let playersChannel: ReturnType<typeof supabase.channel> | null = null;
    let refreshInterval: ReturnType<typeof setInterval> | null = null;

    async function loadRoomPlayers() {
      if (isRefreshing || !isActive) return;

      isRefreshing = true;

      try {
        const { data, error } = await supabase
          .from('room_players')
          .select('id, player_name, score, avatar')
          .eq('room_id', roomId)
          .order('joined_at', { ascending: true });

        if (error) throw error;

        if (isActive) {
          const formattedPlayers: RoomPlayer[] = (data ?? []).map(
            (player) => ({
              id: player.id,
              player_name: player.player_name,
              score: player.score,
              avatar:
                (player.avatar as unknown as AvatarAppearance | null) ??
                defaultAvatar,
            }),
          );

          setRoomPlayers(formattedPlayers);
        }
      } catch (error: unknown) {
        console.error('Erro ao carregar participantes:', error);
      } finally {
        isRefreshing = false;
      }
    }

    // Carrega os participantes assim que a sala é identificada.
    void loadRoomPlayers();

    // Atualiza a lista quando um participante entra, sai ou muda de pontuação.
    playersChannel = supabase
      .channel(`player-list-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_players',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          void loadRoomPlayers();
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void loadRoomPlayers();
        }
      });

    // Alternativa caso alguma atualização em tempo real não seja recebida.
    refreshInterval = setInterval(() => {
      void loadRoomPlayers();
    }, 3000);

    return () => {
      isActive = false;

      if (refreshInterval !== null) {
        clearInterval(refreshInterval);
      }

      if (playersChannel) {
        void supabase.removeChannel(playersChannel);
      }
    };
  }, [roomData?.roomId]);

  useEffect(() => {
    if (
      !roomData ||
      roomData.status !== 'playing' ||
      !roomData.questionStartedAt
    ) {
      setRemainingSeconds(0);
      return;
    }

    let isActive = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let serverTimeOffset = 0;

    const currentRoomData = roomData;

    const startedAt = new Date(
      currentRoomData.questionStartedAt!,
    ).getTime();

    const durationSeconds = Number(
      currentRoomData.quiz.questionTime,
    );

    if (
      !Number.isFinite(startedAt) ||
      !Number.isFinite(durationSeconds) ||
      durationSeconds <= 0
    ) {
      console.error('Dados inválidos para o cronômetro.');
      setRemainingSeconds(0);
      return;
    }

    function updateRemainingTime() {
      if (!isActive) return;

      // O relógio local é corrigido pela diferença
      // estimada em relação ao relógio do servidor.
      const estimatedServerNow = performance.now() + serverTimeOffset;

      const elapsedSeconds = Math.floor(
        (estimatedServerNow - startedAt) / 1000,
      );

      const remaining = Math.max(
        0,
        durationSeconds - elapsedSeconds,
      );

      setRemainingSeconds(remaining);
    }

    async function synchronizeClock() {
      try {
        const offset = await getServerTimeOffset();

        if (!isActive) return;

        serverTimeOffset = offset;
        updateRemainingTime();

        console.log('[CRONÔMETRO SINCRONIZADO]', {
          pergunta: currentRoomData.currentQuestion + 1,
          diferencaRelogioMs: Math.round(serverTimeOffset),
          inicioPergunta: currentRoomData.questionStartedAt,
          tempoTotal: durationSeconds,
        });
      } catch (error) {
        console.error(
          'Não foi possível sincronizar com o servidor:',
          error,
        );
      }
    }

    // Atualiza a contagem imediatamente e sincroniza
    // o relógio com o servidor.
    updateRemainingTime();
    void synchronizeClock();

    intervalId = setInterval(() => {
      updateRemainingTime();
    }, 250);

    // Corrige possíveis desvios periodicamente.
    const syncIntervalId = setInterval(() => {
      void synchronizeClock();
    }, 15000);

    return () => {
      isActive = false;

      if (intervalId !== null) {
        clearInterval(intervalId);
      }

      clearInterval(syncIntervalId);
    };
  }, [
    roomData?.status,
    roomData?.currentQuestion,
    roomData?.questionStartedAt,
    roomData?.quiz.questionTime,
  ]);

  useEffect(() => {
    if (roomData?.status !== 'finished' || !roomData.roomId) {
      return;
    }

    let isActive = true;

    async function loadFinalRanking() {
      setRankingLoading(true);
      setRankingError('');

      try {
        const { data, error } = await supabase
          .from('room_players')
          .select('id, player_name, score, avatar')
          .eq('room_id', roomData!.roomId)
          .order('score', { ascending: false })
          .order('joined_at', { ascending: true });

        if (error) throw error;

        if (isActive) {
          setFinalRanking(data ?? []);
        }
      } catch (error: unknown) {
        if (isActive) {
          setRankingError(
            error instanceof Error
              ? error.message
              : 'Não foi possível carregar o ranking final.',
          );
        }
      } finally {
        if (isActive) {
          setRankingLoading(false);
        }
      }
    }

    void loadFinalRanking();

    return () => {
      isActive = false;
    };
  }, [roomData?.status, roomData?.roomId, rankingRefresh]);

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
                👥 Jogadores na sala ({roomPlayers.length})
              </h2>

              {roomPlayers.length === 0 ? (
                <p className="muted">
                  Aguardando participantes...
                </p>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {roomPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="score-row"
                      style={{ gap: 12 }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          minWidth: 0,
                        }}
                      >
                        <PlayerAvatar
                          appearance={player.avatar}
                          size={52}
                        />

                        <div>
                          <strong>{player.player_name}</strong>
                          <div className="muted">
                            {player.player_name === playerName
                              ? 'Você'
                              : 'Participante'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

                {rankingLoading ? (
                  <p className="muted" role="status">
                    Carregando classificação...
                  </p>
                ) : rankingError ? (
                  <div>
                    <p className="feedback error" role="alert">
                      Não foi possível carregar o ranking.
                    </p>

                    <p className="muted">{rankingError}</p>

                    <button
                      className="button button-secondary"
                      onClick={() => {
                        setRoomData((current) =>
                          current ? { ...current } : current,
                        );
                      }}
                    >
                      Atualizar tela
                    </button>
                  </div>
                ) : finalRanking.length === 0 ? (
                  <p className="muted">
                    Nenhum jogador foi encontrado nesta partida.
                  </p>
                ) : (
                  finalRanking.map((player, index) => (
                    <div
                      className="score-row"
                      key={player.id}
                      style={{ gap: 12 }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          minWidth: 0,
                        }}
                      >
                        <PlayerAvatar
                          appearance={player.avatar}
                          size={48}
                        />

                        <div>
                          <strong>
                            {index === 0
                              ? '🥇'
                              : index === 1
                                ? '🥈'
                                : index === 2
                                  ? '🥉'
                                  : `${index + 1}º`}{' '}
                            {player.player_name}
                          </strong>

                          {player.player_name === playerName && (
                            <div className="muted">Você</div>
                          )}
                        </div>
                      </div>

                      <strong className="gold">
                        {player.score} pts
                      </strong>
                    </div>
                  ))
                )}
              </div>

              <button
                className="button button-primary"
                style={{ marginTop: 20 }}
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

  if (!synchronizedQuestion) {
    return (
      <main className="app-shell">
        <header className="topbar">
          <BrandLogo />
        </header>

        <section className="panel lobby-center">
          <h1>Pergunta indisponível</h1>
          <p className="muted">
            Não foi possível encontrar a pergunta atual da partida.
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

  const displayedScore =
    multiplayerScore ??
    roomPlayers.find((player) => player.player_name === playerName)?.score ??
    0;

  const hasAnswered =
    submittedQuestionId === synchronizedQuestion.id;

  const currentAnswerFeedback =
  answerFeedback?.questionId === synchronizedQuestion.id
    ? answerFeedback
    : null;

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

      <div
        className="game-topline"
        style={{ marginBottom: 24 }}
      >
        <span className="eyebrow">
          Sala {roomData.roomCode}
        </span>

        <span className="timer">
          Pergunta {roomData.currentQuestion + 1} de{' '}
          {roomData.quiz.questions.length}
        </span>

        <span
          className="timer"
          style={{
            color: remainingSeconds <= 5 ? '#ef4444' : 'inherit',
            fontWeight: 700,
          }}
        >
          ⏱ {remainingSeconds}s
        </span>
      </div>

      <div className="game-layout">
        <section className="game-main">
          <div className="panel">
            <div className="eyebrow">
              Show do Milhão da 663
            </div>

            <h1
              style={{
                fontSize: 'clamp(1.5rem, 4vw, 2.4rem)',
                marginTop: 18,
              }}
            >
              {synchronizedQuestion.text}
            </h1>

            <p className="muted">
              Escolha sua resposta. Ela será registrada na partida
              compartilhada.
            </p>
          </div>

          <div className="answers-grid">
            {synchronizedQuestion.options.map((answer, index) => {
              let answerStyle: React.CSSProperties | undefined;

              if (hasAnswered && currentAnswerFeedback) {
                if (currentAnswerFeedback.correctOption === index) {
                  // A resposta correta fica verde.
                  answerStyle = {
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.16)',
                    color: '#86efac',
                  };
                } else if (
                  multiplayerSelectedOption === index &&
                  currentAnswerFeedback.isCorrect === false
                ) {
                  // A resposta escolhida e errada fica vermelha.
                  answerStyle = {
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.16)',
                    color: '#fca5a5',
                  };
                }
              }

              return (
                <button
                  key={`${index}-${answer}`}
                  className={`answer-button ${
                    multiplayerSelectedOption === index ? 'selected' : ''
                  }`}
                  style={answerStyle}
                  onClick={() =>
                    handleSelectMultiplayerAnswer(
                      synchronizedQuestion.id,
                      index,
                    )
                  }
                  disabled={hasAnswered || answerSubmitting}
                >
                  <span className="gold">
                    {String.fromCharCode(65 + index)}.
                  </span>{' '}
                  {answer}
                </button>
              );
            })}
          </div>

          {hasAnswered && multiplayerFeedback && (
            <div
              className="feedback"
              role="status"
              style={{ marginTop: 16 }}
            >
              {multiplayerFeedback}
            </div>
          )}

          {multiplayerConfirmationOpen && !hasAnswered && (
            <div className="panel" style={{ marginTop: 20 }}>
              <h2>Confirmar resposta?</h2>

              <p className="muted">Você selecionou:</p>

              {multiplayerSelectedOption !== null && (
                <p>
                  <strong>
                    {String.fromCharCode(65 + multiplayerSelectedOption)}.{' '}
                    {synchronizedQuestion.options[multiplayerSelectedOption]}
                  </strong>
                </p>
              )}

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 12,
                  marginTop: 16,
                }}
              >
                <button
                  className="button button-secondary"
                  disabled={answerSubmitting}
                  onClick={() => {
                    setMultiplayerConfirmationOpen(false);
                    setMultiplayerSelectedOption(null);
                  }}
                >
                  Voltar e alterar
                </button>

                <button
                  className="button button-primary"
                  disabled={
                    answerSubmitting || multiplayerSelectedOption === null
                  }
                  onClick={() => {
                    setMultiplayerConfirmationOpen(false);
                    void handleMultiplayerAnswer(
                      synchronizedQuestion.id,
                      multiplayerSelectedOption,
                    );
                  }}
                >
                  {answerSubmitting ? 'Registrando...' : 'Confirmar resposta'}
                </button>
              </div>
            </div>
          )}

          <button
            className="button button-danger"
            style={{ marginTop: 16 }}
            disabled={hasAnswered || answerSubmitting}
            onClick={() => {
              void handleMultiplayerAnswer(
                synchronizedQuestion.id,
                null,
              );
            }}
          >
            Pular pergunta
          </button>

          <div className="panel stack" style={{ marginTop: 24 }}>
            <h2>Suas ajudas</h2>

            <p className="muted">
              Cada ajuda pode ser utilizada uma única vez durante a partida.
            </p>

            <button
              className="button button-secondary"
              disabled={
                hasAnswered ||
                helpLoading ||
                usedHelps.some((help) => help.help_type === 'leader')
              }
              onClick={() => void handleUseMultiplayerHelp('leader')}
            >
              💡 Ajuda da líder
              {usedHelps.some((help) => help.help_type === 'leader')
                ? ' — Usada'
                : ''}
            </button>

            <button
              className="button button-secondary"
              disabled={
                hasAnswered ||
                helpLoading ||
                usedHelps.some((help) => help.help_type === 'focus_points')
              }
              onClick={() => void handleUseMultiplayerHelp('focus_points')}
            >
              🗣️ Consultar os quatro pontos focais
              {usedHelps.some((help) => help.help_type === 'focus_points')
                ? ' — Usada'
                : ''}
            </button>

            <button
              className="button button-secondary"
              disabled={
                hasAnswered ||
                helpLoading ||
                usedHelps.some((help) => help.help_type === 'coin')
              }
              onClick={() => void handleUseMultiplayerHelp('coin')}
            >
              🪙 Cara ou coroa
              {usedHelps.some((help) => help.help_type === 'coin')
                ? ' — Usada'
                : ''}
            </button>

            {helpLoading && (
              <p className="feedback" role="status">
                Executando ajuda...
              </p>
            )}

            {multiplayerHelpFeedback && (
              <div className="feedback" role="status">
                {multiplayerHelpFeedback}
              </div>
            )}
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
            <strong className="gold">{displayedScore}</strong>
          </div>

          <div className="score-row">
            <span>Pergunta</span>
            <strong>
              {roomData.currentQuestion + 1} /{' '}
              {roomData.quiz.questions.length}
            </strong>
          </div>

          <div className="score-row">
            <span>Quiz</span>
            <strong>{roomData.quiz.title}</strong>
          </div>

          <div className="panel" style={{ marginTop: 20 }}>
            <h2>👥 Jogadores</h2>

            {roomPlayers.map((player) => (
              <div className="score-row" key={player.id}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    minWidth: 0,
                  }}
                >
                  <PlayerAvatar appearance={player.avatar} size={42} />
                  <span>
                    {player.player_name}
                    {player.player_name === playerName ? ' (você)' : ''}
                  </span>
                </div>

                <strong className="gold">{player.score} pts</strong>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {activeHelp && (
        <HelpModal
          helpType={activeHelp}
          loading={helpLoading}
          feedback={multiplayerHelpFeedback}
          onClose={() => setActiveHelp(null)}
        />
      )}
    </main>
  );
}

export default PlayerGamePage;