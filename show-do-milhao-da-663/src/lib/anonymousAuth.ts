import { supabase } from './supabaseClient';

export async function ensureAnonymousSession() {
  // Verifica se o jogador já possui uma sessão.
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  // Se já estiver autenticado, reutiliza a sessão.
  if (session) {
    return session.user;
  }

  // Caso contrário, cria uma sessão anônima.
  const { data, error } = await supabase.auth.signInAnonymously();

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error(
      'Não foi possível criar uma identidade de jogador.',
    );
  }

  return data.user;
}