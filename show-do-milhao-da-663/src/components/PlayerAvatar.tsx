
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

  const isLaughing = expression === 'laughing';
  const isSurprised = expression === 'surprised';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 140"
      role="img"
      aria-label="Personagem do jogador"
    >
      {/* Cabelo comprido atrás da cabeça */}
    {(hairStyle === 'long-curly' ||
    hairStyle === 'long-straight') && (
    <path
        d={
        hairStyle === 'long-straight'
            ? `
            M34 42
            Q31 25 43 20
            Q60 12 77 20
            Q89 25 86 42
            L85 88
            Q85 98 77 101
            L43 101
            Q35 98 35 88
            Z
            `
            : `
            M34 48
            Q25 37 31 27
            Q35 14 48 19
            Q60 10 70 18
            Q85 13 90 30
            Q96 40 86 50
            L89 85
            Q94 99 80 104
            Q72 108 65 101
            L55 105
            Q43 109 37 101
            Q24 96 30 83
            Z
            `
        }
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

      

      {/* Cachos laterais do cabelo comprido */}
      {hairStyle === 'long-curly' && (
        <g fill={hairColor}>
          <circle cx="34" cy="46" r="8" />
          <circle cx="33" cy="61" r="8" />
          <circle cx="35" cy="76" r="8" />
          <circle cx="39" cy="90" r="8" />
          <circle cx="86" cy="46" r="8" />
          <circle cx="87" cy="61" r="8" />
          <circle cx="85" cy="76" r="8" />
          <circle cx="81" cy="90" r="8" />
        </g>
      )}

      {/* Cabelo liso curto */}
      {hairStyle === 'short-straight' && (
        <path
          d="M33 49 Q28 23 48 21 Q70 14 84 29 Q91 37 87 49
             L78 39 Q64 35 53 39 L42 44 L39 51 Z"
          fill={hairColor}
        />
      )}

      {/* Cachos da parte superior */}
        {(hairStyle === 'short-curly' ||
        hairStyle === 'long-curly') && (
        <g fill={hairColor}>
            <circle cx="37" cy="35" r="9" />
            <circle cx="45" cy="27" r="10" />
            <circle cx="56" cy="23" r="10" />
            <circle cx="67" cy="24" r="10" />
            <circle cx="78" cy="30" r="10" />
            <circle cx="84" cy="39" r="9" />
            <circle cx="43" cy="40" r="8" />
            <circle cx="77" cy="41" r="8" />
        </g>
        )}

      {/* Franja do cabelo comprido liso */}
      {hairStyle === 'long-straight' && (
      <path
          d="
          M33 48
          Q28 24 47 20
          Q69 13 83 28
          Q91 36 87 48
          L78 38
          Q62 32 48 39
          L40 46
          Z
          "
          fill={hairColor}
      />
      )}

      {/* Olhos: branco, íris, pupila e brilho */}
      {isLaughing ? (
        <>
          {/* Olhos fechados sorrindo */}
          <path
            d="M42 54 Q49 62 56 54"
            fill="none"
            stroke="#20172D"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M64 54 Q71 62 78 54"
            fill="none"
            stroke="#20172D"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          {/* Esclera: parte branca */}
          <ellipse
            cx="49"
            cy={isSurprised ? 53 : 54}
            rx={isSurprised ? 6 : 5}
            ry={isSurprised ? 8 : 6}
            fill="#FFFFFF"
          />
          <ellipse
            cx="71"
            cy={isSurprised ? 53 : 54}
            rx={isSurprised ? 6 : 5}
            ry={isSurprised ? 8 : 6}
            fill="#FFFFFF"
          />

          

          {/* Pupilas */}
          <circle cx="50" cy="55" r="3" fill="#171717" />
          <circle cx="72" cy="55" r="3" fill="#171717" />

          {/* Brilho dos olhos */}
          <circle cx="51" cy="53.5" r="1" fill="#FFFFFF" />
          <circle cx="73" cy="53.5" r="1" fill="#FFFFFF" />
        </>
      )}

      {/* Sobrancelhas */}
      {expression === 'confused' && (
        <>
          <path
            d="M43 44 L54 41"
            stroke="#38251D"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M66 42 L77 45"
            stroke="#38251D"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      )}

      {expression === 'angry' && (
        <>
          <path
            d="M42 43 L55 48"
            stroke="#38251D"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M65 48 L78 43"
            stroke="#38251D"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </>
      )}

      {expression === 'surprised' && (
        <>
          <path
            d="M43 43 Q49 39 55 43"
            fill="none"
            stroke="#38251D"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M65 43 Q71 39 77 43"
            fill="none"
            stroke="#38251D"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </>
      )}

      {/* Boca feliz */}
      {expression === 'happy' && (
        <path
          d="M49 68 Q60 81 71 68"
          fill="none"
          stroke="#713D36"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}

      {/* Boca surpresa */}
      {expression === 'surprised' && (
        <ellipse
          cx="60"
          cy="70"
          rx="5"
          ry="7"
          fill="#713D36"
          stroke="#572D29"
          strokeWidth="1.5"
        />
      )}

      {/* Boca maliciosa */}
      {expression === 'sly' && (
        <path
          d="M50 69 Q61 75 72 65"
          fill="none"
          stroke="#713D36"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}

      {/* Boca de gargalhada */}
      {expression === 'laughing' && (
        <g>
          <path
            d="M46 66 Q60 89 74 66 Q60 72 46 66 Z"
            fill="#713D36"
            stroke="#572D29"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Dentes superiores */}
          <path
            d="M51 68 Q60 73 69 68 L67 73 Q60 76 53 73 Z"
            fill="#FFFFFF"
          />
          {/* Língua */}
          <path
            d="M54 79 Q60 75 66 79 Q63 84 60 84 Q57 84 54 79 Z"
            fill="#E87583"
          />
        </g>
      )}

      {/* Boca confusa */}
      {expression === 'confused' && (
        <path
          d="M51 71 Q58 65 68 71"
          fill="none"
          stroke="#713D36"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}

      {/* Boca brava: agora sempre visível */}
      {expression === 'angry' && (
        <path
          d="M49 74 Q60 64 71 74"
          fill="none"
          stroke="#713D36"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      )}

      {/* Óculos */}
      {glasses && (
        <g
          fill="none"
          stroke="#20172D"
          strokeWidth="2.5"
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
