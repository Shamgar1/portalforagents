import { SessionUser, UserProfile } from "@/lib/types";

type ProfileRow = {
  id: string;
  full_name: string;
  role: "agent" | "admin";
};

export function mapProfileRow(profile: ProfileRow): UserProfile {
  return {
    id: profile.id,
    fullName: profile.full_name,
    role: profile.role
  };
}

export function buildSessionUser(email: string, profile: UserProfile): SessionUser {
  return {
    id: profile.id,
    email,
    name: profile.fullName,
    role: profile.role
  };
}
