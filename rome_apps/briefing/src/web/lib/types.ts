export interface ScoutResultDto {
  id: string;
  scoutId: string;
  scoutTitle: string;
  status: "pending" | "completed" | "skipped" | "failed";
  content: string | null;
  error: string | null;
  trigger: string;
  consumedAt: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface ScoutDto {
  id: string;
  title: string;
  prompt: string;
  intervalMinutes: number;
  enabled: boolean;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
  latestResult: ScoutResultDto | null;
}

export interface BriefDto {
  id: string;
  kind: "morning" | "evening" | "test";
  status: "pending" | "completed" | "failed";
  content: string | null;
  error: string | null;
  channel: string | null;
  delivered: boolean;
  deliveryError: string | null;
  scoutResultCount: number;
  startedAt: string;
  finishedAt: string | null;
}

export interface SettingsDto {
  channel: string;
  whatsappThreadId: string;
  emailTo: string;
  timezone: string;
  morningEnabled: boolean;
  morningTime: string;
  eveningEnabled: boolean;
  eveningTime: string;
}

export interface IntervalOption {
  minutes: number;
  label: string;
}

export interface StateDto {
  scouts: ScoutDto[];
  briefs: BriefDto[];
  settings: SettingsDto;
  meta: {
    intervalOptions: IntervalOption[];
    channels: string[];
  };
}
