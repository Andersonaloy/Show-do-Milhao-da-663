
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import type { QuizDefinition, QuizQuestion } from '../types/quiz';
import { saveQuizInSupabase } from '../lib/quizRepository';

const DRAFT_KEY = 'show663-quiz-draft';
const SAVED_KEY = 'show663-saved-quizzes';

function createQuestion(): QuizQuestion {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
  };
}

function loadDraft(): QuizDefinition | null {
  try {
    const stored = localStorage.getItem(DRAFT_KEY);
    return stored ? (JSON.parse(stored) as QuizDefinition) : null;
  } catch {
    return null;
  }
}

function createEmptyQuiz(): QuizDefinition {
  return {
    id: `quiz-${Date.now()}`,
    title: 'Meu novo quiz',
    hostName: '',
    questionTime: 20,
    questions: [createQuestion()],
    updatedAt: new Date().toISOString(),
  };
}

function CreateRoomPage() {
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<QuizDefinition>(
    () => loadDraft() ?? createEmptyQuiz(),
  );
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSaved, setIsSaved] = useState(() => Boolean(loadDraft()));
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  function updateQuiz(
    changes: Partial<QuizDefinition>,
  ) {
    setQuiz((current) => ({ ...current, ...changes }));
    setIsSaved(false);
    setNotice('');
  }

  function updateQuestion(
    questionId: string,
    changes: Partial<QuizQuestion>,
  ) {
    updateQuiz({
      questions: quiz.questions.map((question) =>
        question.id === questionId
          ? { ...question, ...changes }
          : question,
      ),
    });
  }

  function updateOption(
    question: QuizQuestion,
    optionIndex: number,
    value: string,
  ) {
    const options = [...question.options];
    options[optionIndex] = value;

    updateQuestion(question.id, { options });
  }

  function addQuestion() {
    const question = createQuestion();

    updateQuiz({
      questions: [...quiz.questions, question],
    });

    setPreviewIndex(quiz.questions.length);
  }

  function duplicateQuestion(question: QuizQuestion) {
    const copy: QuizQuestion = {
      ...question,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      options: [...question.options],
    };

    const index = quiz.questions.findIndex(
      (item) => item.id === question.id,
    );

    const questions = [...quiz.questions];
    questions.splice(index + 1, 0, copy);

    updateQuiz({ questions });
    setPreviewIndex(index + 1);
  }

  function deleteQuestion(question: QuizQuestion) {
    if (quiz.questions.length === 1) {
      setError('O quiz precisa ter pelo menos uma pergunta.');
      return;
    }

    const confirmed = window.confirm(
      `Deseja excluir a pergunta ${
        quiz.questions.findIndex((item) => item.id === question.id) + 1
      }? Essa ação não pode ser desfeita.`,
    );

    if (!confirmed) return;

    const questions = quiz.questions.filter(
      (item) => item.id !== question.id,
    );

    updateQuiz({ questions });
    setPreviewIndex((current) =>
      Math.min(current, questions.length - 1),
    );
    setError('');
  }

  function validateQuiz(): string {
    if (!quiz.title.trim()) {
      return 'Informe um nome para o quiz.';
    }

    if (!quiz.hostName.trim()) {
      return 'Informe o nome do anfitrião.';
    }

    if (!quiz.questions.length) {
      return 'Adicione pelo menos uma pergunta.';
    }

    for (let i = 0; i < quiz.questions.length; i++) {
      const question = quiz.questions[i];

      if (!question.text.trim()) {
        return `Preencha o enunciado da pergunta ${i + 1}.`;
      }

      if (question.options.some((option) => !option.trim())) {
        return `Preencha as quatro alternativas da pergunta ${i + 1}.`;
      }
    }

    return '';
  }

  async function saveQuiz() {
        setError('');
        setNotice('');

        const validationError = validateQuiz();

        if (validationError) {
            setError(validationError);
            return;
        }

        if (!password.trim()) {
            setError('Informe a senha de autorização.');
            return;
        }

        const quizToSave: QuizDefinition = {
            ...quiz,
            title: quiz.title.trim(),
            hostName: quiz.hostName.trim(),
            updatedAt: new Date().toISOString(),
        };

        // Primeiro, salva o quiz no Supabase.
        let savedQuiz: QuizDefinition;

        try {
            savedQuiz = await saveQuizInSupabase(quizToSave);
        } catch (error) {
            console.error('Erro ao salvar quiz no Supabase:', error);

            setError(
            error instanceof Error
                ? `Não foi possível salvar no Supabase: ${error.message}`
                : 'Ocorreu um erro ao salvar o quiz na nuvem.',
            );

            return;
        }

        // Depois, mantém uma cópia local para a versão atual do jogo.
        try {
            localStorage.setItem(DRAFT_KEY, JSON.stringify(savedQuiz));

            const previous = JSON.parse(
            localStorage.getItem(SAVED_KEY) ?? '[]',
            ) as QuizDefinition[];

            const updated = [
            ...previous.filter((item) => item.id !== savedQuiz.id),
            savedQuiz,
            ];

            localStorage.setItem(SAVED_KEY, JSON.stringify(updated));

            setQuiz(savedQuiz);
            setIsSaved(true);
            setNotice(
            'Quiz salvo no Supabase e neste navegador! Você já pode preparar a sala.',
            );
        } catch (error: unknown) {
            console.error(
                'Erro ao salvar quiz no Supabase:',
                JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
            );

            const detalhes =
                error instanceof Error
                ? error.message
                : JSON.stringify(error);

            setError(
                `Erro ao salvar na nuvem: ${detalhes || 'Verifique o Console (F12).'}`,
            );
        }
    }

  function createRoom() {
    if (!isSaved) {
      setError('Salve o quiz antes de criar a sala.');
      return;
    }

    const roomCode = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    navigate(`/anfitriao/${roomCode}`, {
      state: {
        hostName: quiz.hostName,
        questionCount: quiz.questions.length,
        questionTime: quiz.questionTime,
        quizId: quiz.id,
        quizTitle: quiz.title,
      },
    });
  }

  const currentPreview = quiz.questions[previewIndex];

  return (
    <main className="app-shell">
      <header className="topbar">
        <button
          className="button-link"
          onClick={() => navigate('/')}
        >
          ← Voltar ao início
        </button>
        <BrandLogo />
      </header>

      <section className="page-header">
        <span className="eyebrow">Estúdio do anfitrião</span>
        <h1>Monte seu quiz</h1>
        <p className="muted">
          Crie as perguntas, escolha as respostas corretas e prepare
          a sala antes de chamar os jogadores.
        </p>
      </section>

      <section className="panel stack">
        <div className="field">
          <label htmlFor="quizTitle">Nome do quiz</label>
          <input
            id="quizTitle"
            value={quiz.title}
            maxLength={80}
            onChange={(event) =>
              updateQuiz({ title: event.target.value })
            }
            placeholder="Ex.: Quiz de conhecimentos gerais"
          />
        </div>

        <div className="field">
          <label htmlFor="hostName">Nome do anfitrião</label>
          <input
            id="hostName"
            value={quiz.hostName}
            maxLength={24}
            onChange={(event) =>
              updateQuiz({ hostName: event.target.value })
            }
            placeholder="Ex.: Anderson"
          />
        </div>

        <div className="field">
          <label htmlFor="questionTime">Tempo por pergunta</label>
          <select
            id="questionTime"
            value={String(quiz.questionTime)}
            onChange={(event) =>
              updateQuiz({ questionTime: Number(event.target.value) })
            }
          >
            <option value="10">10 segundos</option>
            <option value="20">20 segundos</option>
            <option value="30">30 segundos</option>
            <option value="60">60 segundos</option>
          </select>
        </div>

        <p className="muted">
          {quiz.questions.length} pergunta(s) · Pontuação padrão:
          acerto +2, acerto com ajuda +1, pular 0, erro -1.
        </p>
      </section>

      <section className="stack" style={{ marginTop: 24 }}>
        <div className="score-row">
          <h2 style={{ margin: 0 }}>Perguntas</h2>
          <span className="muted">
            {quiz.questions.length} no total
          </span>
        </div>

        {quiz.questions.map((question, index) => (
          <article
            className="panel stack"
            key={question.id}
            style={{ border: '1px solid var(--border, #ddd)' }}
          >
            <div className="score-row">
              <h3 style={{ margin: 0 }}>
                Pergunta {index + 1}
              </h3>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="button-link"
                  onClick={() => duplicateQuestion(question)}
                >
                  Duplicar
                </button>

                <button
                  type="button"
                  className="button-link"
                  onClick={() => deleteQuestion(question)}
                >
                  Excluir
                </button>
              </div>
            </div>

            <div className="field">
              <label htmlFor={`question-${question.id}`}>
                Enunciado
              </label>
              <textarea
                id={`question-${question.id}`}
                value={question.text}
                rows={3}
                onChange={(event) =>
                  updateQuestion(question.id, {
                    text: event.target.value,
                  })
                }
                placeholder="Escreva a pergunta aqui..."
              />
            </div>

            <p className="muted">
              Selecione o círculo ao lado da alternativa correta.
            </p>

            {question.options.map((option, optionIndex) => (
              <div
                key={`${question.id}-option-${optionIndex}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <input
                  type="radio"
                  name={`correct-${question.id}`}
                  aria-label={`Marcar alternativa ${String.fromCharCode(65 + optionIndex)} como correta`}
                  checked={question.correctAnswer === optionIndex}
                  onChange={() =>
                    updateQuestion(question.id, {
                      correctAnswer: optionIndex,
                    })
                  }
                />

                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor={`${question.id}-option-${optionIndex}`}>
                    Alternativa {String.fromCharCode(65 + optionIndex)}
                    {question.correctAnswer === optionIndex
                      ? ' — correta'
                      : ''}
                  </label>
                  <input
                    id={`${question.id}-option-${optionIndex}`}
                    value={option}
                    onChange={(event) =>
                      updateOption(question, optionIndex, event.target.value)
                    }
                    placeholder={`Escreva a alternativa ${String.fromCharCode(65 + optionIndex)}`}
                  />
                </div>
              </div>
            ))}
          </article>
        ))}

        <button
          type="button"
          className="button button-primary button-full"
          onClick={addQuestion}
        >
          + Adicionar pergunta
        </button>

        <button
          type="button"
          className="button button-full"
          onClick={() => {
            setPreviewIndex(0);
            setPreviewOpen(true);
          }}
        >
          👁 Prévia do quiz
        </button>
      </section>

      <section className="panel stack" style={{ marginTop: 24 }}>
        <h2 style={{ margin: 0 }}>Salvar e preparar a sala</h2>

        <div className="field">
          <label htmlFor="password">Senha de autorização</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Digite a senha"
          />
          <span className="muted">
            A validação segura dessa senha será implementada no backend.
          </span>
        </div>

        {error && (
          <div className="feedback error" role="alert">
            {error}
          </div>
        )}

        {notice && (
          <div className="feedback" role="status">
            {notice}
          </div>
        )}

        <button
          type="button"
          className="button button-primary button-full"
          onClick={saveQuiz}
        >
          Salvar quiz
        </button>

        <button
          type="button"
          className="button button-full"
          disabled={!isSaved}
          onClick={createRoom}
        >
          Criar sala e aguardar jogadores →
        </button>

        {!isSaved && (
          <p className="muted">
            Salve o quiz para liberar a criação da sala.
          </p>
        )}
      </section>

      {previewOpen && currentPreview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Prévia da pergunta"
          className="panel stack"
          style={{ marginTop: 24 }}
        >
          <div className="score-row">
            <h2 style={{ margin: 0 }}>Prévia para os jogadores</h2>
            <button
              type="button"
              className="button-link"
              onClick={() => setPreviewOpen(false)}
            >
              Fechar ✕
            </button>
          </div>

          <p className="muted">
            {quiz.title} · Pergunta {previewIndex + 1} de{' '}
            {quiz.questions.length}
          </p>

          <h3>{currentPreview.text || 'Sua pergunta aparecerá aqui'}</h3>

          <div className="answers-grid">
            {currentPreview.options.map((option, index) => (
              <div className="answer-button" key={index}>
                <span className="gold">
                  {String.fromCharCode(65 + index)}.
                </span>{' '}
                {option || `Alternativa ${String.fromCharCode(65 + index)}`}
              </div>
            ))}
          </div>

          <div className="score-row">
            <button
              type="button"
              className="button"
              disabled={previewIndex === 0}
              onClick={() => setPreviewIndex((index) => index - 1)}
            >
              ← Anterior
            </button>

            <button
              type="button"
              className="button button-primary"
              disabled={previewIndex >= quiz.questions.length - 1}
              onClick={() => setPreviewIndex((index) => index + 1)}
            >
              Próxima →
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default CreateRoomPage;
