import { supabase } from './supabaseClient';
import { ensureAnonymousSession } from './anonymousAuth';
import type { AvatarAppearance } from '../types/playerAvatar';

export async function createRoomInSupabase(
  quizId: string,
): Promise<string> {
  const user = await ensureAnonymousSession();

  // Confirma que o quiz pertence ao usuário atual.
  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .select('id')
    .eq('id', quizId)
    .eq('owner_id', user.id)
    .single();

  if (quizError || !quiz) {
    throw new Error(
      'Não foi possível encontrar seu quiz na nuvem. Salve-o novamente e tente criar a sala.',
    );
  }

  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  // Tenta gerar um código único de seis caracteres.
  for (let attempt = 0; attempt < 5; attempt++) {
    let roomCode = '';

    for (let i = 0; i < 6; i++) {
      roomCode += characters[
        Math.floor(Math.random() * characters.length)
      ];
    }

    const { error: roomError } = await supabase
      .from('game_rooms')
      .insert({
        room_code: roomCode,
        quiz_id: quizId,
        host_id: user.id,
        status: 'waiting',
        current_question: 0,
      });

    if (!roomError) {
      return roomCode;
    }

    // Se o código já existir, tenta gerar outro.
    if (roomError.code !== '23505') {
      throw roomError;
    }
  }

  throw new Error(
    'Não foi possível gerar um código exclusivo. Tente novamente.',
  );
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