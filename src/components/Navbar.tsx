
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import AuthForms from "@/components/AuthForms";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut, isAuthenticated } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Successfully logged out");
    } catch (error) {
      toast.error("Error signing out");
    }
  };

  return (
    <nav className="bg-white border-b border-gray-100 py-2 px-4 md:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex justify-between items-center h-16">
        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold text-fleet-purple">TawaaqFleet</div>
        </div>

        {/* Desktop nav links */}
        <div className="hidden md:flex md:items-center md:space-x-8">
          <a href="#" className="text-gray-700 hover:text-fleet-purple transition-colors">
            Home
          </a>
          <a href="#features" className="text-gray-700 hover:text-fleet-purple transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="text-gray-700 hover:text-fleet-purple transition-colors">
            How It Works
          </a>
          <a href="#contact" className="text-gray-700 hover:text-fleet-purple transition-colors">
            Contact
          </a>
        </div>

        {/* Auth buttons */}
        <div className="hidden md:flex md:items-center md:space-x-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <span className="text-gray-700">Welcome, {user?.user_metadata?.name || user?.email}</span>
              <Button 
                variant="outline" 
                className="border-fleet-purple text-fleet-purple hover:bg-fleet-purple hover:text-white"
                onClick={handleSignOut}
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="border-fleet-purple text-fleet-purple hover:bg-fleet-purple hover:text-white"
                >
                  Sign In
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md p-6">
                <AuthForms />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden">
          <button
            type="button"
            className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-fleet-purple"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="sr-only">Open main menu</span>
            {mobileMenuOpen ? (
              <svg
                className="block h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="block h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white p-4 space-y-3">
          <a
            href="#"
            className="block text-gray-700 hover:text-fleet-purple transition-colors"
            onClick={() => setMobileMenuOpen(false)}
          >
            Home
          </a>
          <a
            href="#features"
            className="block text-gray-700 hover:text-fleet-purple transition-colors"
            onClick={() => setMobileMenuOpen(false)}
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="block text-gray-700 hover:text-fleet-purple transition-colors"
            onClick={() => setMobileMenuOpen(false)}
          >
            How It Works
          </a>
          <a
            href="#contact"
            className="block text-gray-700 hover:text-fleet-purple transition-colors"
            onClick={() => setMobileMenuOpen(false)}
          >
            Contact
          </a>
          
          {isAuthenticated ? (
            <div className="pt-2 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-2">Signed in as {user?.user_metadata?.name || user?.email}</p>
              <Button 
                variant="outline" 
                size="sm"
                className="w-full border-fleet-purple text-fleet-purple hover:bg-fleet-purple hover:text-white"
                onClick={handleSignOut}
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  className="w-full mt-2 bg-fleet-purple hover:bg-fleet-purpleDark text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md p-6">
                <AuthForms />
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
