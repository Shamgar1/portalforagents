import { ClientRecord } from "@/lib/types";

export const mockClients: ClientRecord[] = [
  {
    id: "client-1",
    clientName: "Noam Haddad",
    leadStatus: "New",
    loanAmount: 250000,
    expectedCommission: 5000,
    createdAt: "2026-04-10T08:30:00.000Z",
    assignedAgentId: "agent-1",
    mondayItemId: "monday-1001"
  },
  {
    id: "client-2",
    clientName: "Maya Azulay",
    leadStatus: "In Review",
    loanAmount: 420000,
    expectedCommission: 8400,
    createdAt: "2026-04-11T09:45:00.000Z",
    assignedAgentId: "agent-1",
    mondayItemId: "monday-1002"
  },
  {
    id: "client-3",
    clientName: "Daniel Ben-David",
    leadStatus: "Approved",
    loanAmount: 560000,
    expectedCommission: 11200,
    createdAt: "2026-04-12T12:15:00.000Z",
    assignedAgentId: "agent-2",
    mondayItemId: "monday-1003"
  },
  {
    id: "client-4",
    clientName: "Roni Mizrahi",
    leadStatus: "Funded",
    loanAmount: 310000,
    expectedCommission: 6200,
    createdAt: "2026-04-13T15:20:00.000Z",
    assignedAgentId: "agent-2",
    mondayItemId: "monday-1004"
  }
];
