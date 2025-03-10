
import React from "react";
import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Linkedin, Github } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="container px-6 md:px-10 mx-auto py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 rounded-md bg-fleet-purple flex items-center justify-center text-white font-bold text-xl">
                F
              </div>
              <span className="text-xl font-bold">FleetWave</span>
            </Link>
            <p className="text-gray-600 mb-4 max-w-md">
              Transforming fleet management with cutting-edge technology. 
              Our comprehensive platform helps businesses optimize operations, 
              reduce costs, and improve safety.
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-fleet-purple hover:text-white transition-colors"
              >
                <Facebook size={18} />
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-fleet-purple hover:text-white transition-colors"
              >
                <Twitter size={18} />
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-fleet-purple hover:text-white transition-colors"
              >
                <Instagram size={18} />
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-fleet-purple hover:text-white transition-colors"
              >
                <Linkedin size={18} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/about"
                  className="text-gray-600 hover:text-fleet-purple transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  to="/careers"
                  className="text-gray-600 hover:text-fleet-purple transition-colors"
                >
                  Careers
                </Link>
              </li>
              <li>
                <Link
                  to="/blog"
                  className="text-gray-600 hover:text-fleet-purple transition-colors"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  to="/press"
                  className="text-gray-600 hover:text-fleet-purple transition-colors"
                >
                  Press
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-gray-600 hover:text-fleet-purple transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/features"
                  className="text-gray-600 hover:text-fleet-purple transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  to="/pricing"
                  className="text-gray-600 hover:text-fleet-purple transition-colors"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  to="/integrations"
                  className="text-gray-600 hover:text-fleet-purple transition-colors"
                >
                  Integrations
                </Link>
              </li>
              <li>
                <Link
                  to="/api"
                  className="text-gray-600 hover:text-fleet-purple transition-colors"
                >
                  API
                </Link>
              </li>
              <li>
                <Link
                  to="/documentation"
                  className="text-gray-600 hover:text-fleet-purple transition-colors"
                >
                  Documentation
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Resources</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/help"
                  className="text-gray-600 hover:text-fleet-purple transition-colors"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link
                  to="/community"
                  className="text-gray-600 hover:text-fleet-purple transition-colors"
                >
                  Community
                </Link>
              </li>
              <li>
                <Link
                  to="/webinars"
                  className="text-gray-600 hover:text-fleet-purple transition-colors"
                >
                  Webinars
                </Link>
              </li>
              <li>
                <Link
                  to="/status"
                  className="text-gray-600 hover:text-fleet-purple transition-colors"
                >
                  Status
                </Link>
              </li>
              <li>
                <Link
                  to="/security"
                  className="text-gray-600 hover:text-fleet-purple transition-colors"
                >
                  Security
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-100 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} FleetWave. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-4 md:gap-8">
            <Link
              to="/terms"
              className="text-gray-500 hover:text-fleet-purple text-sm"
            >
              Terms of Service
            </Link>
            <Link
              to="/privacy"
              className="text-gray-500 hover:text-fleet-purple text-sm"
            >
              Privacy Policy
            </Link>
            <Link
              to="/cookies"
              className="text-gray-500 hover:text-fleet-purple text-sm"
            >
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
