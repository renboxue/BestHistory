import { supabase } from '@/src/auth/supabase-client';
import { withBestHistoryClientMeta } from '@/src/config/client-context';
import type {
  AiOrganizeWebsitesRequest,
  AiOrganizeWebsiteSuggestion,
  AiRecallExpansion,
  AiRecallRequest,
} from '@/src/ai/types';

function functionError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error('AI_REQUEST_FAILED');
}

export class BestHistoryAiService {
  async expandRecall(request: AiRecallRequest): Promise<AiRecallExpansion> {
    const { data, error } = await supabase.functions.invoke('ai-recall-expand', { body: withBestHistoryClientMeta(request) });
    if (error) throw functionError(error);
    if (!data?.expansion) throw new Error(data?.error || 'AI_RECALL_INVALID_RESPONSE');
    return data.expansion as AiRecallExpansion;
  }

  async organizeWebsites(request: AiOrganizeWebsitesRequest): Promise<AiOrganizeWebsiteSuggestion[]> {
    const { data, error } = await supabase.functions.invoke('ai-organize-websites', { body: withBestHistoryClientMeta(request) });
    if (error) throw functionError(error);
    if (!Array.isArray(data?.suggestions)) throw new Error(data?.error || 'AI_ORGANIZE_INVALID_RESPONSE');
    return data.suggestions as AiOrganizeWebsiteSuggestion[];
  }
}

export const aiService = new BestHistoryAiService();
