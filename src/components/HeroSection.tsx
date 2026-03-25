import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import heroMockup from "@/assets/hero-mockup.jpg";

export const HeroSection = () => {
  return (
    <section className="pt-32 pb-20 relative overflow-hidden">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="container relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
          className="text-center max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-ring" />
            <span className="text-label text-primary">AI-Powered Interview Prep</span>
          </div>

          <h1 className="text-display text-foreground mb-6" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
            Master the room<br />before you enter it.
          </h1>

          <p className="text-body text-muted-foreground max-w-xl mx-auto mb-10 text-lg">
            Realistic mock interviews with AI analysis. Get surgical feedback on your answers, 
            body language, and delivery — so you walk in ready.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Button size="lg" className="gap-2 px-6" asChild>
              <Link to="/auth">Start Practicing <ArrowRight size={16} /></Link>
            </Button>
            <Button variant="outline" size="lg" className="gap-2 px-6" asChild>
              <Link to="/demo"><Play size={14} /> Watch Demo</Link>
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.2, 0, 0, 1] }}
          className="mt-16 max-w-5xl mx-auto"
        >
          <div className="rounded-lg overflow-hidden shadow-lg border border-border">
            <img
              src={heroMockup}
              alt="InterviewPro AI-powered mock interview interface showing real-time analysis"
              className="w-full h-auto"
              loading="eager"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};
