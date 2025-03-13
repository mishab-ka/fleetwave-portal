import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import AuthForms from "@/components/AuthForms";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const { isAuthenticated, user, signOut } = useAuth();

  return (
    <nav className="bg-white py-4 shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="navbar-brand text-2xl font-bold text-fleet-purple">
            Fleet Manager
          </Link>

          <div className="navbar-right hidden md:flex items-center space-x-4">
            <NavLink to="/" className="text-gray-700 hover:text-fleet-purple">Home</NavLink>
            <NavLink to="/#features" className="text-gray-700 hover:text-fleet-purple">Features</NavLink>
            <NavLink to="/#how-it-works" className="text-gray-700 hover:text-fleet-purple">How It Works</NavLink>
            <NavLink to="/#contact" className="text-gray-700 hover:text-fleet-purple">Contact</NavLink>

            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-0">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-fleet-purple text-white">
                        {user?.email?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut}>Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-fleet-purple hover:bg-opacity-90 text-white">
                    Login
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md p-6">
                  <AuthForms />
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="text-gray-700 focus:outline-none"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`mobile-menu md:hidden ${isMenuOpen ? "block" : "hidden"}`}>
        <div className="bg-white shadow-md rounded-md p-4">
          <NavLink to="/" className="block py-2 text-gray-700 hover:text-fleet-purple">
            Home
          </NavLink>
          <NavLink to="/#features" className="block py-2 text-gray-700 hover:text-fleet-purple">
            Features
          </NavLink>
          <NavLink to="/#how-it-works" className="block py-2 text-gray-700 hover:text-fleet-purple">
            How It Works
          </NavLink>
          <NavLink to="/#contact" className="block py-2 text-gray-700 hover:text-fleet-purple">
            Contact
          </NavLink>

          {isAuthenticated ? (
            <>
              <NavLink to="/profile" className="block py-2 text-gray-700 hover:text-fleet-purple">
                Profile
              </NavLink>
              <button
                className="block py-2 text-gray-700 hover:text-fleet-purple"
                onClick={signOut}
              >
                Logout
              </button>
            </>
          ) : (
            <Dialog>
              <DialogTrigger asChild>
                <button className="block py-2 text-gray-700 hover:text-fleet-purple">
                  Login
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md p-6">
                <AuthForms />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
