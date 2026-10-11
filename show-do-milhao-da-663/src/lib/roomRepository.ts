import { supabase } from './supabaseClient';
import { ensureAnonymousSession } from './anonymousAuth';
import type { AvatarAppearance } from '../types/playerAvatar';


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

  console.log('[loadPlayerRoom] Dados retornados:', data);
  console.log('[loadPlayerRoom] Erro retornado:', error);

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