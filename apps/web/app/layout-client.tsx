"use client";

import { Sidebar, MobileNav } from "./components";

export function LayoutClient({ children }: { children: React.ReactNode }) {
    return (
        <div className="app-layout">
            <Sidebar />
            <MobileNav />
            <main className="main-content">
                <div className="page-container">
                    {children}
                </div>
            </main>
        </div>
    );
}
