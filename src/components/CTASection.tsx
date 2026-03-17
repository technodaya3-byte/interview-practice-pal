import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export const CTASection = () => {
  return (
    <section className="py-24">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
          className="feedback-card max-w-3xl mx-auto text-center py-16 px-8"
        >
          <span className="label-text">Ready?</span>
          <h2 className="text-display text-foreground mt-3 mb-4">
            Your next interview is closer than you think
          </h2>
          <p className="text-body text-muted-foreground max-w-md mx-auto mb-8 text-base">
            Start with a free session. No credit card required. See your baseline score in under 10 minutes.
          </p>
          <Button size="lg" className="gap-2 px-8">
            Start Free Session <ArrowRight size={16} />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};
