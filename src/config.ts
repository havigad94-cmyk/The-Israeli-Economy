// Where "report a mistake" sends people when the feedback service can't be reached.
export const REPORT_URL = "https://github.com/havigad94-cmyk/The-Israeli-Economy/issues/new";

// Reader feedback is stored in Supabase (project "israeli-economy-map", table public.feedback).
// The publishable key can only insert rows: row-level security blocks reading, editing and deleting.
// Read the messages at https://supabase.com/dashboard/project/nnfoxlxaijlhsjdtpvdi/editor
export const FEEDBACK = {
  url: "https://nnfoxlxaijlhsjdtpvdi.supabase.co",
  key: "sb_publishable_jPPlg9tmf1LXSgqx9NM1HQ_u53YBQLx",
  fallback: REPORT_URL,
};
