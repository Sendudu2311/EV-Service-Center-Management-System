import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  ChevronDownIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { Menu, Transition } from "@headlessui/react";

const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100/20 text-red-300 border border-red-500";
      case "staff":
        return "bg-lime-200/20 text-lime-200 border border-lime-200";
      case "technician":
        return "bg-green-100/20 text-green-300 border border-green-500";
      default:
        return "bg-dark-200 text-text-muted border border-dark-100";
    }
  };

  const getNavLinks = () => {
    if (!isAuthenticated) return { main: [], grouped: null };

    const baseLinks = [{ name: "Dashboard", href: "/dashboard" }];

    switch (user?.role) {
      case "customer":
        return {
          main: [
            ...baseLinks,
            { name: "My Vehicles", href: "/vehicles" },
            { name: "Appointments", href: "/appointments" },
            { name: "Services", href: "/customer-services" },
            { name: "Parts", href: "/customer-parts" },
          ],
          grouped: {
            name: "More",
            items: [
              { name: "Transactions", href: "/transactions" },
              { name: "Service History", href: "/service-history" },
            ],
          },
        };
      case "staff":
        return {
          main: [
            ...baseLinks,
            { name: "Appointments", href: "/appointments" },
            { name: "Services", href: "/services" },
            { name: "Parts", href: "/parts" },
            { name: "Vehicles", href: "/manage-vehicles" },
          ],
          grouped: {
            name: "Management",
            items: [
              { name: "Users", href: "/users" },
              { name: "Slots", href: "/slots" },
              { name: "Part Conflicts", href: "/part-conflicts" },
              { name: "Contacts", href: "/manage-contacts" },
              { name: "Transactions", href: "/manage-transactions" },
            ],
          },
        };
      case "technician":
        return {
          main: [
            ...baseLinks,
            { name: "Work Queue", href: "/work-queue" },
            { name: "My Slots", href: "/my-slots" },
            { name: "Vehicles", href: "/manage-vehicles" },
            { name: "Parts", href: "/parts" },
          ],
          grouped: null,
        };
      case "admin":
        return {
          main: [...baseLinks, { name: "Vehicles", href: "/manage-vehicles" }],
          grouped: {
            name: "Management",
            items: [
              { name: "Users", href: "/users" },
              { name: "Slots", href: "/slots" },
              { name: "Part Conflicts", href: "/part-conflicts" },
              { name: "Contacts", href: "/manage-contacts" },
              { name: "Transactions", href: "/manage-transactions" },
            ],
          },
        };
      default:
        return { main: baseLinks, grouped: null };
    }
  };

  const navData = getNavLinks();

  return (
    <nav className="bg-dark-300 shadow-lg border-b border-dark-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="w-8 h-8 bg-gradient-to-r from-lime-200 to-lime-300 rounded-lg flex items-center justify-center shadow-glow group-hover:shadow-lg transition-all duration-200 transform group-hover:scale-110">
                <span className="text-dark-900 font-bold text-sm">EV</span>
              </div>
              <span className="text-xl font-bold text-white group-hover:text-lime-200 transition-colors duration-200">
                Service Center
              </span>
            </Link>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Main links */}
            {navData.main.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className="text-text-secondary hover:text-lime-200 px-3 py-2 rounded-md text-sm text-text-muted transition-colors duration-200"
              >
                {link.name}
              </Link>
            ))}

            {/* Grouped links dropdown */}
            {navData.grouped && (
              <Menu as="div" className="relative">
                <Menu.Button className="flex items-center space-x-1 text-text-secondary hover:text-lime-200 px-3 py-2 rounded-md text-sm text-text-muted transition-colors duration-200">
                  <span>{navData.grouped.name}</span>
                  <ChevronDownIcon className="h-4 w-4" />
                </Menu.Button>

                <Transition
                  enter="transition ease-out duration-200"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute left-0 z-10 mt-2 w-48 origin-top-left rounded-md bg-dark-300 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    {navData.grouped.items.map((item) => (
                      <Menu.Item key={item.name}>
                        {({ active }) => (
                          <Link
                            to={item.href}
                            className={`${
                              active ? "bg-dark-100" : ""
                            } flex items-center px-4 py-2 text-sm text-text-secondary`}
                          >
                            <Squares2X2Icon className="mr-3 h-4 w-4" />
                            {item.name}
                          </Link>
                        )}
                      </Menu.Item>
                    ))}
                  </Menu.Items>
                </Transition>
              </Menu>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <button className="p-2 text-text-muted hover:text-text-secondary transition-colors duration-200">
                  <BellIcon className="h-6 w-6" />
                </button>

                {/* User menu */}
                <Menu as="div" className="relative">
                  <Menu.Button className="flex items-center space-x-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 focus:ring-offset-dark-900">
                    <div className="flex items-center space-x-3">
                      {user?.avatar ? (
                        <img
                          className="h-8 w-8 rounded-full object-cover"
                          src={user.avatar}
                          alt={user.fullName}
                        />
                      ) : (
                        <UserCircleIcon className="h-8 w-8 text-text-muted" />
                      )}
                      <div className="hidden md:block text-left">
                        <div className="text-sm text-text-muted text-white">
                          {user?.fullName}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs text-text-muted ${getRoleColor(
                              user?.role || ""
                            )}`}
                          >
                            {user?.role}
                          </span>
                        </div>
                      </div>
                      <ChevronDownIcon className="h-4 w-4 text-text-muted" />
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
                    <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-dark-300 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            to="/profile"
                            className={`${
                              active ? "bg-dark-100" : ""
                            } flex items-center px-4 py-2 text-sm text-text-secondary`}
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
                              active ? "bg-dark-100" : ""
                            } flex items-center px-4 py-2 text-sm text-text-secondary`}
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
                              active ? "bg-dark-100" : ""
                            } flex w-full items-center px-4 py-2 text-sm text-text-secondary`}
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
                  className="text-text-secondary hover:text-lime-200 px-3 py-2 rounded-md text-sm text-text-muted"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="bg-lime-200 hover:bg-lime-100 text-black font-semibold px-4 py-2 rounded-md text-sm transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                >
                  Get started
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-text-muted hover:text-text-muted hover:bg-dark-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-lime-500"
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
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-dark-900">
            {/* Main links */}
            {navData.main.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className="text-text-secondary hover:text-lime-200 block px-3 py-2 rounded-md text-base text-text-muted"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}

            {/* Grouped links */}
            {navData.grouped && (
              <>
                <div className="px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  {navData.grouped.name}
                </div>
                {navData.grouped.items.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="text-text-secondary hover:text-lime-200 block px-6 py-2 rounded-md text-base text-text-muted"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
              </>
            )}

            {!isAuthenticated && (
              <>
                <Link
                  to="/login"
                  className="text-text-secondary hover:text-lime-200 block px-3 py-2 rounded-md text-base text-text-muted"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="bg-lime-200 hover:bg-lime-100 text-black font-semibold block px-3 py-2 rounded-md text-base transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
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
