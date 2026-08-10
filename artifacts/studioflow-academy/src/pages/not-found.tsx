import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground relative overflow-hidden p-6 text-center">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      
      <div className="relative z-10 space-y-6">
        <h1 className="text-[12rem] font-black tracking-tighter leading-none text-primary/20 select-none">404</h1>
        
        <div className="space-y-2 relative z-20 -mt-16">
          <h2 className="text-3xl font-black tracking-tighter uppercase">Page Not Found</h2>
          <p className="text-muted-foreground font-mono text-sm max-w-md mx-auto">
            You've wandered off the path. Get back to the studio and keep grinding.
          </p>
        </div>

        <Link href="/dashboard" className="inline-block mt-8">
          <Button className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-widest uppercase text-xs rounded-none">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Hub
          </Button>
        </Link>
      </div>
    </div>
  );
}
