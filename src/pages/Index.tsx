
import React, { useEffect } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import AuthForms from "@/components/AuthForms";
import { Button } from "@/components/ui/button";

const Index = () => {
  // Add scroll animation behavior
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
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Floating Action Button for Auth */}
      <div className="fixed bottom-8 right-8 z-50">
        <Dialog>
          <DialogTrigger asChild>
            <Button
              className="bg-fleet-purple hover:bg-fleet-purpleDark text-white shadow-lg rounded-full h-14 px-6 transition-all duration-300 hover:scale-105"
            >
              Get Started
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md p-6">
            <AuthForms />
          </DialogContent>
        </Dialog>
      </div>

      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <ContactForm />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
