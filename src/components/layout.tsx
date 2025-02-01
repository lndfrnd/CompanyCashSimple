import { Outlet } from 'react-router-dom';
import { NavBar } from './nav-bar';

export function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="container mx-auto px-8 py-8 max-w-[1400px]">
        <Outlet />
      </main>
    </div>
  );
}