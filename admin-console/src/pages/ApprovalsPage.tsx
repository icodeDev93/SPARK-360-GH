import type { BusinessRow, BusinessStatus, ProfileRow } from '@/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { BusinessCard } from '@/components/business/BusinessCard';

export function ApprovalsPage({
  businesses,
  profileById,
  actionId,
  onUpdateStatus,
}: {
  businesses: BusinessRow[];
  profileById: Map<string, ProfileRow>;
  actionId: string;
  onUpdateStatus: (business: BusinessRow, status: BusinessStatus) => void;
}) {
  if (businesses.length === 0) {
    return (
      <EmptyState
        icon="ri-shield-check-line"
        title="No pending approvals"
        text="Newly created businesses will appear here before they can operate."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {businesses.map((business) => (
        <BusinessCard
          key={business.id}
          business={business}
          owner={profileById.get(business.owner_id)}
          actionId={actionId}
          primaryActions={['active', 'inactive']}
          onUpdateStatus={onUpdateStatus}
        />
      ))}
    </div>
  );
}
