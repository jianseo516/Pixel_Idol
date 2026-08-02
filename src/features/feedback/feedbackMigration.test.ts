import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/202608020011_beta_feedback.sql", "utf8");

describe("beta feedback migration", () => {
  it("creates constrained feedback rows and timestamps", () => {
    expect(sql).toMatch(/create table if not exists public\.feedback_reports/i);
    for (const category of ["bug", "suggestion", "image_report", "other"]) expect(sql).toContain(`'${category}'`);
    for (const status of ["new", "reviewing", "resolved", "rejected"]) expect(sql).toContain(`'${status}'`);
    expect(sql).toMatch(/char_length\(content\) between 10 and 2000/i);
    expect(sql).toMatch(/before update on public\.feedback_reports/i);
  });
  it("blocks direct public reads and mutations while allowing RPC submission", () => {
    expect(sql).toMatch(/enable row level security/i);
    expect(sql).toMatch(/revoke all on public\.feedback_reports from public, anon, authenticated/i);
    expect(sql).toMatch(/grant execute on function public\.submit_feedback_report[\s\S]*to anon, authenticated/i);
  });
  it("derives logged-in identity from auth and profiles", () => {
    expect(sql).toMatch(/v_user_id uuid := auth\.uid\(\)/i);
    expect(sql).toMatch(/select nickname into v_nickname from public\.profiles where user_id = v_user_id/i);
    expect(sql).toMatch(/v_user_id := null;[\s\S]*v_nickname := null/i);
  });
  it("enforces database rate limits for users and anonymous clients", () => {
    expect(sql.match(/interval '60 seconds'/gi)).toHaveLength(2);
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toMatch(/where user_id = v_user_id/i);
    expect(sql).toMatch(/where client_id = p_client_id/i);
  });
  it("requires admin checks for list, update, and delete RPCs", () => {
    expect(sql.match(/if not public\.is_current_user_admin\(\)/gi)?.length).toBeGreaterThanOrEqual(4);
    expect(sql).toMatch(/revoke all on function public\.admin_list_feedback_reports.*from public, anon/i);
    expect(sql).toMatch(/revoke all on function public\.admin_update_feedback_report.*from public, anon/i);
    expect(sql).toMatch(/revoke all on function public\.admin_delete_feedback_report.*from public, anon/i);
  });
  it("keeps contact email out of public access paths", () => {
    expect(sql).not.toMatch(/grant select[^;]*to anon/i);
    expect(sql).not.toMatch(/grant select[^;]*to public/i);
  });
});
