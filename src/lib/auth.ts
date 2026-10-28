import type { Dataset } from "./types";

// Single-user stub. When accounts arrive, resolve the user from the session
// here and the rest of the app keeps working: ownership and edit rights are
// already recorded on each Aigis.
export type User = { id: string; name: string };
export const CURRENT_USER: User = { id: "owner", name: "Nik" };

export async function currentUser(): Promise<User> {
  return CURRENT_USER;
}

export function canEdit(ds: Pick<Dataset, "owner" | "editors">, user: User | null): boolean {
  if (!user) return false;
  if (!ds.owner) return true; // legacy or sample data with no owner yet
  return ds.owner === user.id || (ds.editors ?? []).includes(user.id);
}
