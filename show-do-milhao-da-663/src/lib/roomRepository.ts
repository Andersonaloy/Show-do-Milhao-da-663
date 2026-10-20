import { supabase } from './supabaseClient';
import { ensureAnonymousSession } from './anonymousAuth';
import type { AvatarAppearance } from '../types/playerAvatar';

export type HelpType = 'leader' | 'focus_points' | 'coin';

export type PlayerHelpResult = {
  correct_option?: number;
  outcome?: 'cara' | 'coroa';
  wrong_option?: number;
  opinions?: {
    character: number;
    selected_option: number;
  }[];
};

export async function createRoomInSupabase(
  quizId: string,
  password: string,
): Promise<string> {
  await ensureAnonymousSession();

  const { data, error } = await supabase.functions.invoke(
    'rapid-function',
    {
      body: {
        quizId,
        password,
      },
    },
  );

  if (error) {
    console.error('Erro completo da Edge Function:', error);
    console.error('Detalhes do erro:', error.context);

    if (error.context instanceof Response) {
      console.error('Status HTTP:', error.context.status);

      const responseText = await error.context
        .clone()
        .text();

      console.error('Resposta do servidor:', responseText);
    }

    throw new Error(error.message);
  }

  if (
    !data ||
    typeof data.roomCode !== 'string' ||
    !data.roomCode
  ) {
    throw new Error(
      'O Supabase não retornou o código da sala.',
    );
  }

  return data.roomCode;
}


export async function joinRoomInSupabase(
  roomCode: string,
  playerName: string,
  avatar: AvatarAppearance,
): Promise<{
  roomId: string;
  playerId: string;
  roomCode: string;
}> {
  await ensureAnonymousSession();

  const { data, error } = await supabase.rpc('join_room_by_code', {
    p_room_code: roomCode.trim().toUpperCase(),
    p_player_name: playerName.trim(),
    p_avatar: avatar,
  });

  if (error) {
    throw new Error(error.message);
  }

  const result = data?.[0];

  if (!result) {
    throw new Error('O Supabase não confirmou a entrada na sala.');
  }

  return {
    roomId: result.room_id,
    playerId: result.player_id,
    roomCode: result.room_code,
  };
}

export type PlayerRoomData = {
  roomId: string;
  roomCode: string;
  status: 'waiting' | 'playing' | 'finished';
  currentQuestion: number;
  questionStartedAt: string | null;
  quiz: {
    id: string;
    title: string;
    hostName: string;
    questionTime: number;
    questions: {
      id: string;
      text: string;
      options: string[];
    }[];
  };
};

export async function loadPlayerRoom(
  roomCode: string,
): Promise<PlayerRoomData> {
  const normalizedRoomCode = roomCode.trim().toUpperCase();

  console.log(
    '[loadPlayerRoom] Código recebido:',
    JSON.stringify(roomCode),
  );

  console.log(
    '[loadPlayerRoom] Código normalizado:',
    normalizedRoomCode,
  );

  const { data, error } = await supabase
    .from('game_rooms')
    .select(`
      id,
      room_code,
      status,
      current_question,
      question_started_at,
      quizzes (
        id,
        title,
        host_name,
        question_time,
        quiz_questions (
          id,
          position,
          question_text,
          options
        )
      )
    `)
    .eq('room_code', normalizedRoomCode)
    .maybeSingle();

  console.log('[Cronômetro do jogador] question_time:', data?.quizzes);
  console.log('[Cronômetro do jogador] question_started_at:', data?.question_started_at,);
  console.log(
    '[DEBUG CRONÔMETRO]',
    JSON.stringify({
      status: data?.status,
      questionStartedAt: data?.question_started_at,
      questionTime: data?.quizzes
        ? (data.quizzes as any).question_time ??
          ((data.quizzes as any)[0]?.question_time)
        : null,
      agora: new Date().toISOString(),
    }, null, 2),
  );


  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Sala não encontrada.');
  }

  const quiz = Array.isArray(data.quizzes)
    ? data.quizzes[0]
    : data.quizzes;

  if (!quiz) {
    throw new Error('Não foi possível encontrar o quiz desta sala.');
  }

  const questions = Array.isArray(quiz.quiz_questions)
    ? [...quiz.quiz_questions]
        .sort((a, b) => a.position - b.position)
        .map((question) => ({
          id: question.id,
          text: question.question_text,
          options: question.options as string[],
        }))
    : [];

  return {
    roomId: data.id,
    roomCode: data.room_code,
    status: data.status as PlayerRoomData['status'],
    currentQuestion: data.current_question,
    questionStartedAt: data.question_started_at,
    quiz: {
      id: quiz.id,
      title: quiz.title,
      hostName: quiz.host_name,
      questionTime: quiz.question_time,
      questions,
    },
  };
}

export type PlayerAnswerResult = {
  is_correct: boolean | null;
  points_awarded: number;
  total_score: number;
};

export async function submitPlayerAnswer(
  roomCode: string,
  questionId: string,
  selectedOption: number | null,
  usedHelp = false,
): Promise<PlayerAnswerResult> {
  await ensureAnonymousSession();

  const { data, error } = await supabase.rpc(
    'submit_player_answer',
    {
      p_room_code: roomCode.trim().toUpperCase(),
      p_question_id: questionId,
      p_selected_option: selectedOption,
      p_used_help: usedHelp,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  const result = data?.[0];

  if (!result) {
    throw new Error(
      'O Supabase não retornou o resultado da resposta.',
    );
  }

  return result as PlayerAnswerResult;
}

export async function loadPlayerAnswerFeedback(
  roomCode: string,
  questionId: string,
): Promise<number> {
  const { data, error } = await supabase.rpc(
    'get_player_answer_feedback',
    {
      p_room_code: roomCode.trim().toUpperCase(),
      p_question_id: questionId,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  const result = data?.[0];

  if (
    !result ||
    typeof result.correct_option !== 'number'
  ) {
    throw new Error(
      'Não foi possível carregar a resposta correta.',
    );
  }

  return result.correct_option;
}

export async function usePlayerHelp(
  roomCode: string,
  questionId: string,
  helpType: HelpType,
): Promise<PlayerHelpResult> {
  await ensureAnonymousSession();

  const { data, error } = await supabase.rpc('use_player_help', {
    p_room_code: roomCode.trim().toUpperCase(),
    p_question_id: questionId,
    p_help_type: helpType,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(
      'O Supabase não retornou um resultado válido para a ajuda.',
    );
  }

  return data as PlayerHelpResult;
}

export type PlayerUsedHelp = {
  help_type: HelpType;
  question_id: string;
  result: PlayerHelpResult;
};

export async function loadPlayerUsedHelps(
  roomCode: string,
): Promise<PlayerUsedHelp[]> {
  await ensureAnonymousSession();

  const { data, error } = await supabase.rpc(
    'get_my_player_used_helps',
    {
      p_room_code: roomCode.trim().toUpperCase(),
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!Array.isArray(data)) {
    throw new Error(
      'O Supabase não retornou o histórico das ajudas.',
    );
  }

  return data as PlayerUsedHelp[];
}

/**
 * Obtém o horário do servidor Supabase e estima
 * a diferença em relação ao relógio local.
 */
export async function getServerTimeOffset(): Promise<number> {
  const requestStartedAt = Date.now();

  const { data, error } = await supabase.rpc('get_server_time');

  const requestFinishedAt = Date.now();

  if (error) {
    throw new Error(
      `Não foi possível sincronizar o horário: ${error.message}`,
    );
  }

  const serverTime = new Date(data).getTime();

  if (!Number.isFinite(serverTime)) {
    throw new Error('O Supabase retornou um horário inválido.');
  }

  // Usa o ponto médio da requisição para reduzir
  // o efeito do tempo de ida e volta da rede.
  const localMidpoint =
    requestStartedAt + (requestFinishedAt - requestStartedAt) / 2;

  return serverTime - localMidpoint;
}