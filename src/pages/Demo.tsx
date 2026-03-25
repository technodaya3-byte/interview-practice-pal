import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Star, Play, Quote } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Software Engineer at Google",
    avatar: "",
    initials: "SC",
    rating: 5,
    quote:
      "InterviewPro completely transformed my prep. The AI feedback on filler words and structure helped me land my dream role after just two weeks of practice.",
  },
  {
    name: "Marcus Johnson",
    role: "Product Manager at Stripe",
    avatar: "",
    initials: "MJ",
    rating: 5,
    quote:
      "The real-time confidence scoring was a game changer. I went from nervous wreck to calm and collected. Highly recommend for anyone serious about interviews.",
  },
  {
    name: "Priya Patel",
    role: "Data Scientist at Meta",
    avatar: "",
    initials: "PP",
    rating: 5,
    quote:
      "I used InterviewPro for a week before my final round. The category breakdowns showed me exactly where I was weak — and I fixed it in time.",
  },
  {
    name: "David Kim",
    role: "UX Designer at Airbnb",
    avatar: "",
    initials: "DK",
    rating: 4,
    quote:
      "Love how realistic the mock sessions feel. The AI questions adapted to my role perfectly, and the feedback was more useful than any human mock I've done.",
  },
  {
    name: "Emily Rodriguez",
    role: "Marketing Lead at HubSpot",
    avatar: "",
    initials: "ER",
    rating: 5,
    quote:
      "From 60% to 92% in three sessions. The performance trends dashboard kept me motivated and focused on the right areas.",
  },
  {
    name: "James Okafor",
    role: "Backend Engineer at Shopify",
    avatar: "",
    initials: "JO",
    rating: 5,
    quote:
      "The structured feedback after each session is phenomenal. It broke down my answers into communication, confidence, and technical accuracy. Pure gold.",
  },
];

const demoVideos = [
  {
    title: "Getting Started with InterviewPro",
    description: "A quick walkthrough of setting up your first mock interview session and choosing your role.",
    thumbnail: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=640&q=80",
    duration: "3:24",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  {
    title: "AI Feedback in Action",
    description: "See how our AI analyzes your answers in real-time — filler words, confidence, and structure scoring.",
    thumbnail: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=640&q=80",
    duration: "5:12",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
  {
    title: "Tracking Your Progress",
    description: "Explore the performance dashboard — trend charts, category breakdowns, and session history.",
    thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=640&q=80",
    duration: "4:08",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, ease: [0.2, 0, 0, 1] as [number, number, number, number] },
} as const;

const Demo = () => {
  const [activeVideo, setActiveVideo] = useState<typeof demoVideos[number] | null>(null);
  return (
    <div className="min-h-screen bg-background">
      <Dialog open={!!activeVideo} onOpenChange={(open) => !open && setActiveVideo(null)}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>{activeVideo?.title}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video w-full">
            {activeVideo && (
              <iframe
                src={activeVideo.videoUrl}
                title={activeVideo.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16">
        <div className="container text-center max-w-3xl mx-auto">
          <motion.div {...fadeUp}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 mb-6">
              <Play size={12} className="text-primary" />
              <span className="text-xs font-medium text-primary">Demo & Testimonials</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
              See InterviewPro in action
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Watch how real users improved their interview skills and hear what they have to say.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Demo Videos */}
      <section className="py-16">
        <div className="container">
          <motion.h2
            {...fadeUp}
            className="text-2xl font-bold text-foreground mb-8 text-center"
          >
            Watch the Walkthroughs
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {demoVideos.map((video, i) => (
              <motion.div
                key={video.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Card className="overflow-hidden group cursor-pointer hover:shadow-md transition-shadow border-border" onClick={() => setActiveVideo(video)}>
                  <div className="relative">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-44 object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-foreground/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg">
                        <Play size={24} className="text-primary-foreground ml-1" />
                      </div>
                    </div>
                    <span className="absolute bottom-2 right-2 bg-foreground/80 text-background text-xs font-medium px-2 py-0.5 rounded">
                      {video.duration}
                    </span>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-foreground mb-1 text-sm">{video.title}</h3>
                    <p className="text-muted-foreground text-xs leading-relaxed">{video.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Loved by job seekers everywhere
            </h2>
            <p className="text-muted-foreground">Real results from real users.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <Card className="h-full border-border hover:shadow-md transition-shadow">
                  <CardContent className="p-6 flex flex-col h-full">
                    <Quote size={20} className="text-primary/30 mb-3" />
                    <p className="text-sm text-foreground/90 leading-relaxed flex-1 mb-4">
                      "{t.quote}"
                    </p>
                    <div className="flex items-center gap-3 pt-3 border-t border-border">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={t.avatar} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                          {t.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{t.role}</p>
                      </div>
                      <div className="ml-auto flex gap-0.5">
                        {Array.from({ length: t.rating }).map((_, s) => (
                          <Star key={s} size={12} className="fill-primary text-primary" />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container">
          <motion.div {...fadeUp} className="text-center max-w-lg mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-3">Ready to ace your next interview?</h2>
            <p className="text-muted-foreground mb-6">
              Join thousands of professionals already using InterviewPro.
            </p>
            <Button size="lg" className="gap-2 px-8" asChild>
              <Link to="/auth">Get Started Free <ArrowRight size={16} /></Link>
            </Button>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Demo;
