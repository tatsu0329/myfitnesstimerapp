export type Screen = "home" | "history";
export type BodyPart = "chest" | "arm" | "leg" | "shoulder" | "abs" | "back";

export interface TimerSettings {
  workoutTime: number; // 修行時間（秒）
  restTime: number; // 静寂時間（秒）
  soundOn: boolean; // 鐘の音の有効/無効
  vibrateOn: boolean; // 振動の有効/無効
  autoStart: boolean; // 自動開始の有効/無効
  theme: "light" | "dark" | "system"; // テーマ設定
}

export interface WorkoutHistoryItem {
  id?: string;
  date: string; // 修行日
  bodyPart: BodyPart; // 修行部位（現在は固定値）
  sets: number; // 修行回数
  totalTime: number; // 総修行時間（秒）
}
