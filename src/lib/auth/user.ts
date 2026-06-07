import { SessionUser, UserProfile } from "@/lib/types";

type ProfileRow = {
  id: string;
  full_name: string;
  role: "agent" | "admin" | "master" | "agent_number";
  agent_number?: string | null;
};

export function mapProfileRow(profile: ProfileRow): UserProfile {
  return {
    id: profile.id,
    fullName: profile.full_name,
    role: profile.role,
    agentNumber: profile.agent_number?.trim() || undefined,
  };
}

export function buildSessionUser(email: string, profile: UserProfile): SessionUser {
  return {
    id: profile.id,
    email,
    name: profile.fullName,
    role: profile.role,
    agentNumber: profile.agentNumber,
  };
}
