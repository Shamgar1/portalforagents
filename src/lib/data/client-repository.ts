import { ClientRecord, LeadStatus, ManualLeadInput, SessionUser } from "@/lib/types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const UPSERT_CHUNK_SIZE = 200;

export type MondayOpportunityUpsertRow = {
  mondayItemId: string;
  clientName: string;
  leadStatus: string;
  loanAmount: number;
  expectedCommission: number;
  assignedAgentId: string | null;
  referringAgentText?: string;
  /** YYYY-MM-DD from Monday deal_creation_date → public.clients.deal_created_at */
  dealCreatedAt?: string | null;
  sourceBoard: string;
  lastSyncedAt: string;
};

export interface ClientRepository {
  listClientsForUser(user: SessionUser): Promise<ClientRecord[]>;
  createManualLead(input: ManualLeadInput): Promise<void>;
  upsertMondayOpportunities(rows: MondayOpportunityUpsertRow[]): Promise<void>;
  countAllClients(): Promise<number>;
}

type ClientRow = {
  id: string;
  client_name: string;
  status: LeadStatus;
  loan_amount: number;
  expected_commission: number;
  agent_id: string | null;
  referring_agent_text: string | null;
  monday_item_id: string | null;
  deal_created_at?: string | null;
  deal_creation_date?: string | null;
  created_at: string;
  profiles: { full_name: string } | { full_name: string }[] | null;
};

class SupabaseClientRepository implements ClientRepository {
  async listClientsForUser(user: SessionUser) {
    const supabase = await getSupabaseServerClient();
    const data = await this.listClientRows(supabase, user);

    return (data as ClientRow[]).map((client) => {
      const profile =
        Array.isArray(client.profiles) ? client.profiles[0] ?? null : client.profiles;

      const dealCreatedAt =
        client.deal_created_at ?? client.deal_creation_date ?? null;

      return {
        id: client.id,
        clientName: client.client_name,
        leadStatus: client.status,
        loanAmount: client.loan_amount,
        expectedCommission: client.expected_commission,
        assignedAgentId: client.agent_id ?? "",
        assignedAgentName:
          user.role === "admin" ? profile?.full_name ?? undefined : undefined,
        referringAgentText: client.referring_agent_text ?? undefined,
        mondayItemId: client.monday_item_id ?? undefined,
        createdAt: client.created_at,
        dealCreatedAt: dealCreatedAt ?? undefined,
      };
    });
  }

  private async listClientRows(
    supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
    user: SessionUser
  ): Promise<ClientRow[]> {
    const selectAttempts = [
      "id, client_name, status, loan_amount, expected_commission, agent_id, referring_agent_text, monday_item_id, deal_created_at, deal_creation_date, created_at, profiles:agent_id (full_name)",
      "id, client_name, status, loan_amount, expected_commission, agent_id, referring_agent_text, monday_item_id, deal_creation_date, created_at, profiles:agent_id (full_name)",
      "id, client_name, status, loan_amount, expected_commission, agent_id, referring_agent_text, monday_item_id, created_at, profiles:agent_id (full_name)",
    ];

    const runSelect = (select: string) => {
      let q = supabase.from("clients").select(select).order("created_at", { ascending: false });
      if (user.role !== "admin") {
        q = q.eq("agent_id", user.id);
      }
      return q;
    };

    let lastError: string | undefined;

    for (const select of selectAttempts) {
      const result = await runSelect(select);
      if (!result.error) {
        return ((result.data ?? []) as unknown) as ClientRow[];
      }
      lastError = result.error.message;
      const recoverable =
        lastError.includes("deal_created_at") || lastError.includes("deal_creation_date");
      if (!recoverable) {
        throw new Error(lastError);
      }
    }

    throw new Error(lastError ?? "Failed to load clients");
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

  async upsertMondayOpportunities(rows: MondayOpportunityUpsertRow[]) {
    if (!rows.length) {
      return;
    }

    const supabase = await getSupabaseServerClient();
    const totalChunks = Math.ceil(rows.length / UPSERT_CHUNK_SIZE);

    for (let offset = 0; offset < rows.length; offset += UPSERT_CHUNK_SIZE) {
      const chunk = rows.slice(offset, offset + UPSERT_CHUNK_SIZE);
      const chunkIndex = Math.floor(offset / UPSERT_CHUNK_SIZE) + 1;
      console.log(
        `[clients upsert] chunk ${chunkIndex}/${totalChunks} size=${chunk.length} offset=${offset}`
      );

      const { error } = await supabase.from("clients").upsert(
        chunk.map((row) => ({
          client_name: row.clientName,
          status: row.leadStatus,
          loan_amount: row.loanAmount,
          expected_commission: row.expectedCommission,
          agent_id: row.assignedAgentId,
          monday_item_id: row.mondayItemId,
          source_board: row.sourceBoard,
          referring_agent_text: row.referringAgentText || null,
          deal_created_at: row.dealCreatedAt ?? null,
          last_synced_at: row.lastSyncedAt,
        })),
        {
          onConflict: "monday_item_id",
        }
      );

      if (error) {
        const detail = [error.message, error.code, error.details, error.hint]
          .filter(Boolean)
          .join(" — ");
        throw new Error(
          `Supabase upsert failed at chunk ${chunkIndex}/${totalChunks} (offset ${offset}): ${detail}`
        );
      }
    }
  }

  async countAllClients(): Promise<number> {
    const supabase = await getSupabaseServerClient();
    const { count, error } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true });

    if (error) {
      throw new Error(error.message);
    }

    return count ?? 0;
  }
}

export function getClientRepository(): ClientRepository {
  return new SupabaseClientRepository();
}
