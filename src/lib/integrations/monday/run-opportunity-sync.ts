import { getClientService } from "@/lib/data/client-service";

type RunMondayOpportunitySyncOptions = {
  demoItemLimit?: number;
};

export function runMondayOpportunitySync(options: RunMondayOpportunitySyncOptions = {}) {
  return getClientService().syncFromMondayOpportunities({
    demoItemLimit: options.demoItemLimit,
  });
}
