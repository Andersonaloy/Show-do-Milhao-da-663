import { supabase } from './supabaseClient';
import { ensureAnonymousSession } from './anonymousAuth';
import type { QuizDefinition } from '../types/quiz';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function saveQuizInSupabase(
  quiz: QuizDefinition,
): Promise<QuizDefinition> {
  const user = await ensureAnonymousSession();

  const updatedAt = new Date().toISOString();

  const quizData = {
    title: quiz.title.trim(),
    host_name: quiz.hostName.trim(),
    question_time: quiz.questionTime,
    updated_at: updatedAt,
  };

  let quizId: string;
  const isExistingCloudQuiz = UUID_PATTERN.test(quiz.id);

  if (isExistingCloudQuiz) {
    // Atualiza um quiz que já existe na nuvem.
    const { data, error } = await supabase
      .from('quizzes')
      .update(quizData)
      .eq('id', quiz.id)
      .eq('owner_id', user.id)
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    quizId = data.id;

    // Remove as perguntas antigas antes de gravar as atualizadas.
    const { error: deleteError } = await supabase
      .from('quiz_questions')
      .delete()
      .eq('quiz_id', quizId);

    if (deleteError) {
      throw deleteError;
    }
  } else {
    // Cria um novo quiz vinculado ao usuário autenticado.
    const { data, error } = await supabase
      .from('quizzes')
      .insert({
        ...quizData,
        owner_id: user.id,
      })
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    quizId = data.id;
  }

  // Salva os enunciados e as quatro alternativas.
  const questionRows = quiz.questions.map((question, index) => ({
    quiz_id: quizId,
    position: index + 1,
    question_text: question.text.trim(),
    options: question.options.map((option) => option.trim()),
  }));

  const { data: savedQuestions, error: questionsError } =
    await supabase
      .from('quiz_questions')
      .insert(questionRows)
      .select('id, position');

  if (questionsError) {
    throw questionsError;
  }

  if (!savedQuestions || savedQuestions.length !== quiz.questions.length) {
    throw new Error(
      'Nem todas as perguntas foram salvas corretamente.',
    );
  }

  // Associa cada resposta correta à pergunta correspondente.
  const questionIdByPosition = new Map(
    savedQuestions.map((question) => [
      question.position,
      question.id,
    ]),
  );

  const answerKeyRows = quiz.questions.map((question, index) => {
    const questionId = questionIdByPosition.get(index + 1);

    if (!questionId) {
      throw new Error(
        `Não foi possível identificar a pergunta ${index + 1}.`,
      );
    }

    return {
      question_id: questionId,
      correct_option: question.correctAnswer,
    };
  });

  const { error: keysError } = await supabase
    .from('quiz_question_keys')
    .insert(answerKeyRows);

  if (keysError) {
    throw keysError;
  }

  // Retorna o quiz com o ID UUID gerado pelo Supabase.
  return {
    ...quiz,
    id: quizId,
    title: quizData.title,
    hostName: quizData.host_name,
    updatedAt,
  };
}