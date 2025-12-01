import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Home, Dumbbell } from 'lucide-react';

export const Layout: React.FC = () => {
    return (
        <>
            <header className="header">
                <h3>FIT99</h3>
            </header>

            <main className="page-content">
                <Outlet />
            </main>

            <nav className="nav-bar">
                <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <Home size={24} />
                    <span>Home</span>
                </NavLink>
                <NavLink to="/exercises" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <Dumbbell size={24} />
                    <span>Exercises</span>
                </NavLink>
            </nav>
        </>
    );
};
