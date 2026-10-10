
import { useNavigate } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';

function HomePage() {
  const navigate = useNavigate();

  function handleExit() {
    alert('Obrigado por jogar! Você já pode fechar esta aba do navegador.');
  }

  return (
    <main className="app-shell home-screen">
      {/* Elementos decorativos do cenário */}
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
            onClick={() => navigate('/criar-sala')}
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
    </main>
  );
}

export default HomePage;
