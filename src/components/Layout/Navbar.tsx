import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';

const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'staff':
        return 'bg-blue-100 text-blue-800';
      case 'technician':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getNavLinks = () => {
    if (!isAuthenticated) return [];

    const baseLinks = [
      { name: 'Dashboard', href: '/dashboard' },
    ];

    switch (user?.role) {
      case 'customer':
        return [
          ...baseLinks,
          { name: 'My Vehicles', href: '/vehicles' },
          { name: 'Appointments', href: '/appointments' },
          { name: 'Service History', href: '/service-history' },
        ];
      case 'staff':
        return [
          ...baseLinks,
          { name: 'Users', href: '/users' },
          { name: 'Services', href: '/services' },
          { name: 'Parts', href: '/parts' },
          { name: 'All Vehicles', href: '/manage-vehicles' },
          { name: 'Appointments', href: '/appointments' },
        ];
      case 'technician':
        return [
          ...baseLinks,
          { name: 'Work Queue', href: '/work-queue' },
          { name: 'All Vehicles', href: '/manage-vehicles' },
          { name: 'Parts', href: '/parts' },
        ];
      case 'admin':
        return [
          ...baseLinks,
          { name: 'Users', href: '/users' },
          { name: 'All Vehicles', href: '/manage-vehicles' },
          { name: 'Service Centers', href: '/service-centers' },
          { name: 'Reports', href: '/admin/reports' },
        ];
      default:
        return baseLinks;
    }
  };

  const navLinks = getNavLinks();

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-green-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">EV</span>
              </div>
              <span className="text-xl font-bold text-gray-900">
                Service Center
              </span>
            </Link>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200">
                  <BellIcon className="h-6 w-6" />
                </button>

                {/* User menu */}
                <Menu as="div" className="relative">
                  <Menu.Button className="flex items-center space-x-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                    <div className="flex items-center space-x-3">
                      {user?.avatar ? (
                        <img
                          className="h-8 w-8 rounded-full object-cover"
                          src={user.avatar}
                          alt={user.fullName}
                        />
                      ) : (
                        <UserCircleIcon className="h-8 w-8 text-gray-400" />
                      )}
                      <div className="hidden md:block text-left">
                        <div className="text-sm font-medium text-gray-900">
                          {user?.fullName}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user?.role || '')}`}>
                            {user?.role}
                          </span>
                        </div>
                      </div>
                      <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                    </div>
                  </Menu.Button>

                  <Transition
                    enter="transition ease-out duration-200"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            to="/profile"
                            className={`${
                              active ? 'bg-gray-100' : ''
                            } flex items-center px-4 py-2 text-sm text-gray-700`}
                          >
                            <UserCircleIcon className="mr-3 h-4 w-4" />
                            Profile
                          </Link>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            to="/settings"
                            className={`${
                              active ? 'bg-gray-100' : ''
                            } flex items-center px-4 py-2 text-sm text-gray-700`}
                          >
                            <Cog6ToothIcon className="mr-3 h-4 w-4" />
                            Settings
                          </Link>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={handleLogout}
                            className={`${
                              active ? 'bg-gray-100' : ''
                            } flex w-full items-center px-4 py-2 text-sm text-gray-700`}
                          >
                            <ArrowRightOnRectangleIcon className="mr-3 h-4 w-4" />
                            Sign out
                          </button>
                        )}
                      </Menu.Item>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  Get started
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              >
                {isMobileMenuOpen ? (
                  <XMarkIcon className="block h-6 w-6" />
                ) : (
                  <Bars3Icon className="block h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className="text-gray-700 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            {!isAuthenticated && (
              <>
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 hover:bg-blue-700 text-white block px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;