import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import type { Patio, PatioSubmission } from "./types";

const SUBMISSIONS_PATH = path.join(process.cwd(), "data", "user-submissions.json");

function ensureFile() {
  const dir = path.dirname(SUBMISSIONS_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(SUBMISSIONS_PATH)) writeFileSync(SUBMISSIONS_PATH, "[]");
}

export function loadUserSubmissions(): Patio[] {
  ensureFile();
  try {
    const raw = readFileSync(SUBMISSIONS_PATH, "utf-8");
    const submissions: PatioSubmission[] = JSON.parse(raw);
    return submissions.map((s, i) => ({
      id: `user-${i}-${s.name.replace(/\s+/g, "-").toLowerCase()}`,
      name: s.name,
      address: s.address,
      lat: s.lat,
      lng: s.lng,
      source: "user-submitted" as const,
      type: s.type,
      rooftop: s.type === "rooftop",
    }));
  } catch {
    return [];
  }
}

const MAX_SUBMISSIONS = 500;

export function saveSubmission(submission: PatioSubmission): boolean {
  ensureFile();
  const raw = readFileSync(SUBMISSIONS_PATH, "utf-8");
  const submissions: PatioSubmission[] = JSON.parse(raw);
  if (submissions.length >= MAX_SUBMISSIONS) return false;
  submissions.push(submission);
  writeFileSync(SUBMISSIONS_PATH, JSON.stringify(submissions, null, 2));
  return true;
}
