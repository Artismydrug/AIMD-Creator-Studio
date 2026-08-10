import { Link } from "wouter";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md p-6 border border-border bg-card">
        <div className="flex justify-center">
          <AlertCircle className="h-16 w-16 text-destructive" />
        </div>
        <h1 className="text-4xl font-black font-display uppercase tracking-tight">404 - Void</h1>
        <p className="text-muted-foreground font-mono">
          The page you are looking for has been erased from the pipeline.
        </p>
        <Link href="/">
          <span className="inline-block mt-4 bg-primary text-primary-foreground font-mono uppercase font-bold py-3 px-6 hover:bg-primary/90 cursor-pointer">
            Return to Surface
          </span>
        </Link>
      </div>
    </div>
  );
}
