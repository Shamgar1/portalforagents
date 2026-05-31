import "server-only";

import type {
  ClientRepository,
  MondayOpportunityUpsertRow,
} from "@/lib/data/client-repository";
import { getClientRepository } from "@/lib/data/client-repository";
import { mapProfileRow } from "@/lib/auth/user";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getMondayOpportunitySyncEnv, type MondayOpportunitySyncEnv } from "@/lib/integrations/monday/env";
import {
  getColumnDateYmd,
  getColumnDisplayText,
  getColumnMoney,
  getColumnText,
  getMondayService,
} from "@/lib/integrations/monday/service";
import type {
  MondayFormulaColumnDebugSample,
  MondayOpportunityItem,
  MondayOpportunitySyncResult,
  MondayOpportunitySyncRow,
} from "@/lib/integrations/monday/types";
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
  syncFromMondayOpportunities(options?: {
    demoItemLimit?: number;
  }): Promise<MondayOpportunitySyncResult>;
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

type SyncProfile = {
  id: string;
  fullName: string;
};

const DEAL_STAGE_COLUMN_ID = "deal_stage";

export function normalizePersonName(name: string): string {
  return name
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/([a-z])([\u0590-\u05ff])/g, "$1 $2")
    .replace(/([\u0590-\u05ff])([a-z])/g, "$1 $2")
    .replace(/["'`´׳״.,;:!?()[\]{}<>]+/g, " ")
    .replace(/[-_/\\|+]+/g, " ")
    .replace(/\s+/g, " ");
}

function normalizePersonNameCompact(name: string): string {
  return normalizePersonName(name).replace(/\s+/g, "");
}

export function mapMondayOpportunityToSyncCandidate(
  item: MondayOpportunityItem,
  syncEnv: MondayOpportunitySyncEnv
): MondayOpportunitySyncRow {
  const {
    loanAmountColumnId,
    expectedCommissionColumnId,
    masterPaymentColumnId,
    referringAgentColumnId,
    dealCreationDateColumnId,
    agentNumberColumnId,
    paymentToAgentNumberColumnId,
  } = syncEnv;

  const expectedCommission = getColumnMoney(item, expectedCommissionColumnId).parsed;
  const masterPayment = getColumnMoney(item, masterPaymentColumnId).parsed;
  const paymentToAgentNumber = getColumnMoney(item, paymentToAgentNumberColumnId).parsed;

  return {
    mondayItemId: item.id,
    clientName: item.name.trim(),
    leadStatus: getColumnText(item, DEAL_STAGE_COLUMN_ID) ?? "",
    loanAmount: loanAmountColumnId
      ? getColumnMoney(item, loanAmountColumnId).parsed
      : 0,
    expectedCommission,
    masterPayment,
    agentNumber: agentNumberColumnId
      ? getColumnDisplayText(item, agentNumberColumnId)?.trim() || undefined
      : undefined,
    paymentToAgentNumber,
    referringAgentText: getColumnDisplayText(item, referringAgentColumnId),
    dealCreatedAt: getColumnDateYmd(item, dealCreationDateColumnId),
    sourceBoard: "opportunities",
  };
}

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

  async syncFromMondayOpportunities(options?: {
    demoItemLimit?: number;
  }): Promise<MondayOpportunitySyncResult> {
    const startedAt = Date.now();
    const env = getMondayOpportunitySyncEnv();
    const requestedColumnIds = [
      ...new Set(
        [
          "deal_stage",
          env.dealCreationDateColumnId,
          env.loanAmountColumnId,
          env.expectedCommissionColumnId,
          env.masterPaymentColumnId,
          env.referringAgentColumnId,
          env.agentNumberColumnId,
          env.paymentToAgentNumberColumnId,
        ].filter((x): x is string => Boolean(x))
      ),
    ];
    console.log("REF COLUMN", env.referringAgentColumnId);
    console.log("REQUESTED COLUMNS", requestedColumnIds);

    const syncFetch = await getMondayService().getOpportunityItemsForSync({
      maxItems: options?.demoItemLimit,
    });
    const mondayItems = syncFetch.items;
    const fetchMeta = syncFetch.meta;

    const profiles = await this.listSyncProfiles();
    const upsertRows: MondayOpportunityUpsertRow[] = [];
    const unmatchedItems: MondayOpportunitySyncRow[] = [];
    const lastSyncedAt = new Date().toISOString();
    const profilesByName = new Map<string, SyncProfile>();
    const sampleReferringAgents: string[] = [];
    const sampleMasterPayments: number[] = [];
    const formulaColumnDebugSamples: MondayFormulaColumnDebugSample[] = [];

    const pushReferringSample = (referringAgentText: string | undefined) => {
      const t = referringAgentText?.trim();
      if (!t || sampleReferringAgents.length >= 20) {
        return;
      }
      sampleReferringAgents.push(t);
      console.log("SAMPLE REF", referringAgentText);
    };

    const pushMasterPaymentSample = (masterPayment: number | undefined) => {
      if (
        masterPayment == null ||
        !Number.isFinite(masterPayment) ||
        masterPayment === 0 ||
        sampleMasterPayments.length >= 20
      ) {
        return;
      }
      sampleMasterPayments.push(masterPayment);
    };

    for (const profile of profiles) {
      profilesByName.set(normalizePersonName(profile.fullName), profile);
      profilesByName.set(normalizePersonNameCompact(profile.fullName), profile);
    }

    for (const item of mondayItems) {
      const candidate = mapMondayOpportunityToSyncCandidate(item, env);

      pushReferringSample(candidate.referringAgentText);
      pushMasterPaymentSample(candidate.masterPayment);

      if (formulaColumnDebugSamples.length < 5) {
        const master = getColumnMoney(item, env.masterPaymentColumnId);
        const payment = getColumnMoney(item, env.paymentToAgentNumberColumnId);
        const sample: MondayFormulaColumnDebugSample = {
          itemId: item.id,
          rawMasterPayment: master.raw,
          parsedMasterPayment: master.parsed,
          rawPaymentToAgentNumber: payment.raw,
          parsedPaymentToAgentNumber: payment.parsed,
        };
        formulaColumnDebugSamples.push(sample);
        console.log("[Monday sync] formula column sample", {
          [`raw ${env.masterPaymentColumnId}`]: sample.rawMasterPayment,
          parsed_master_payment: sample.parsedMasterPayment,
          [`raw ${env.paymentToAgentNumberColumnId}`]: sample.rawPaymentToAgentNumber,
          parsed_payment_to_agent_number: sample.parsedPaymentToAgentNumber,
        });
      }

      const normalizedAgentName = normalizePersonName(candidate.referringAgentText ?? "");
      const normalizedAgentNameCompact = normalizePersonNameCompact(
        candidate.referringAgentText ?? ""
      );
      const matchedProfile = normalizedAgentName
        ? profilesByName.get(normalizedAgentName) ??
          profilesByName.get(normalizedAgentNameCompact)
        : undefined;

      if (!matchedProfile) {
        unmatchedItems.push(candidate);
      }

      upsertRows.push({
        mondayItemId: candidate.mondayItemId,
        clientName: candidate.clientName,
        leadStatus: candidate.leadStatus,
        loanAmount: candidate.loanAmount,
        expectedCommission: candidate.expectedCommission,
        masterPayment: candidate.masterPayment,
        paymentToAgentNumber: candidate.paymentToAgentNumber,
        agentNumber: candidate.agentNumber,
        assignedAgentId: matchedProfile?.id ?? null,
        referringAgentText: candidate.referringAgentText,
        dealCreatedAt: candidate.dealCreatedAt ?? null,
        sourceBoard: candidate.sourceBoard,
        lastSyncedAt,
      });
    }

    await this.repository.upsertMondayOpportunities(upsertRows);

    const distinctReferringAgents = [
      ...new Set(
        upsertRows
          .map((r) => r.referringAgentText?.trim())
          .filter((t): t is string => Boolean(t))
      ),
    ].sort((a, b) => a.localeCompare(b, "he"));

    const totalClientsInDatabaseAfterSync = await this.repository.countAllClients();
    const durationMs = Date.now() - startedAt;

    return {
      referringAgentColumnId: env.referringAgentColumnId,
      masterPaymentColumnId: env.masterPaymentColumnId,
      paymentToAgentNumberColumnId: env.paymentToAgentNumberColumnId,
      agentNumberColumnId: env.agentNumberColumnId,
      requestedColumnIds,
      totalFetched: mondayItems.length,
      syncedCount: upsertRows.length,
      unmatchedCount: unmatchedItems.length,
      unmatchedItems,
      sampleReferringAgents,
      sampleMasterPayments,
      formulaColumnDebugSamples,
      sampleAgentNumberRawColumns: [],
      sampleParsedAgentNumbers: [],
      sampleUpsertAgentNumbers: [],
      distinctReferringAgents,
      boardItemCount: fetchMeta.boardItemCount,
      pagesFetched: fetchMeta.pagesFetched,
      hasMore: fetchMeta.hasMore,
      lastCursor: fetchMeta.lastCursor,
      stoppedReason: fetchMeta.stoppedReason,
      durationMs,
      totalClientsInDatabaseAfterSync,
    };
  }

  private async listSyncProfiles(): Promise<SyncProfile[]> {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name")
      .order("full_name", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((profile) => ({
      id: profile.id,
      fullName: profile.full_name,
    }));
  }
}

export function getClientService(): ClientService {
  return new DefaultClientService(getClientRepository());
}
