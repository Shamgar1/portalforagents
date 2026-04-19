import { ClientRecord, LeadStatus, ManualLeadInput, SessionUser } from "@/lib/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export interface ClientRepository {
  listClientsForUser(user: SessionUser): Promise<ClientRecord[]>;
  createManualLead(input: ManualLeadInput): Promise<void>;
}

type ClientRow = {
  id: string;
  client_name: string;
  status: LeadStatus;
  loan_amount: number;
  expected_commission: number;
  agent_id: string;
  monday_item_id: string | null;
  created_at: string;
  profiles: { full_name: string } | { full_name: string }[] | null;
};

class SupabaseClientRepository implements ClientRepository {
  async listClientsForUser(user: SessionUser) {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("clients")
      .select(
        "id, client_name, status, loan_amount, expected_commission, agent_id, monday_item_id, created_at, profiles:agent_id (full_name)"
      )
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data as ClientRow[]).map((client) => {
      const profile =
        Array.isArray(client.profiles) ? client.profiles[0] ?? null : client.profiles;

      return {
        id: client.id,
        clientName: client.client_name,
        leadStatus: client.status,
        loanAmount: client.loan_amount,
        expectedCommission: client.expected_commission,
        assignedAgentId: client.agent_id,
        assignedAgentName:
          user.role === "admin" ? profile?.full_name ?? client.agent_id : undefined,
        mondayItemId: client.monday_item_id ?? undefined,
        createdAt: client.created_at
      };
    });
  }

  async createManualLead(input: ManualLeadInput) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.from("clients").insert({
      client_name: input.clientName,
      status: input.leadStatus,
      loan_amount: input.loanAmount,
      expected_commission: input.expectedCommission,
      agent_id: input.assignedAgentId,
      source_board: "manual",
      referring_agent_text: input.referringAgentText || null,
    });

    if (error) {
      throw new Error(error.message);
    }
  }
}

export function getClientRepository(): ClientRepository {
  return new SupabaseClientRepository();
}
