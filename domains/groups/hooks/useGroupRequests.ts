import * as React from 'react';

import {
  approveGroupMemberRequest,
  denyGroupMemberRequest,
  fetchGroupMemberRequests,
  type GroupMemberRequest,
} from '../../../services/groupService';

type UseGroupRequestsReturn = {
  pendingRequests: GroupMemberRequest[];
  loadingRequests: boolean;
  processingRequestId: string | null;
  refreshRequests: (groupId: string, isAdmin: boolean) => Promise<void>;
  handleApproveRequest: (request: GroupMemberRequest) => Promise<boolean>;
  handleDenyRequest: (requestId: string) => Promise<boolean>;
};

export function useGroupRequests(): UseGroupRequestsReturn {
  const [pendingRequests, setPendingRequests] = React.useState<GroupMemberRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = React.useState(false);
  const [processingRequestId, setProcessingRequestId] = React.useState<string | null>(null);

  const refreshRequests = React.useCallback(async (groupId: string, isAdmin: boolean) => {
    if (!isAdmin) {
      setPendingRequests([]);
      return;
    }
    setLoadingRequests(true);
    const requests = await fetchGroupMemberRequests(groupId);
    setPendingRequests(requests);
    setLoadingRequests(false);
  }, []);

  const handleApproveRequest = React.useCallback(
    async (request: GroupMemberRequest) => {
      if (processingRequestId) return false;
      setProcessingRequestId(request.id);
      const approved = await approveGroupMemberRequest(request.id);
      if (!approved) {
        setProcessingRequestId(null);
        return false;
      }
      setProcessingRequestId(null);
      return true;
    },
    [processingRequestId]
  );

  const handleDenyRequest = React.useCallback(
    async (requestId: string) => {
      if (processingRequestId) return false;
      setProcessingRequestId(requestId);
      const denied = await denyGroupMemberRequest(requestId);
      if (!denied) {
        setProcessingRequestId(null);
        return false;
      }
      setProcessingRequestId(null);
      return true;
    },
    [processingRequestId]
  );

  return {
    pendingRequests,
    loadingRequests,
    processingRequestId,
    refreshRequests,
    handleApproveRequest,
    handleDenyRequest,
  };
}
