import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Car, Shield, Clock, Activity } from "lucide-react";
import AuthForms from "./AuthForms";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";

const Hero = () => {
  useEffect(() => {
    const addActiveClass = () => {
      const elements = document.querySelectorAll(".reveal");
      elements.forEach((el) => {
        const elementTop = el.getBoundingClientRect().top;
        const elementVisible = 150;
        if (elementTop < window.innerHeight - elementVisible) {
          el.classList.add("active");
        }
      });
    };

    window.addEventListener("scroll", addActiveClass);
    // Initial check
    addActiveClass();

    return () => window.removeEventListener("scroll", addActiveClass);
  }, []);

  return (
    <section className="relative overflow-hidden pt-32 pb-20">
      {/* Background Elements */}
      <div className="absolute -top-24 -right-1/4 w-1/2 h-1/2 bg-fleet-purple/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -left-1/4 w-1/2 h-1/2 bg-fleet-purple/5 rounded-full blur-3xl" />

      <div className="container px-6 md:px-10 mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text Content */}
          <div className="stagger-animation">
            <span className="inline-block py-1 px-3 bg-fleet-purple/10 text-fleet-purple rounded-full text-sm font-medium mb-6">
              Fleet Management Reimagined
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-5xl font-bold leading-tight mb-6">
              Drive with Confidence,{" "}
              <span className="text-gradient"> Earn </span> with{" "}
              <span className="text-gradient">Ease</span>
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-lg">
              Stay on top of your trips, track earnings, and manage your
              schedule all from one powerful platform designed just for drivers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              {/* {showAuth && <AuthForms />} */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-fleet-purple hover:bg-fleet-purpleDark text-white px-6 py-6 rounded-lg text-lg transition-all transform hover:scale-105">
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md p-6">
                  <AuthForms />
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                className="border-fleet-purple text-fleet-purple hover:bg-fleet-purple/10 px-6 py-6 rounded-lg text-lg"
              >
                <a href="tel:+919606393089">Schedule Demo</a>
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 mt-12">
              <div className="text-center">
                <p className="text-3xl font-bold text-fleet-purple">1,000+ </p>
                <p className="text-gray-600 text-sm">Drivers Empowered</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-fleet-purple">10k+</p>
                <p className="text-gray-600 text-sm">Trips Completed</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-fleet-purple">128k</p>
                <p className="text-gray-600 text-sm">Total Earnings</p>
              </div>
            </div>
          </div>

          {/* Right Column - Illustration */}
          <div className="relative">
            <div className="reveal reveal-left">
              <div className="relative bg-white rounded-2xl shadow-xl overflow-hidden p-2 z-10">
                <div className="bg-fleet-offwhite rounded-xl p-4">
                  <div className="bg-white rounded-lg shadow-sm p-4 mb-4 flex items-center">
                    <div className="w-10 h-10 rounded-full bg-fleet-purple/20 flex items-center justify-center mr-4">
                      <Car className="h-5 w-5 text-fleet-purple" />
                    </div>
                    <div>
                      <p className="font-medium">Vehicle Tracking</p>
                      <p className="text-sm text-gray-500">Real-time updates</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm p-4 mb-4 flex items-center">
                    <div className="w-10 h-10 rounded-full bg-fleet-purple/20 flex items-center justify-center mr-4">
                      <Shield className="h-5 w-5 text-fleet-purple" />
                    </div>
                    <div>
                      <p className="font-medium">Safety Monitoring</p>
                      <p className="text-sm text-gray-500">Driver behavior</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm p-4 mb-4 flex items-center">
                    <div className="w-10 h-10 rounded-full bg-fleet-purple/20 flex items-center justify-center mr-4">
                      <Clock className="h-5 w-5 text-fleet-purple" />
                    </div>
                    <div>
                      <p className="font-medium">Maintenance Alerts</p>
                      <p className="text-sm text-gray-500">Scheduled service</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow-sm p-4 flex items-center">
                    <div className="w-10 h-10 rounded-full bg-fleet-purple/20 flex items-center justify-center mr-4">
                      <Activity className="h-5 w-5 text-fleet-purple" />
                    </div>
                    <div>
                      <p className="font-medium">Performance Analytics</p>
                      <p className="text-sm text-gray-500">
                        Efficiency metrics
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute top-1/2 -right-12 transform -translate-y-1/2 w-24 h-24 bg-fleet-purple/20 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 left-10 w-20 h-20 bg-fleet-purple/30 rounded-full blur-xl" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
