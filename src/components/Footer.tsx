export const Footer = () => {
  return (
    <footer className="border-t border-border py-10">
      <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-semibold text-xs">AI</span>
          </div>
          <span className="text-sm font-medium text-foreground">InterviewPro</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#" className="text-body text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
          <a href="#" className="text-body text-muted-foreground hover:text-foreground transition-colors">Terms</a>
          <a href="#" className="text-body text-muted-foreground hover:text-foreground transition-colors">Contact</a>
        </div>
        <p className="text-body text-muted-foreground">© 2026 InterviewPro</p>
      </div>
    </footer>
  );
};
