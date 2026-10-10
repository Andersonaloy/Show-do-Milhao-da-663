export interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
}

export interface QuizDefinition {
  id: string;
  title: string;
  hostName: string;
  questionTime: number;
  questions: QuizQuestion[];
  updatedAt: string;
}