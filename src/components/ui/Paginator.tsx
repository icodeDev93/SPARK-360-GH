interface Props {
  page: number;
  totalItems: number;
  pageSize: number;
  onPrev: () => void;
  onNext: () => void;
}

export default function Paginator({ page, totalItems, pageSize, onPrev, onNext }: Props) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-white">
      <p className="text-slate-400 text-xs">
        Showing <span className="font-semibold text-slate-600">{start}–{end}</span> of <span className="font-semibold text-slate-600">{totalItems}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          disabled={page === 1}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <i className="ri-arrow-left-s-line text-sm"></i>
          Previous
        </button>
        <span className="text-xs text-slate-500 font-medium px-1">
          {page} / {totalPages}
        </span>
        <button
          onClick={onNext}
          disabled={page === totalPages}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          Next
          <i className="ri-arrow-right-s-line text-sm"></i>
        </button>
      </div>
    </div>
  );
}
