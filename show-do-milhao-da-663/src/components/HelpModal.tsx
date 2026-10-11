
import './HelpModal.css';
import type { HelpType } from '../lib/roomRepository';

type HelpModalProps = {
  helpType: HelpType;
  loading: boolean;
  feedback: string;
  onClose: () => void;
};

const helpTitles: Record<HelpType, string> = {
  leader: 'Conselho da Líder',
  focus_points: 'Os Quatro Pontos Focais',
  coin: 'A Moeda da Sorte',
};

function HelpModal({
  helpType,
  loading,
  feedback,
  onClose,
}: HelpModalProps) {
  return (
    <div
      className="help-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="help-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
      >
        <button
          type="button"
          className="help-close"
          onClick={onClose}
          aria-label="Fechar janela de ajuda"
        >
          ×
        </button>

        <div className="help-modal-header">
          <span className="help-eyebrow">
            SHOW DO MILHÃO DA 663
          </span>

          <h2 id="help-modal-title">
            {helpTitles[helpType]}
          </h2>
        </div>

        {helpType === 'coin' && (
          <div className="coin-stage">
            <div
              className={`help-coin ${
                loading ? 'is-spinning' : 'is-result'
              }`}
              aria-label={
                loading
                  ? 'Moeda girando'
                  : 'Resultado da moeda'
              }
            >
              <span>663</span>
            </div>

            <p className="coin-caption">
              {loading
                ? 'A sorte está sendo lançada...'
                : 'A moeda revelou seu resultado!'}
            </p>
          </div>
        )}

        {helpType === 'leader' && (
          <div className="help-character-stage">
            <div className="help-character-placeholder">
              <span aria-hidden="true">👩‍💼</span>
            </div>

            <p className="help-character-name">
              A Líder
            </p>

            <p className="help-description">
              {loading
                ? 'A Líder está analisando a pergunta...'
                : 'Confira o conselho recebido.'}
            </p>
          </div>
        )}

        {helpType === 'focus_points' && (
          <div className="focus-stage">
            <p className="help-description">
              {loading
                ? 'Os quatro personagens estão discutindo a resposta...'
                : 'Confira a opinião de cada personagem.'}
            </p>

            <div className="focus-characters">
              {['🧑‍💻', '👩‍💼', '🧑‍🔬', '👨‍💼'].map(
                (character, index) => (
                  <div
                    className="focus-character"
                    key={index}
                  >
                    <span>{character}</span>
                    <small>Ponto Focal {index + 1}</small>
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="help-loading" role="status">
            <span className="help-loading-dot" />
            Preparando sua ajuda...
          </div>
        ) : feedback ? (
          <div className="help-result" role="status">
            <span className="help-result-label">
              RESULTADO DA AJUDA
            </span>

            <p>{feedback}</p>
          </div>
        ) : null}

        <button
          type="button"
          className="help-continue"
          onClick={onClose}
          disabled={loading}
        >
          {loading ? 'Aguarde...' : 'Continuar'}
        </button>
      </section>
    </div>
  );
}

export default HelpModal;
