
import React, { useEffect } from "react";
import { 
  Car, Shield, Clock, Activity, Users, BarChart, 
  Zap, Map, Bell, FileText, Smartphone, Settings 
} from "lucide-react";

const FeatureCard = ({ 
  icon: Icon, 
  title, 
  description,
  delay = 0 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
  delay?: number;
}) => {
  return (
    <div 
      className="reveal reveal-bottom bg-white rounded-xl p-6 shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-md hover:border-fleet-purple/30 hover:transform hover:-translate-y-1"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="w-12 h-12 rounded-lg bg-fleet-purple/10 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-fleet-purple" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
};

const Features = () => {
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

  const features = [
    {
      icon: Car,
      title: "Real-time Tracking",
      description: "Monitor your vehicles in real-time with accurate GPS tracking and route history."
    },
    {
      icon: Map,
      title: "Route Optimization",
      description: "Save fuel and time with AI-powered route optimization for your fleet."
    },
    {
      icon: Shield,
      title: "Driver Safety",
      description: "Track driver behavior and safety metrics to reduce risks and accidents."
    },
    {
      icon: Users,
      title: "Driver Management",
      description: "Manage driver profiles, licenses, and certifications in one place."
    },
    {
      icon: Clock,
      title: "Maintenance Scheduling",
      description: "Automated maintenance alerts and service scheduling to prevent breakdowns."
    },
    {
      icon: Bell,
      title: "Instant Alerts",
      description: "Get notified about critical events and incidents in real-time."
    },
    {
      icon: BarChart,
      title: "Performance Analytics",
      description: "Comprehensive reports and insights to optimize your fleet operations."
    },
    {
      icon: FileText,
      title: "Digital Documentation",
      description: "Paperless management of all vehicle and driver documents."
    },
    {
      icon: Smartphone,
      title: "Mobile Access",
      description: "Access your fleet data anytime, anywhere from our mobile application."
    },
    {
      icon: Zap,
      title: "Fuel Efficiency",
      description: "Track and improve fuel consumption with detailed analytics."
    },
    {
      icon: Activity,
      title: "Expense Tracking",
      description: "Monitor and manage all fleet-related expenses and budgets."
    },
    {
      icon: Settings,
      title: "Customizable Dashboard",
      description: "Personalize your dashboard to focus on metrics that matter to you."
    }
  ];

  return (
    <section id="features" className="py-20 bg-fleet-offwhite relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-40 -right-20 w-80 h-80 bg-fleet-purple/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 -left-20 w-80 h-80 bg-fleet-purple/5 rounded-full blur-3xl" />
      
      <div className="container px-6 md:px-10 mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16 stagger-animation">
          <span className="inline-block py-1 px-3 bg-fleet-purple/10 text-fleet-purple rounded-full text-sm font-medium mb-4">
            Powerful Features
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need to Manage Your Fleet
          </h2>
          <p className="text-gray-600 text-lg">
            Our comprehensive platform offers all the tools you need to streamline operations,
            maximize efficiency, and ensure safety across your entire fleet.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <FeatureCard 
              key={index} 
              icon={feature.icon} 
              title={feature.title} 
              description={feature.description}
              delay={index * 50}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
