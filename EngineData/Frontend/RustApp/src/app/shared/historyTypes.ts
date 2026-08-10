export type HistoryScope = "recent" | "saved";
export type HistoryEntryType = "all" | "meeting" | "text";

export type HistoryTurn = {
  sequence: number;
  lane: "you" | "incoming" | string;
  source_text: string;
  translated_text: string;
  delivery_state: string | null;
  created_unix_ms: number;
};

export type HistoryEntry = {
  schema_version: number;
  entry_id: string;
  entry_type: "meeting" | "text" | string;
  title: string;
  created_unix_ms: number;
  updated_unix_ms: number;
  saved_unix_ms: number | null;
  duration_ms: number | null;
  interrupted: boolean;
  dropped_turn_count: number;
  source_language: string;
  target_language: string;
  tone: string;
  mode: string;
  text_source: string | null;
  text_target: string | null;
  turns: HistoryTurn[];
};

export type HistorySummary = Pick<
  HistoryEntry,
  | "entry_id"
  | "entry_type"
  | "title"
  | "created_unix_ms"
  | "updated_unix_ms"
  | "saved_unix_ms"
  | "duration_ms"
  | "interrupted"
  | "source_language"
  | "target_language"
> & {
  snippet: string;
};

export type HistoryWriteResult = {
  ok: boolean;
  entry_id: string;
  message: string;
};

export type HistoryClearResult = {
  ok: boolean;
  removed_count: number;
  message: string;
};
