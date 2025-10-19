export interface Player {
  name: string;
  score: number;
}

export interface BoundingBox {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

export interface GameState {
  players: Player[];
  roundActive: boolean;
  answerPosition: BoundingBox | null;
}

export interface CachedImageData {
  url: string;
  bbox: BoundingBox;
}
