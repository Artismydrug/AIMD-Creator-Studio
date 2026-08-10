import { useListEnrollments } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { BookOpen, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export default function Enrollments() {
  const { data: enrollments, isLoading } = useListEnrollments({ query: { queryKey: ['listEnrollments'] } });

  if (isLoading) return <div className="p-8 font-mono animate-pulse">Loading active courses...</div>;

  return (
    <div className="p-6 md:p-10 space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
        <div>
          <h1 className="text-4xl md:text-5xl font-black font-display uppercase tracking-tight">My Courses</h1>
          <p className="text-muted-foreground font-mono mt-2">Pick up where you left off.</p>
        </div>
        <Link href="/workshops">
          <Button variant="outline" className="rounded-none font-mono uppercase text-xs border-primary/50 text-primary">
            Browse Academy
          </Button>
        </Link>
      </header>

      {enrollments?.length === 0 ? (
        <div className="py-24 text-center border border-dashed border-border bg-card">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold font-display uppercase mb-2">No Active Enrollments</h3>
          <p className="text-muted-foreground font-mono text-sm mb-6">Enroll in a workshop to start learning.</p>
          <Link href="/workshops">
            <Button className="rounded-none bg-primary text-primary-foreground font-mono uppercase">Go to Academy</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {enrollments?.map(enrollment => (
            <div key={enrollment.id} className="border border-border bg-card p-6 flex flex-col md:flex-row gap-8 items-center group hover:border-primary/50 transition-colors">
              <div className="w-full md:w-64 h-32 bg-muted relative shrink-0">
                {enrollment.workshopThumbnailUrl ? (
                  <img src={enrollment.workshopThumbnailUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt="" />
                ) : (
                  <div className="w-full h-full bg-background flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-border" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 w-full space-y-4">
                <div>
                  <div className="font-mono text-xs uppercase text-primary mb-1">
                    {enrollment.status === 'completed' ? 'Completed' : 'In Progress'}
                  </div>
                  <h3 className="text-2xl font-bold font-display uppercase">{enrollment.workshopTitle}</h3>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-mono text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-bold">{enrollment.completedModules} / {enrollment.totalModules} Mods</span>
                  </div>
                  <Progress value={enrollment.progressPercent} className="h-2 rounded-none bg-background [&>div]:bg-primary" />
                </div>
              </div>

              <div className="w-full md:w-auto shrink-0 flex items-center justify-end">
                <Link href={`/workshops/${enrollment.workshopId}`}>
                  <Button className="w-full md:w-auto rounded-none font-mono uppercase h-12 px-8 bg-foreground text-background hover:bg-foreground/90">
                    <Play className="w-4 h-4 mr-2" />
                    {enrollment.progressPercent === 0 ? 'Start' : enrollment.progressPercent === 100 ? 'Review' : 'Resume'}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
