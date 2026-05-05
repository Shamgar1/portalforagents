export type UserRole = "agent" | "admin";

export type AppUser = {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
};

export type SessionUser = Omit<AppUser, "password">;

export type UserProfile = {
  id: string;
  fullName: string;
  role: UserRole;
};

export type LeadStatus = string;

export type ClientRecord = {
  id: string;
  clientName: string;
  leadStatus: LeadStatus;
  loanAmount: number;
  expectedCommission: number;
  /** Row insert time from Supabase (timestamptz). */
  createdAt: string;
  /** Monday deal_creation_date column (YYYY-MM-DD), when synced. */
  dealCreatedAt?: string | null;
  assignedAgentId: string;
  assignedAgentName?: string;
  referringAgentText?: string;
  mondayItemId?: string;
};

export type ManualLeadInput = {
  clientName: string;
  leadStatus: LeadStatus;
  loanAmount: number;
  expectedCommission: number;
  assignedAgentId: string;
  referringAgentText?: string;
};
