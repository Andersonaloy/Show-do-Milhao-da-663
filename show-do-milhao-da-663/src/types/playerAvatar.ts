export type HairStyle =
  | 'short-curly'
  | 'long-curly'
  | 'short-straight'
  | 'long-straight'
  | 'bald';

export type FaceExpression =
  | 'happy'
  | 'surprised'
  | 'sly'
  | 'laughing'
  | 'confused'
  | 'angry';

export interface AvatarAppearance {
  skinColor: string;
  shirtColor: string;
  hairColor: string;
  hairStyle: HairStyle;
  expression: FaceExpression;
  glasses: boolean;
}

export const defaultAvatar: AvatarAppearance = {
  skinColor: '#D99A6C',
  shirtColor: '#7543C4',
  hairColor: '#38251D',
  hairStyle: 'bald',
  expression: 'happy',
  glasses: false,
};