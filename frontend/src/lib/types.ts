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
  icon?: string | null;
  color?: string | null;
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
  skipped_repeats?: number;
  requested?: number;
  watched?: number;
}

export interface TranscriptLine {
  start: number;
  end: number;
  text: string;
  p: number;
}

export interface EpisodeDetail extends EpisodeSummary {
  script: string | null;
  sources: Source[] | null;
  research_log: ResearchStep[] | null;
  transcript?: TranscriptLine[] | null;
  emailed_at: string | null;
}

export interface Briefing {
  id: string;
  topic: string;
  delivery_time: string;
  timezone: string;
  voice: string;
  language: string;
  email_enabled: boolean;
  trusted_domains: string[];
  blocked_domains: string[];
  region: string | null;
  lookback: "day" | "week";
  finance_mode: boolean;
  watch_urls: string[];
  interests: string[];
  icon: string | null;
  color: string | null;
  pending_links: number;
  is_active: boolean;
  next_run_at: string;
  created_at: string;
  latest_episode: EpisodeSummary | null;
}

export interface Voice {
  id: string;
  label: string;
  languages: string[];
}

export const IN_PROGRESS: EpisodeStatus[] = [
  "queued",
  "researching",
  "writing",
  "synthesizing",
];
