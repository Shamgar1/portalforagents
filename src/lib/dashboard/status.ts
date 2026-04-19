const PAYABLE_STATUS = "בוצע ושולם";

const LEGACY_STATUS_LABELS: Record<string, string> = {
  New: "חדש",
  "In Review": "בבדיקה",
  Approved: "אושר",
  Funded: "מומן"
};

export function getLeadStatusLabel(status: string) {
  return LEGACY_STATUS_LABELS[status] ?? status;
}

export function isCommissionEligible(status: string) {
  return status === PAYABLE_STATUS;
}

export function getLeadStatusBadgeClass(status: string) {
  switch (status) {
    case "New":
    case "חדש":
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
    case "In Review":
    case "בבדיקה":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
    case "Approved":
    case "אושר":
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
    case "Funded":
    case "מומן":
      return "bg-green-50 text-green-700 ring-1 ring-green-200";
    case PAYABLE_STATUS:
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  }
}

export function getCommissionEligibilityBadge(status: string) {
  if (isCommissionEligible(status)) {
    return {
      label: "זכאי לתשלום",
      className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
    };
  }

  return {
    label: "עדיין לא זכאי",
    className: "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
  };
}
