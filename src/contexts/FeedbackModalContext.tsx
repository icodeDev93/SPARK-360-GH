import { useState, type ReactNode } from 'react';
import { FeedbackModalContext, type FeedbackOptions } from '@/contexts/feedbackModal';

export function FeedbackModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<FeedbackOptions | null>(null);
  const kind = modal?.kind ?? 'success';
  const isDeleted = kind === 'deleted';

  return (
    <FeedbackModalContext.Provider value={{ showFeedback: setModal }}>
      {children}

      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className={`absolute inset-x-0 top-0 h-40 ${isDeleted ? 'bg-rose-50' : 'bg-indigo-50'}`}></div>
            <div className="absolute inset-x-0 top-0 h-40 opacity-50">
              <div className="grid grid-cols-5 gap-4 p-5 text-white/70">
                {Array.from({ length: 15 }).map((_, index) => (
                  <i key={index} className={`${isDeleted ? 'ri-close-line' : 'ri-sparkling-2-line'} text-sm`}></i>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setModal(null)}
              className="absolute right-4 top-4 z-10 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-white/80 hover:text-slate-600 transition-all"
              aria-label="Close"
            >
              <i className="ri-close-line text-xl"></i>
            </button>

            <div className="relative px-7 pb-7 pt-12 text-center">
              <div className={`mx-auto mb-8 w-32 h-32 rounded-full flex items-center justify-center shadow-xl ${
                isDeleted
                  ? 'bg-gradient-to-br from-rose-400 to-red-600 shadow-rose-200'
                  : 'bg-gradient-to-br from-indigo-400 to-blue-700 shadow-indigo-200'
              }`}>
                <i className={`${isDeleted ? 'ri-delete-bin-line' : 'ri-check-line'} text-white text-6xl drop-shadow-md`}></i>
              </div>

              <h2 className="text-slate-900 text-2xl font-extrabold mb-3">{modal.title}</h2>
              <p className="text-slate-500 text-sm leading-6 mb-7">{modal.message}</p>

              <button
                type="button"
                onClick={() => setModal(null)}
                className={`w-full rounded-xl py-3 text-sm font-bold text-white shadow-lg transition-all ${
                  isDeleted
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-100'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
                }`}
              >
                {modal.buttonLabel ?? 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackModalContext.Provider>
  );
}
