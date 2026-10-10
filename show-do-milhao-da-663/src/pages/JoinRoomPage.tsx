import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import PlayerAvatar from '../components/PlayerAvatar';
import {
  defaultAvatar,
  type AvatarAppearance,
  type HairStyle,
  type FaceExpression,
} from '../types/playerAvatar';

function JoinRoomPage() {
  const navigate = useNavigate();

  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isWaiting, setIsWaiting] = useState(false);
  const [error, setError] = useState('');
  const [avatar, setAvatar] =
  useState<AvatarAppearance>({ ...defaultAvatar });

    function updateAvatar<K extends keyof AvatarAppearance>(
    property: K,
    value: AvatarAppearance[K],
    ) {
    setAvatar((current) => ({
        ...current,
        [property]: value,
    }));
    }

  function handleJoin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (roomCode.trim().length < 4) {
      setError('Informe um código de sala válido.');
      return;
    }

    if (!playerName.trim()) {
      setError('Informe seu apelido.');
      return;
    }

    setRoomCode(roomCode.trim().toUpperCase());
    setIsWaiting(true);
  }

  function handleLeave() {
    setIsWaiting(false);
    setError('');
  }

  function handleStartSimulation() {
        navigate(`/jogar/${roomCode}`, {
            state: {
            playerName: playerName.trim(),
            avatar,
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

      {!isWaiting ? (
        <>
          <section className="page-header">
            <span className="eyebrow">Modo jogador</span>
            <h1>Entre na partida</h1>
            <p className="muted">
              Pegue o código com o anfitrião e prepare-se para jogar.
            </p>
          </section>

          <form className="panel form-panel stack" onSubmit={handleJoin}>
            <div className="field">
              <label htmlFor="playerName">Seu apelido</label>
              <input
                id="playerName"
                value={playerName}
                onChange={(event) => setPlayerName(event.target.value)}
                placeholder="Ex.: Fulano"
                maxLength={24}
                required
              />
            </div>

            <div className="avatar-editor">
                <h2>Monte seu personagem!</h2>
                <p className="muted">
                    Deixe seu jogador com a sua cara.
                </p>

                <div className="avatar-preview">
                    <PlayerAvatar appearance={avatar} size={140} />
                    <span className="avatar-preview-name">
                    {playerName.trim() || 'Seu apelido'}
                    </span>
                </div>

                <div className="avatar-options">
                    <div className="field">
                    <label htmlFor="skinColor">Cor da pele</label>
                    <select
                        id="skinColor"
                        value={avatar.skinColor}
                        onChange={(event) =>
                        updateAvatar('skinColor', event.target.value)
                        }
                    >
                        <option value="#F5D0A9">Clara</option>
                        <option value="#D99A6C">Média</option>
                        <option value="#A96842">Morena</option>
                        <option value="#663B2B">Escura</option>
                        <option value="#E8B9A5">Rosada</option>
                    </select>
                    </div>

                    <div className="field">
                    <label htmlFor="shirtColor">Camisa</label>
                    <select
                        id="shirtColor"
                        value={avatar.shirtColor}
                        onChange={(event) =>
                        updateAvatar('shirtColor', event.target.value)
                        }
                    >
                        <option value="#7543C4">Roxa</option>
                        <option value="#168548">Verde</option>
                        <option value="#E8BB55">Dourada</option>
                        <option value="#E74C3C">Vermelha</option>
                        <option value="#2980B9">Azul</option>
                        <option value="#F5F5F5">Branca</option>
                        <option value="#292929">Preta</option>
                        <option value="#F39C12">Laranja</option>
                    </select>
                    </div>

                    <div className="field">
                    <label htmlFor="hairStyle">Cabelo</label>
                    <select
                        id="hairStyle"
                        value={avatar.hairStyle}
                        onChange={(event) =>
                        updateAvatar('hairStyle', event.target.value as HairStyle)
                        }
                    >
                        <option value="short-curly">Cacheado curto</option>
                        <option value="long-curly">Cacheado comprido</option>
                        <option value="short-straight">Liso curto</option>
                        <option value="long-straight">Liso comprido</option>
                        <option value="bald">Careca</option>
                    </select>
                    </div>

                    <div className="field">
                    <label htmlFor="hairColor">Cor do cabelo</label>
                    <select
                        id="hairColor"
                        value={avatar.hairColor}
                        onChange={(event) =>
                        updateAvatar('hairColor', event.target.value)
                        }
                    >
                        <option value="#38251D">Preto / castanho escuro</option>
                        <option value="#754C24">Castanho</option>
                        <option value="#D49A32">Loiro</option>
                        <option value="#B74732">Ruivo</option>
                        <option value="#D8D8D8">Grisalho</option>
                        <option value="#8E44AD">Roxo</option>
                        <option value="#168548">Verde</option>
                        <option value="#2980B9">Azul</option>
                        <option value="#F5F5F5">Branco</option>
                    </select>
                    </div>

                    <div className="field">
                    <label htmlFor="expression">Expressão facial</label>
                    <select
                        id="expression"
                        value={avatar.expression}
                        onChange={(event) =>
                        updateAvatar(
                            'expression',
                            event.target.value as FaceExpression,
                        )
                        }
                    >
                        <option value="happy">😁 Feliz</option>
                        <option value="surprised">😮 Surpreso</option>
                        <option value="sly">😏 Malicioso</option>
                        <option value="laughing">😂 Gargalhando</option>
                        <option value="confused">🤨 Confuso</option>
                        <option value="angry">😠 Bravo</option>
                    </select>
                    </div>

                    <label className="avatar-glasses">
                    <input
                        type="checkbox"
                        checked={avatar.glasses}
                        onChange={(event) =>
                        updateAvatar('glasses', event.target.checked)
                        }
                    />
                    🤓 Quero usar óculos
                    </label>
                </div>
                </div>

            <div className="field">
              <label htmlFor="roomCode">Código da sala</label>
              <input
                id="roomCode"
                value={roomCode}
                onChange={(event) =>
                  setRoomCode(event.target.value.toUpperCase())
                }
                placeholder="Ex.: AB12CD"
                maxLength={6}
                required
              />
            </div>

            {error && (
              <div className="feedback error" role="alert">
                {error}
              </div>
            )}

            <button className="button button-primary button-full" type="submit">
              Entrar na sala →
            </button>
          </form>
        </>
      ) : (
        <section className="panel lobby-center">
          <span className="eyebrow">Você entrou na sala</span>

          <h1 style={{ marginBottom: 0 }}>Aguardando o anfitrião...</h1>

          <p className="muted">
            Olá, {playerName}! Assim que o anfitrião iniciar a partida,
            você poderá responder às perguntas.
          </p>

          <div>
            <p className="muted">Código da sala</p>
            <div className="room-code">{roomCode}</div>
          </div>

          <div className="player-list">
                <div className="player-chip avatar-player-chip">
                    <PlayerAvatar appearance={avatar} size={44} />
                    <span>{playerName} (você)</span>
                </div>
          </div>

          <div className="feedback">
            Esta é uma sala de demonstração. Outros jogadores ainda não
            aparecem porque o multiplayer não está conectado.
          </div>

          <div className="form-actions">
            <button
              className="button button-primary"
              onClick={handleStartSimulation}
            >
              Simular início da partida
            </button>

            <button className="button button-secondary" onClick={handleLeave}>
              Sair da sala
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

export default JoinRoomPage;
