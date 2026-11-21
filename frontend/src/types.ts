export type Page =
  | "Overview"
  | "My prep plan"
  | "Practice room"
  | "Question bank"
  | "My progress";
export type Profile = {
  name: string;
  role: string;
  company: string;
  interview_date: string;
  experience: string;
  confidence: number;
  minutes_per_day: number;
  focus: string[];
  cv: string;
  job_description: string;
  consent_ai: boolean;
};
export type Question = {
  id: string;
  title: string;
  category: string;
  skill: string;
  difficulty: string;
  minutes: number;
  description: string;
  hint: string;
  guide: string;
};
export type Task = {
  id: string;
  title: string;
  question_id: string;
  category: string;
  skill: string;
  minutes: number;
  date: string;
  completed: boolean;
  reason: string;
};
export type Skill = {
  name: string;
  score: number;
  samples: number;
  review: string | null;
};
export type Feedback = {
  summary: string;
  strengths: string[];
  improvements: string[];
  follow_up: string;
  evidence: string;
  rubric: Record<string, number>;
  source: string;
};
export type Session = {
  id: string;
  question_id: string;
  question: string;
  skill: string;
  answer: string;
  duration_seconds: number;
  created_at: string;
  feedback: Feedback;
  assessment: boolean;
};
export type Workspace = {
  profile: Profile;
  skills: Skill[];
  tasks: Task[];
  sessions: Session[];
  saved_questions: string[];
  custom_questions?: Question[];
  onboarded: boolean;
};
