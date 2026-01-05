
export interface MemeTemplate {
  id: string;
  name: string;
  url: string;
}

export interface MemeText {
  id: string;
  content: string;
  x: number;
  y: number;
  fontSize: number;
}

export interface AnalysisResult {
  description: string;
  vibe: string;
  tags: string[];
}
