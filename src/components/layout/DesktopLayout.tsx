import { ReactNode } from 'react';
import DesktopSidebar from './DesktopSidebar';
import DesktopHeader from './DesktopHeader';
import TrendingSidebar from './TrendingSidebar';
interface DesktopLayoutProps {
  children: ReactNode;
  showTrendingSidebar?: boolean;
}
export default function DesktopLayout({
  children,
  showTrendingSidebar = true
}: DesktopLayoutProps) {
  return <div className="min-h-screen bg-gradient-discovery">
      <DesktopSidebar />
      <DesktopHeader />
      
      {/* Main Content */}
      <main className={`ml-64 mt-16 ${showTrendingSidebar ? 'mr-80' : ''} min-h-screen`}>
        <div className="max-w-4xl p-6 py-[15px] px-0 mx-[18px] my-0">
          {children}
        </div>
      </main>

      {showTrendingSidebar && <TrendingSidebar />}
    </div>;
}