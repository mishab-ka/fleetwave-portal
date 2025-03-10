
import React, { useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

const HowItWorks = () => {
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

  const steps = [
    {
      number: "01",
      title: "Sign Up",
      description: "Create your account and set up your company profile with just a few clicks."
    },
    {
      number: "02",
      title: "Add Your Fleet",
      description: "Register your vehicles and drivers with our easy-to-use onboarding process."
    },
    {
      number: "03",
      title: "Install Trackers",
      description: "Connect our GPS trackers to your vehicles or use our mobile app for tracking."
    },
    {
      number: "04",
      title: "Monitor & Optimize",
      description: "Track your fleet in real-time and leverage our insights to optimize operations."
    }
  ];

  return (
    <section id="how-it-works" className="py-20">
      <div className="container px-6 md:px-10 mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16 stagger-animation">
          <span className="inline-block py-1 px-3 bg-fleet-purple/10 text-fleet-purple rounded-full text-sm font-medium mb-4">
            Simple Process
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How FleetWave Works
          </h2>
          <p className="text-gray-600 text-lg">
            Getting started with FleetWave is quick and easy. Follow these simple steps to transform your fleet management.
          </p>
        </div>

        <div className="relative">
          {/* Connect line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-fleet-purple/20 -translate-x-1/2 hidden md:block" />

          {/* Steps */}
          <div className="space-y-12 md:space-y-0">
            {steps.map((step, index) => (
              <div 
                key={index} 
                className={`reveal ${index % 2 === 0 ? 'reveal-left' : 'reveal-right'} relative md:grid md:grid-cols-2 items-center gap-8 ${
                  index % 2 === 0 ? 'md:text-right' : ''
                }`}
              >
                {/* Circle on timeline */}
                <div className="absolute left-1/2 top-0 w-8 h-8 bg-white rounded-full border-4 border-fleet-purple -translate-x-1/2 z-10 hidden md:block" />
                
                {/* Step content */}
                <div className={`${index % 2 === 0 ? 'md:order-first' : 'md:order-last'}`}>
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="text-fleet-purple text-5xl font-bold mb-4 opacity-30">
                      {step.number}
                    </div>
                    <h3 className="text-2xl font-semibold mb-2">{step.title}</h3>
                    <p className="text-gray-600">{step.description}</p>
                  </div>
                </div>
                
                {/* Step illustration */}
                <div className={`hidden md:block ${index % 2 === 0 ? 'md:order-last pl-8' : 'md:order-first pr-8'}`}>
                  <div className="w-16 h-16 bg-fleet-purple/10 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-fleet-purple font-bold text-xl">{step.number}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Final step */}
          <div className="text-center mt-12 reveal reveal-bottom">
            <div className="inline-flex items-center gap-2 text-fleet-purple font-medium">
              <span>Start optimizing your fleet today</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
