"use server";

import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { getClientService } from "@/lib/data/client-service";
import { isSupabaseConfigured } from "@/lib/supabase/env";

function parseMoney(value: FormDataEntryValue | null) {
  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : NaN;
}

export async function createManualLeadAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "admin") {
    throw new Error("Only admins can add leads manually.");
  }

  const clientName = String(formData.get("clientName") ?? "").trim();
  const leadStatus = String(formData.get("leadStatus") ?? "חדש").trim();
  const assignedAgentId = String(formData.get("assignedAgentId") ?? "").trim();
  const referringAgentText = String(formData.get("referringAgentText") ?? "").trim();
  const loanAmount = parseMoney(formData.get("loanAmount"));
  const expectedCommission = parseMoney(formData.get("expectedCommission"));

  if (!clientName) {
    throw new Error("Client name is required.");
  }

  if (!assignedAgentId) {
    throw new Error("Assigned agent is required.");
  }

  if (Number.isNaN(loanAmount) || loanAmount < 0) {
    throw new Error("Loan amount must be a valid number.");
  }

  if (Number.isNaN(expectedCommission) || expectedCommission < 0) {
    throw new Error("Expected commission must be a valid number.");
  }

  const clientService = getClientService();
  await clientService.createManualLead({
    clientName,
    leadStatus,
    loanAmount,
    expectedCommission,
    assignedAgentId,
    referringAgentText: referringAgentText || undefined,
  });

  redirect("/dashboard");
}
