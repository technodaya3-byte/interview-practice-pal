import { motion } from "framer-motion";

const stats = [
  { value: "94%", label: "Users report feeling more confident" },
  { value: "2.3×", label: "More likely to receive an offer" },
  { value: "12K+", label: "Mock interviews completed" },
  { value: "-38%", label: "Reduction in filler words" },
];

export const StatsSection = () => {
  return (
    <section className="py-20">
      <div className="container">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-4xl mx-auto">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08, ease: [0.2, 0, 0, 1] }}
              className="text-center"
            >
              <div className="text-3xl font-semibold text-foreground tracking-tight mb-1 timer">
                {stat.value}
              </div>
              <p className="text-body text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
