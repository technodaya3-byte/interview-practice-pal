import { motion } from "framer-motion";
import { Briefcase, Mic, BarChart3 } from "lucide-react";

const steps = [
  {
    icon: Briefcase,
    step: "01",
    title: "Choose Your Role",
    description:
      "Select the job title, level, and industry. Our AI tailors questions to match real interviews at top companies.",
  },
  {
    icon: Mic,
    step: "02",
    title: "Simulate the Interview",
    description:
      "Answer questions via video or audio in a realistic timed environment. The AI adapts follow-ups based on your responses.",
  },
  {
    icon: BarChart3,
    step: "03",
    title: "Review Your Scorecard",
    description:
      "Get a detailed performance breakdown — filler words, confidence score, answer structure, and actionable improvements.",
  },
];

export const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24">
      <div className="container">
        <div className="text-center mb-16">
          <span className="label-text">How it works</span>
          <h2 className="text-display text-foreground mt-3">
            Three steps to interview confidence
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.2, 0, 0, 1] }}
              className="feedback-card group"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-md bg-primary/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-200">
                  <step.icon size={18} className="text-primary" />
                </div>
                <span className="text-label text-muted-foreground">{step.step}</span>
              </div>
              <h3 className="text-foreground font-medium text-base mb-2">{step.title}</h3>
              <p className="text-body text-muted-foreground">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
