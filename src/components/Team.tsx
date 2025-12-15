import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Linkedin,
  Twitter,
  Mail,
  MapPin,
  Users,
  Award,
  Star,
  Heart,
  Building2,
  Zap,
  Target,
} from "lucide-react";

interface TeamMember {
  id: number;
  name: string;
  role: string;
  position: string;
  image: string;
  bio: string;
  experience: string;
  location: string;
  linkedin?: string;
  twitter?: string;
  email?: string;
  achievements: string[];
  expertise: string[];
}

const teamMembers: TeamMember[] = [
  {
    id: 1,
    name: "Shuhaib Haris",
    role: "CEO & Founder",
    position: "Chief Executive Officer",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
    bio: "Visionary leader and strategic mastermind behind Tawaaq's mission to revolutionize fleet management in the UAE. Driving innovation and sustainable growth.",
    experience: "8+ Years",
    location: "Dubai, UAE",
    linkedin: "https://linkedin.com/in/shuhaib-haris",
    twitter: "https://twitter.com/shuhaib_haris",
    email: "shuhaib@tawaaq.com",
    achievements: [
      "Founded 3 successful startups",
      "Led 200+ team expansion",
      "Industry recognition 2023",
    ],
    expertise: ["Strategic Planning", "Business Development", "Leadership"],
  },
  {
    id: 2,
    name: "Mishab Abdul Samad",
    role: "CTO & Co-Founder",
    position: "Chief Technology Officer",
    image:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
    bio: "Tech innovator and software architect with deep expertise in scalable systems and cutting-edge technologies. Building the future of fleet management.",
    experience: "6+ Years",
    location: "Dubai, UAE",
    linkedin: "https://linkedin.com/in/mishab-samad",
    email: "mishab@tawaaq.com",
    achievements: [
      "Built 15+ scalable platforms",
      "AI/ML implementation expert",
      "Patent holder for fleet tech",
    ],
    expertise: ["Software Architecture", "AI/ML", "Cloud Technologies"],
  },
  {
    id: 3,
    name: "Ajnas P K",
    role: "GM & Co-Founder",
    position: "General Manager",
    image:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&crop=face",
    bio: "Operations specialist and business strategist with proven track record in scaling operations and building high-performing teams across multiple markets.",
    experience: "7+ Years",
    location: "Dubai, UAE",
    linkedin: "https://linkedin.com/in/ajnas-pk",
    email: "ajnas@tawaaq.com",
    achievements: [
      "Managed 500+ operations",
      "99.9% operational efficiency",
      "Market expansion expert",
    ],
    expertise: ["Operations Management", "Team Building", "Market Strategy"],
  },
];

const Team = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3,
      },
    },
  };

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 50,
      scale: 0.9,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut",
      },
    },
  };

  return (
    <section
      id="team"
      className="py-24 bg-gradient-to-br from-gray-50 via-white to-fleet-purple/5"
    >
      <div className="container mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <Badge variant="secondary" className="mb-6 px-6 py-3 text-base">
            <Users className="w-5 h-5 mr-2" />
            Leadership Team
          </Badge>
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-8">
            Meet Our <span className="text-gradient">Founding Team</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            The visionary minds behind Tawaaq's mission to transform fleet
            management. Our leadership team brings together decades of combined
            experience in technology, operations, and strategic growth.
          </p>
        </motion.div>

        {/* Team Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20"
        >
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-fleet-purple mb-3">
              3
            </div>
            <div className="text-gray-600 font-medium">Founding Members</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-fleet-purple mb-3">
              21+
            </div>
            <div className="text-gray-600 font-medium">Years Combined</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-fleet-purple mb-3">
              1000+
            </div>
            <div className="text-gray-600 font-medium">Drivers Empowered</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-fleet-purple mb-3">
              50+
            </div>
            <div className="text-gray-600 font-medium">Enterprise Clients</div>
          </div>
        </motion.div>

        {/* Team Members Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-7xl mx-auto"
        >
          {teamMembers.map((member, index) => (
            <motion.div key={member.id} variants={cardVariants}>
              <Card className="group relative overflow-hidden border-0 shadow-2xl bg-white/90 backdrop-blur-sm hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-2">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-gradient-to-br from-fleet-purple/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <CardContent className="p-8 relative z-10">
                  {/* Avatar and Basic Info */}
                  <div className="text-center mb-8">
                    {/* Background highlight for avatar */}
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-gradient-to-br from-fleet-purple/20 to-fleet-purple/5 rounded-full blur-xl transform scale-110 group-hover:scale-125 transition-transform duration-500"></div>
                      <div className="relative inline-block">
                        <Avatar className="w-40 h-40 mx-auto border-6 border-fleet-purple/30 group-hover:border-fleet-purple/60 transition-all duration-500 shadow-2xl hover:shadow-3xl transform group-hover:scale-105 hover:rotate-1">
                          <AvatarImage
                            src={member.image}
                            alt={member.name}
                            className="object-cover w-full h-full"
                          />
                          <AvatarFallback className="bg-gradient-to-br from-fleet-purple to-fleet-purpleDark text-white text-4xl font-bold">
                            {member.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-gradient-to-r from-fleet-purple to-fleet-purpleDark rounded-full flex items-center justify-center shadow-xl border-2 border-white">
                          <Star className="w-6 h-6 text-white" />
                        </div>
                        {/* Photo frame effect */}
                        <div className="absolute inset-0 rounded-full border-2 border-white/20 pointer-events-none"></div>
                      </div>
                    </div>

                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {member.name}
                    </h3>
                    <p className="text-fleet-purple font-semibold text-lg mb-1">
                      {member.role}
                    </p>
                    <p className="text-gray-500 text-sm mb-4">
                      {member.position}
                    </p>

                    {/* Experience and Location */}
                    <div className="flex items-center justify-center space-x-6 text-sm text-gray-500 mb-6">
                      <div className="flex items-center">
                        <Award className="w-4 h-4 mr-2 text-fleet-purple" />
                        {member.experience}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-fleet-purple" />
                        {member.location}
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  <p className="text-gray-600 text-base mb-6 leading-relaxed text-center">
                    {member.bio}
                  </p>

                  {/* Expertise */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 text-center">
                      Core Expertise
                    </h4>
                    <div className="flex flex-wrap justify-center gap-2">
                      {member.expertise.map((skill, skillIndex) => (
                        <Badge
                          key={skillIndex}
                          variant="secondary"
                          className="text-xs px-3 py-1 bg-fleet-purple/10 text-fleet-purple border-fleet-purple/20"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Achievements */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 text-center">
                      Key Achievements
                    </h4>
                    <ul className="space-y-2">
                      {member.achievements.map((achievement, index) => (
                        <li
                          key={index}
                          className="text-sm text-gray-600 flex items-start"
                        >
                          <Heart className="w-3 h-3 mr-2 mt-1 text-fleet-purple flex-shrink-0" />
                          <span>{achievement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Social Links */}
                  <div className="flex justify-center space-x-4 pt-6 border-t border-gray-100">
                    {member.linkedin && (
                      <a
                        href={member.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 text-gray-400 hover:text-fleet-purple hover:bg-fleet-purple/10 rounded-full transition-all duration-300"
                      >
                        <Linkedin className="w-5 h-5" />
                      </a>
                    )}
                    {member.twitter && (
                      <a
                        href={member.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 text-gray-400 hover:text-fleet-purple hover:bg-fleet-purple/10 rounded-full transition-all duration-300"
                      >
                        <Twitter className="w-5 h-5" />
                      </a>
                    )}
                    {member.email && (
                      <a
                        href={`mailto:${member.email}`}
                        className="p-3 text-gray-400 hover:text-fleet-purple hover:bg-fleet-purple/10 rounded-full transition-all duration-300"
                      >
                        <Mail className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Company Values Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-20"
        >
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Our <span className="text-gradient">Core Values</span>
            </h3>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              The principles that guide our leadership and shape our company
              culture
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-2xl bg-white/50 backdrop-blur-sm border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-fleet-purple to-fleet-purpleDark rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">
                Innovation
              </h4>
              <p className="text-gray-600">
                Constantly pushing boundaries to create cutting-edge solutions
              </p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-white/50 backdrop-blur-sm border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-fleet-purple to-fleet-purpleDark rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">
                Excellence
              </h4>
              <p className="text-gray-600">
                Striving for the highest standards in everything we do
              </p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-white/50 backdrop-blur-sm border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-fleet-purple to-fleet-purpleDark rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">Growth</h4>
              <p className="text-gray-600">
                Fostering continuous learning and development
              </p>
            </div>
          </div>
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-center mt-20"
        >
          <div className="bg-gradient-to-r from-fleet-purple to-fleet-purpleDark rounded-3xl p-12 text-white max-w-4xl mx-auto">
            <h3 className="text-3xl font-bold mb-6">Join Our Mission</h3>
            <p className="text-xl mb-8 opacity-90 leading-relaxed">
              We're building the future of fleet management and always looking
              for talented individuals who share our passion for innovation and
              excellence.
            </p>
            <a
              href="mailto:careers@tawaaq.com"
              className="inline-flex items-center px-8 py-4 bg-white text-fleet-purple font-semibold rounded-xl hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              <Mail className="w-5 h-5 mr-2" />
              View Open Positions
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Team;
