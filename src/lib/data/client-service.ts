import "server-only";

import type { ClientRepository } from "@/lib/data/client-repository";
import { getClientRepository } from "@/lib/data/client-repository";
import { mapProfileRow } from "@/lib/auth/user";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ClientRecord, ManualLeadInput, SessionUser, UserProfile } from "@/lib/types";

export type ClientMvpDataSource = "supabase";

export type MondayOpportunitySyncCandidate = {
  itemId: string;
  clientName: string;
  referringAgentText?: string;
};

export type MondayOpportunityAgentMatchPlan = {
  strategy: "free-text";
  sourceField: "referring agent";
  targetField: "profiles.full_name";
  unmatchedBehavior: "leave-for-manual-review";
};

export type MondayOpportunitySyncPlan = {
  source: "monday";
  board: "opportunities";
  status: "planned";
  candidateShape: MondayOpportunitySyncCandidate;
  agentMatch: MondayOpportunityAgentMatchPlan;
};

export type ClientIntegrationState = {
  mvpDataSource: ClientMvpDataSource;
  plannedMondaySync: MondayOpportunitySyncPlan;
};

export interface ClientService {
  listClientsForUser(user: SessionUser): Promise<ClientRecord[]>;
  listAssignableAgents(): Promise<UserProfile[]>;
  createManualLead(input: ManualLeadInput): Promise<void>;
  getIntegrationState(): ClientIntegrationState;
  syncFromMondayOpportunities(): Promise<never>;
}

const plannedMondaySync: MondayOpportunitySyncPlan = {
  source: "monday",
  board: "opportunities",
  status: "planned",
  candidateShape: {
    itemId: "monday-item-id",
    clientName: "Opportunity name",
    referringAgentText: "Referring agent free-text field",
  },
  agentMatch: {
    strategy: "free-text",
    sourceField: "referring agent",
    targetField: "profiles.full_name",
    unmatchedBehavior: "leave-for-manual-review",
  },
};

class DefaultClientService implements ClientService {
  constructor(private readonly repository: ClientRepository) {}

  async listClientsForUser(user: SessionUser) {
    return this.repository.listClientsForUser(user);
  }

  async listAssignableAgents(): Promise<UserProfile[]> {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .order("full_name", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map(mapProfileRow);
  }

  async createManualLead(input: ManualLeadInput) {
    return this.repository.createManualLead(input);
  }

  getIntegrationState(): ClientIntegrationState {
    return {
      mvpDataSource: "supabase",
      plannedMondaySync,
    };
  }

  async syncFromMondayOpportunities(): Promise<never> {
    throw new Error(
      "Monday opportunities sync is not implemented yet. Add the board field mapping, resolve the free-text referring agent against Supabase profiles, and then persist the resulting client records here."
    );
  }
}

export function getClientService(): ClientService {
  return new DefaultClientService(getClientRepository());
}
