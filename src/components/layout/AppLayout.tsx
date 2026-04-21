import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { SpaceBackground } from '../dashboard/SpaceBackground';

export function AppLayout() {
  return (
    <div className="min-h-screen relative">
      <SpaceBackground />
      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-6 pb-28">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
