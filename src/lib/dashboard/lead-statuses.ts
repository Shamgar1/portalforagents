/** Monday deal_stage values used for dashboard segmentation. */
export const LEAD_STATUS_SUCCESS = "בוצע ושולם";
export const LEAD_STATUS_FAILED = "נסגר ללא הצלחה";

export function isSuccessfulLeadStatus(status: string): boolean {
  return status.trim() === LEAD_STATUS_SUCCESS;
}

export function isFailedLeadStatus(status: string): boolean {
  return status.trim() === LEAD_STATUS_FAILED;
}

/** Failure for summaries: any status text containing the failed-closure phrase (not only exact trim). */
export function isFailedLeadStatusContaining(status: string): boolean {
  return status.includes(LEAD_STATUS_FAILED);
}

export function isInProgressLeadStatus(status: string): boolean {
  if (isSuccessfulLeadStatus(status)) return false;
  if (isFailedLeadStatusContaining(status)) return false;
  return true;
}
