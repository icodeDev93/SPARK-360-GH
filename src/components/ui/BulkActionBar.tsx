interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  onDelete: () => void;
  deleteLabel?: string;
}

export default function BulkActionBar({
  selectedCount,
  onClear,
  onDelete,
  deleteLabel = 'Delete Selected',
}: BulkActionBarProps) {
  if (selectedCount <= 0) return null;

  return (
    <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
        <i className="ri-checkbox-circle-line text-base"></i>
        <span>{selectedCount} selected</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
        >
          Clear Selection
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600 cursor-pointer"
        >
          {deleteLabel}
        </button>
      </div>
    </div>
  );
}
