export type EpisodeStatus =
  "queued" | "researching" | "writing" | "synthesizing" | "ready" | "failed";

export interface EpisodeSummary {
  id: string;
  briefing_id: string;
  topic: string;
  title: string | null;
  status: EpisodeStatus;
  trigger: "scheduled" | "manual";
  scheduled_for: string;
  created_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  error: string | null;
}

export interface Source {
  id: string;
  title: string;
  url: string;
  published: string | null;
}

export interface ResearchStep {
  tool: string;
  query?: string;
  recency?: string;
  hits?: number;
  source?: string;
  chars?: number;
  findings?: number;
  note?: string;
}

export interface EpisodeDetail extends EpisodeSummary {
  script: string | null;
  sources: Source[] | null;
  research_log: ResearchStep[] | null;
  emailed_at: string | null;
}

export interface Briefing {
  id: string;
  topic: string;
  delivery_time: string;
  timezone: string;
  voice: string;
  is_active: boolean;
  next_run_at: string;
  created_at: string;
  latest_episode: EpisodeSummary | null;
}

export interface Voice {
  id: string;
  label: string;
  language: string;
}

export const IN_PROGRESS: EpisodeStatus[] = [
  "queued",
  "researching",
  "writing",
  "synthesizing",
];
