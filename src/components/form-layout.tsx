import { Outlet } from 'react-router-dom';

export function FormLayout() {
  return (
    <div className="w-full min-h-screen flex items-center sm:items-start md:items-center justify-center bg-background">
      <div className="w-full max-w-[400px] px-3 py-4 mx-auto">
        <Outlet />
      </div>
    </div>
  );
}