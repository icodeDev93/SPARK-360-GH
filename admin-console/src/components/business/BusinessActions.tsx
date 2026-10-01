import type { BusinessRow, BusinessStatus } from '@/types';
import { ActionButton } from '@/components/ui/ActionButton';

export function BusinessActions({
  business,
  actionId,
  onUpdateStatus,
}: {
  business: BusinessRow;
  actionId: string;
  onUpdateStatus: (business: BusinessRow, status: BusinessStatus) => void;
}) {
  const actions: BusinessStatus[] =
    business.status === 'pending'
      ? ['active', 'inactive']
      : business.status === 'active'
        ? ['inactive', 'archived']
        : business.status === 'inactive'
          ? ['active', 'archived']
          : ['active'];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((status) => (
        <ActionButton
          key={status}
          status={status}
          loading={actionId === `${business.id}:${status}`}
          disabled={business.status === status}
          onClick={() => onUpdateStatus(business, status)}
        />
      ))}
    </div>
  );
}
