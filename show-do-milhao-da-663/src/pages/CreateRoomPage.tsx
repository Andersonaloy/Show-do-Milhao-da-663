import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';

function CreateRoomPage() {
  const navigate = useNavigate();

  const [hostName, setHostName] = useState('');
  const [password, setPassword] = useState('');
  const [questionCount, setQuestionCount] = useState('10');
  const [questionTime, setQuestionTime] = useState('20');
  const [error, setError] = useState('');

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!hostName.trim()) {
      setError('Informe o nome do anfitrião.');
      return;
    }

    if (!password.trim()) {
      setError('Informe a senha de autorização.');
      return;
    }

    // Código temporário para testar a navegação.
    // A validação real da senha será feita no servidor.
    const roomCode = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    navigate(`/anfitriao/${roomCode}`, {
      state: {
        hostName: hostName.trim(),
        questionCount: Number(questionCount),
        questionTime: Number(questionTime),
      },
    });
  }

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
        <span className="eyebrow">Área do anfitrião</span>
        <h1>Vamos criar uma sala?</h1>
        <p className="muted">
          Configure sua partida e prepare-se para desafiar os jogadores.
        </p>
      </section>

      <form className="panel form-panel stack" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="hostName">Nome do anfitrião</label>
          <input
            id="hostName"
            value={hostName}
            onChange={(event) => setHostName(event.target.value)}
            placeholder="Ex.: Anderson"
            maxLength={24}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="password">Senha de autorização</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Digite a senha"
            required
          />
          <span className="muted">
            A validação real será adicionada quando conectarmos o backend.
          </span>
        </div>

        <div className="field">
          <label htmlFor="questionCount">Quantidade de perguntas</label>
          <select
            id="questionCount"
            value={questionCount}
            onChange={(event) => setQuestionCount(event.target.value)}
          >
            <option value="5">5 perguntas</option>
            <option value="10">10 perguntas</option>
            <option value="15">15 perguntas</option>
            <option value="20">20 perguntas</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="questionTime">Tempo por pergunta</label>
          <select
            id="questionTime"
            value={questionTime}
            onChange={(event) => setQuestionTime(event.target.value)}
          >
            <option value="10">10 segundos</option>
            <option value="20">20 segundos</option>
            <option value="30">30 segundos</option>
            <option value="60">60 segundos</option>
          </select>
        </div>

        {error && (
          <div className="feedback error" role="alert">
            {error}
          </div>
        )}

        <div className="form-actions">
          <button className="button button-primary button-full" type="submit">
            Continuar e criar sala →
          </button>
        </div>
      </form>
    </main>
  );
}

export default CreateRoomPage;
