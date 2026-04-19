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
  createdAt: string;
  assignedAgentId: string;
  assignedAgentName?: string;
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
