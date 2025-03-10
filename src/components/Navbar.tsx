
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      if (offset > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out py-4 px-6 md:px-10 lg:px-20",
        scrolled
          ? "bg-white/90 backdrop-blur-md shadow-sm"
          : "bg-transparent"
      )}
    >
      <div className="container mx-auto">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-md bg-fleet-purple flex items-center justify-center text-white font-bold text-xl">
              F
            </div>
            <span className="text-xl font-bold">FleetWave</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/"
              className="text-foreground/90 hover:text-fleet-purple transition-colors font-medium"
            >
              Home
            </Link>
            <Link
              to="#features"
              className="text-foreground/90 hover:text-fleet-purple transition-colors font-medium"
            >
              Features
            </Link>
            <Link
              to="#how-it-works"
              className="text-foreground/90 hover:text-fleet-purple transition-colors font-medium"
            >
              How It Works
            </Link>
            <Link
              to="#contact"
              className="text-foreground/90 hover:text-fleet-purple transition-colors font-medium"
            >
              Contact
            </Link>
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Button
              variant="outline"
              className="border-fleet-purple text-fleet-purple hover:bg-fleet-purple/10"
            >
              Login
            </Button>
            <Button className="bg-fleet-purple hover:bg-fleet-purpleDark transition-colors">
              Sign Up
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-fleet-dark focus:outline-none"
            aria-label="Toggle menu"
          >
            {isOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden absolute top-20 inset-x-0 bg-white shadow-lg rounded-b-2xl p-4 border-t animate-fade-in">
            <nav className="flex flex-col space-y-4 py-2">
              <Link
                to="/"
                className="text-foreground/90 hover:text-fleet-purple px-4 py-2 rounded-md transition-colors font-medium"
                onClick={() => setIsOpen(false)}
              >
                Home
              </Link>
              <Link
                to="#features"
                className="text-foreground/90 hover:text-fleet-purple px-4 py-2 rounded-md transition-colors font-medium"
                onClick={() => setIsOpen(false)}
              >
                Features
              </Link>
              <Link
                to="#how-it-works"
                className="text-foreground/90 hover:text-fleet-purple px-4 py-2 rounded-md transition-colors font-medium"
                onClick={() => setIsOpen(false)}
              >
                How It Works
              </Link>
              <Link
                to="#contact"
                className="text-foreground/90 hover:text-fleet-purple px-4 py-2 rounded-md transition-colors font-medium"
                onClick={() => setIsOpen(false)}
              >
                Contact
              </Link>
              <div className="flex space-x-2 pt-2 border-t">
                <Button
                  variant="outline"
                  className="flex-1 border-fleet-purple text-fleet-purple hover:bg-fleet-purple/10"
                  onClick={() => setIsOpen(false)}
                >
                  Login
                </Button>
                <Button
                  className="flex-1 bg-fleet-purple hover:bg-fleet-purpleDark transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  Sign Up
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
