export type HairStyle = 'short' | 'spiky' | 'curly' | 'long' | 'bald';

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
  hairStyle: 'short',
  expression: 'happy',
  glasses: false,
};