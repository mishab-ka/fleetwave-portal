import React, { useEffect } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Team from "@/components/Team";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Target,
  Heart,
  Zap,
  Globe,
  Award,
  ArrowRight,
  Building2,
  Lightbulb,
  Shield,
  TrendingUp,
  Clock,
} from "lucide-react";

const TeamPage = () => {
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

  const values = [
    {
      icon: <Target className="w-8 h-8" />,
      title: "Innovation First",
      description:
        "We constantly push boundaries to create cutting-edge solutions that transform the fleet management industry.",
    },
    {
      icon: <Heart className="w-8 h-8" />,
      title: "Customer Centric",
      description:
        "Every decision we make is driven by our commitment to improving the lives of drivers and fleet operators.",
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Excellence",
      description:
        "We strive for excellence in everything we do, from code quality to customer service.",
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Collaboration",
      description:
        "We believe in the power of teamwork and diverse perspectives to solve complex challenges.",
    },
  ];

  const culture = [
    {
      icon: <Building2 className="w-6 h-6" />,
      title: "Modern Office",
      description:
        "State-of-the-art facilities in the heart of Dubai with flexible work arrangements.",
    },
    {
      icon: <Lightbulb className="w-6 h-6" />,
      title: "Learning Culture",
      description:
        "Continuous learning opportunities, workshops, and conferences to grow your skills.",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Work-Life Balance",
      description:
        "Flexible hours, remote work options, and generous time-off policies.",
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Career Growth",
      description:
        "Clear career paths, mentorship programs, and opportunities for advancement.",
    },
  ];

  const achievements = [
    {
      number: "3",
      label: "Founding Members",
      description:
        "Three visionary leaders driving innovation in fleet management",
    },
    {
      number: "21+",
      label: "Years Combined",
      description:
        "Decades of combined experience in technology and operations",
    },
    {
      number: "1000+",
      label: "Drivers Empowered",
      description:
        "Successfully onboarded and supported over 1000 drivers across the UAE",
    },
    {
      number: "50+",
      label: "Enterprise Clients",
      description:
        "Trusted by leading companies in transportation and logistics",
    },
  ];

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      <Navbar />

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-32 pb-20 bg-gradient-to-br from-fleet-purple/5 to-fleet-purple/10">
          <div className="absolute -top-24 -right-1/4 w-1/2 h-1/2 bg-fleet-purple/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-1/4 w-1/2 h-1/2 bg-fleet-purple/5 rounded-full blur-3xl" />

          <div className="container mx-auto px-6 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center max-w-4xl mx-auto"
            >
              <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm">
                <Users className="w-4 h-4 mr-2" />
                About Our Team
              </Badge>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-8">
                Meet Our <span className="text-gradient">Founding Team</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
                Three visionary leaders united by a common mission to transform
                fleet management through innovation, technology, and strategic
                growth.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button className="bg-fleet-purple hover:bg-fleet-purpleDark text-white px-8 py-4 text-lg rounded-lg">
                  <a href="#team">Meet Our Team</a>
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  className="border-fleet-purple text-fleet-purple hover:bg-fleet-purple/10 px-8 py-4 text-lg rounded-lg"
                >
                  <a href="mailto:careers@tawaaq.com">Join Us</a>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Company Values */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Our <span className="text-gradient">Values</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                These core values guide everything we do and shape our company
                culture.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {values.map((value, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card className="text-center p-8 hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
                    <CardContent className="p-0">
                      <div className="w-16 h-16 bg-fleet-purple/10 rounded-full flex items-center justify-center mx-auto mb-6 text-fleet-purple">
                        {value.icon}
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-4">
                        {value.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        {value.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Company Culture */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Our <span className="text-gradient">Culture</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                We foster an environment where creativity, collaboration, and
                growth thrive.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {culture.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="flex items-start space-x-4"
                >
                  <div className="w-12 h-12 bg-fleet-purple/10 rounded-lg flex items-center justify-center text-fleet-purple flex-shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {item.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Achievements */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Our <span className="text-gradient">Achievements</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Milestones that showcase our commitment to excellence and
                innovation.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {achievements.map((achievement, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="text-center"
                >
                  <div className="bg-gradient-to-br from-fleet-purple to-fleet-purpleDark rounded-2xl p-8 text-white">
                    <div className="text-4xl md:text-5xl font-bold mb-2">
                      {achievement.number}
                    </div>
                    <div className="text-lg font-semibold mb-3">
                      {achievement.label}
                    </div>
                    <p className="text-sm opacity-90">
                      {achievement.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Team Section */}
        <Team />

        {/* Join Us CTA */}
        <section className="py-20 bg-gradient-to-r from-fleet-purple to-fleet-purpleDark">
          <div className="container mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Ready to Join Our{" "}
                <span className="text-yellow-300">Mission</span>?
              </h2>
              <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
                We're always looking for talented individuals who share our
                passion for innovation and want to make a difference in the
                transportation industry.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button className="bg-white text-fleet-purple hover:bg-gray-100 px-8 py-4 text-lg rounded-lg font-semibold">
                  <a href="mailto:careers@tawaaq.com">View Open Positions</a>
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  className="border-white text-white hover:bg-white/10 px-8 py-4 text-lg rounded-lg"
                >
                  <a href="mailto:hello@tawaaq.com">Get in Touch</a>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default TeamPage;
