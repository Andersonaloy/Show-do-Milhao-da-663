
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import { supabase } from '../lib/supabaseClient';
import { ensureAnonymousSession } from '../lib/anonymousAuth';

function HomePage() {
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [checkingPassword, setCheckingPassword] = useState(false);

  function handleExit() {
    alert('Obrigado por jogar! Você já pode fechar esta aba do navegador.');
  }

  function openCreatorAccess() {
    setPassword('');
    setPasswordError('');
    setShowPasswordModal(true);
  }

  async function handlePasswordSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setPasswordError('');

    if (!password.trim()) {
      setPasswordError('Digite a senha de autorização.');
      return;
    }

    setCheckingPassword(true);

    try {
      await ensureAnonymousSession();

      const { data, error } = await supabase.functions.invoke(
        'rapid-function',
        {
          body: {
            action: 'authorize',
            password,
          },
        },
      );

      if (error) {
        let message = 'Não foi possível validar a senha. Tente novamente.';

        if (error.context instanceof Response) {
          try {
            const response = await error.context.clone().json();

            if (typeof response.error === 'string') {
              message = response.error;
            }
          } catch {
            // Mantém a mensagem padrão.
          }
        }

        throw new Error(message);
      }

      if (!data?.authorized) {
        throw new Error('Não foi possível autorizar o acesso.');
      }

      // Libera o criador nesta aba do navegador.
      sessionStorage.setItem('show663-quiz-creator-authorized', 'true');

      setShowPasswordModal(false);
      setPassword('');
      navigate('/criar-sala');
    } catch (error: unknown) {
      setPasswordError(
        error instanceof Error
          ? error.message
          : 'Ocorreu um erro ao validar a senha.',
      );
    } finally {
      setCheckingPassword(false);
    }
  }

  return (
    <main className="app-shell home-screen">
      <div className="home-orb home-orb-purple" aria-hidden="true" />
      <div className="home-orb home-orb-green" aria-hidden="true" />

      <span className="home-spark home-spark-one" aria-hidden="true">✦</span>
      <span className="home-spark home-spark-two" aria-hidden="true">✧</span>
      <span className="home-spark home-spark-three" aria-hidden="true">✦</span>

      <section className="home-hero">
        <div className="home-brand">
          <BrandLogo />
        </div>

        <div className="home-edition">
          <span className="home-edition-dot" />
          EDIÇÃO ESPECIAL · EQUIPE 663
        </div>

        <h1 className="home-title">
          Preparado para
          <span> disputar um milhão?</span>
        </h1>

        <p className="home-description">
          Chame a equipe, teste seus conhecimentos
          e mostre quem merece o prêmio!
        </p>

        <nav className="home-actions" aria-label="Menu principal">
          <button
            type="button"
            className="action-card action-card-play"
            onClick={openCreatorAccess}
          >
            <span className="action-icon" aria-hidden="true">🎙️</span>
            <span className="action-copy">
              <strong>Criar uma sala</strong>
              <small>Seja o apresentador da rodada</small>
            </span>
            <span className="action-arrow" aria-hidden="true">→</span>
          </button>

          <button
            type="button"
            className="action-card action-card-join"
            onClick={() => navigate('/entrar-sala')}
          >
            <span className="action-icon" aria-hidden="true">🚪</span>
            <span className="action-copy">
              <strong>Entrar em uma sala</strong>
              <small>Junte-se aos seus colegas</small>
            </span>
            <span className="action-arrow" aria-hidden="true">→</span>
          </button>

          <button
            type="button"
            className="action-card action-card-exit"
            onClick={handleExit}
          >
            <span className="action-icon" aria-hidden="true">👋</span>
            <span className="action-copy">
              <strong>Sair do jogo</strong>
              <small>Volte quando estiver preparado</small>
            </span>
            <span className="action-arrow" aria-hidden="true">→</span>
          </button>
        </nav>

        <footer className="home-footer">
          <span className="home-footer-star">★</span>
          <span>CONHECIMENTO · ESTRATÉGIA · DIVERSÃO</span>
          <span className="home-footer-star">★</span>
        </footer>
      </section>

      {showPasswordModal && (
        <div
          onClick={() => {
            if (!checkingPassword) setShowPasswordModal(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            background: 'rgba(5, 2, 12, 0.82)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="creator-password-title"
            className="panel stack"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 420,
              boxSizing: 'border-box',
              padding: 28,
              border: '1px solid rgba(147, 51, 234, 0.55)',
              boxShadow: '0 24px 80px rgba(0, 0, 0, 0.45)',
            }}
          >
            <div style={{ textAlign: 'center', fontSize: 38 }}>
              🔐
            </div>

            <h2
              id="creator-password-title"
              style={{ margin: 0, textAlign: 'center' }}
            >
              Acesso ao criador
            </h2>

            <p className="muted" style={{ textAlign: 'center' }}>
              Digite a senha de autorização para criar e editar quizzes.
            </p>

            <form onSubmit={handlePasswordSubmit} className="stack">
              <div className="field">
                <label htmlFor="creator-access-password">
                  Senha de autorização
                </label>

                <input
                  id="creator-access-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Digite a senha"
                  autoFocus
                  autoComplete="current-password"
                  disabled={checkingPassword}
                />
              </div>

              {passwordError && (
                <div className="feedback error" role="alert">
                  {passwordError}
                </div>
              )}

              <button
                type="submit"
                className="button button-primary button-full"
                disabled={checkingPassword}
              >
                {checkingPassword ? 'Verificando...' : 'Entrar no criador →'}
              </button>

              <button
                type="button"
                className="button button-full"
                disabled={checkingPassword}
                onClick={() => setShowPasswordModal(false)}
              >
                Cancelar
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default HomePage;
