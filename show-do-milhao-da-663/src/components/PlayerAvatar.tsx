import type { AvatarAppearance } from '../types/playerAvatar';

interface PlayerAvatarProps {
  appearance: AvatarAppearance;
  size?: number;
}

function PlayerAvatar({
  appearance,
  size = 120,
}: PlayerAvatarProps) {
  const {
    skinColor,
    shirtColor,
    hairColor,
    hairStyle,
    expression,
    glasses,
  } = appearance;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 140"
      role="img"
      aria-label="Personagem do jogador"
    >
      {/* Cabelo atrás da cabeça */}
      {hairStyle === 'long' && (
        <path
          d="M31 38 Q22 55 29 91 L39 105 L81 105 L91 91 Q98 55 89 38 Z"
          fill={hairColor}
        />
      )}

      {/* Corpo e camisa */}
      <path
        d="M20 140 L25 111 Q30 99 46 97 L74 97 Q90 99 95 111 L100 140 Z"
        fill={shirtColor}
        stroke="#20172D"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Detalhe da camisa */}
      <path
        d="M48 99 L60 112 L72 99"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.65"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Pescoço */}
      <path
        d="M49 79 L49 99 Q60 110 71 99 L71 79 Z"
        fill={skinColor}
      />

      {/* Orelhas */}
      <ellipse cx="34" cy="57" rx="7" ry="10" fill={skinColor} />
      <ellipse cx="86" cy="57" rx="7" ry="10" fill={skinColor} />

      {/* Rosto */}
      <ellipse
        cx="60"
        cy="55"
        rx="26"
        ry="32"
        fill={skinColor}
        stroke="#20172D"
        strokeWidth="2.5"
      />

      {/* Cabelo curto */}
      {hairStyle === 'short' && (
        <path
          d="M34 49 Q29 17 60 21 Q91 17 86 49
             L79 39 Q61 32 43 41 Z"
          fill={hairColor}
        />
      )}

      {/* Cabelo espetado */}
      {hairStyle === 'spiky' && (
        <path
          d="M34 47 L29 30 L43 35 L45 19 L57 31
             L66 15 L72 32 L87 24 L85 48
             Q60 34 34 47 Z"
          fill={hairColor}
        />
      )}

      {/* Cabelo cacheado */}
      {hairStyle === 'curly' && (
        <g fill={hairColor}>
          <circle cx="39" cy="34" r="10" />
          <circle cx="50" cy="25" r="11" />
          <circle cx="62" cy="23" r="11" />
          <circle cx="74" cy="27" r="11" />
          <circle cx="82" cy="37" r="9" />
          <circle cx="44" cy="39" r="8" />
          <circle cx="75" cy="40" r="8" />
        </g>
      )}

      {/* Cabelo comprido na parte da frente */}
      {hairStyle === 'long' && (
        <path
          d="M34 48 Q29 17 60 21 Q91 17 86 48
             L79 37 Q60 31 43 40 Z"
          fill={hairColor}
        />
      )}

      {/* Olhos */}
      {expression === 'surprised' ? (
        <>
          <ellipse cx="49" cy="53" rx="4" ry="6" fill="#20172D" />
          <ellipse cx="71" cy="53" rx="4" ry="6" fill="#20172D" />
        </>
      ) : (
        <>
          <ellipse
            cx="49"
            cy={expression === 'confused' ? 55 : 54}
            rx="3"
            ry={expression === 'laughing' ? 1.5 : 3.5}
            fill="#20172D"
          />
          <ellipse
            cx="71"
            cy="54"
            rx="3"
            ry={expression === 'laughing' ? 1.5 : 3.5}
            fill="#20172D"
          />
        </>
      )}

      {/* Sobrancelhas */}
      {expression === 'confused' ? (
        <>
          <path
            d="M43 45 L54 42"
            stroke="#38251D"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M66 43 L77 46"
            stroke="#38251D"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      ) : expression === 'angry' ? (
        <>
          <path d="M43 43 L54 47 M66 47 L77 43" stroke="#38251D" strokeWidth="3" />
        </>
      ) : null}

      {/* Boca: cada expressão tem seu formato */}
      {expression === 'happy' && (
        <path
          d="M49 68 Q60 81 71 68"
          fill="none"
          stroke="#713D36"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}

      {expression === 'surprised' && (
        <ellipse cx="60" cy="70" rx="5" ry="7" fill="#713D36" />
      )}

      {expression === 'sly' && (
        <path
          d="M50 69 Q61 75 72 65"
          fill="none"
          stroke="#713D36"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}

      {expression === 'laughing' && (
        <path
          d="M47 66 Q60 86 73 66 Z"
          fill="#713D36"
          stroke="#713D36"
          strokeWidth="2"
        />
      )}

      {expression === 'confused' && (
        <path
          d="M51 71 Q58 65 68 71"
          fill="none"
          stroke="#713D36"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}

      {/* Óculos */}
      {glasses && (
        <g
          fill="none"
          stroke="#20172D"
          strokeWidth="3"
        >
          <circle cx="49" cy="55" r="9" />
          <circle cx="71" cy="55" r="9" />
          <path d="M58 54 L62 54 M40 53 L33 51 M80 53 L87 51" />
        </g>
      )}
    </svg>
  );
}

export default PlayerAvatar;