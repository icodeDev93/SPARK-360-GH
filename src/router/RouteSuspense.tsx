import { Suspense, type ReactNode } from 'react';

function RouteLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
          <i className="ri-store-2-line text-white text-2xl"></i>
        </div>
        <i className="ri-loader-4-line animate-spin text-indigo-600 text-2xl"></i>
      </div>
    </div>
  );
}

export default function RouteSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteLoader />}>{children}</Suspense>;
}
