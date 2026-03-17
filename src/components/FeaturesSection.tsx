import { motion } from "framer-motion";
import { Brain, Video, FileText, TrendingUp, Clock, Shield } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI-Adaptive Questions",
    description: "Questions that evolve based on your answers, simulating a real interviewer's follow-up logic.",
  },
  {
    icon: Video,
    title: "Video & Audio Analysis",
    description: "Track eye contact patterns, speaking pace, and filler word frequency across sessions.",
  },
  {
    icon: FileText,
    title: "Resume-Driven Prep",
    description: "Upload your resume and get questions tailored to your experience gaps and strengths.",
  },
  {
    icon: TrendingUp,
    title: "Performance Trends",
    description: "See your improvement over time with detailed scoring across multiple dimensions.",
  },
  {
    icon: Clock,
    title: "Timed Simulations",
    description: "Practice under realistic time pressure with configurable session lengths.",
  },
  {
    icon: Shield,
    title: "Industry-Specific Banks",
    description: "Question banks curated for tech, finance, consulting, healthcare, and more.",
  },
];

export const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-secondary/50">
      <div className="container">
        <div className="text-center mb-16">
          <span className="label-text">Features</span>
          <h2 className="text-display text-foreground mt-3">
            Built for serious preparation
          </h2>
          <p className="text-body text-muted-foreground mt-4 max-w-lg mx-auto text-base">
            Every feature is designed to reduce anxiety through realistic simulation and data-driven feedback.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06, ease: [0.2, 0, 0, 1] }}
              className="feedback-card"
            >
              <div className="w-9 h-9 rounded-md bg-primary/5 flex items-center justify-center mb-4">
                <feature.icon size={16} className="text-primary" />
              </div>
              <h3 className="text-foreground font-medium text-sm mb-1.5">{feature.title}</h3>
              <p className="text-body text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
