import { useState, useEffect, useRef, useCallback } from "react";
import { 
  useListHabits, 
  useCreateHabit, 
  useDeleteHabit, 
  useLogHabitSession,
  getListHabitsQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Play, Square, Plus, Flame, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const habitSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  category: z.string().min(1, "Category is required"),
  targetMinutes: z.coerce.number().min(1, "Target minutes must be at least 1"),
});

export default function Habits() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: habits, isLoading } = useListHabits();
  const createHabit = useCreateHabit();
  const deleteHabit = useDeleteHabit();
  const logSession = useLogHabitSession();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTimerId, setActiveTimerId] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const form = useForm<z.infer<typeof habitSchema>>({
    resolver: zodResolver(habitSchema),
    defaultValues: {
      name: "",
      category: "Technique",
      targetMinutes: 15,
    }
  });

  const onSubmit = (values: z.infer<typeof habitSchema>) => {
    createHabit.mutate({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListHabitsQueryKey() });
        setIsCreateOpen(false);
        form.reset();
        toast({ title: "Habit Created", description: "Stay disciplined." });
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteHabit.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListHabitsQueryKey() });
      }
    });
  };

  // Timer logic
  const startTimer = (habitId: number, targetMinutes: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setActiveTimerId(habitId);
    setTimeLeft(targetMinutes * 60);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setActiveTimerId(null);
    setTimeLeft(0);
  };

  const logSessionMutate = logSession.mutate;
  const logTimerSession = useCallback((habitId: number, targetMinutes: number, currentLeft: number) => {
    const minutesSpent = Math.ceil((targetMinutes * 60 - currentLeft) / 60);
    if (minutesSpent > 0) {
      logSessionMutate({ id: habitId, data: { minutesSpent } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListHabitsQueryKey() });
          toast({ title: "Session Logged", description: `Logged ${minutesSpent} min. Good work.` });
        }
      });
    }
    stopTimer();
  }, [logSessionMutate, queryClient, toast]);

  const habitsRef = useRef(habits);
  habitsRef.current = habits;

  useEffect(() => {
    if (activeTimerId !== null && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (activeTimerId !== null && timeLeft === 0) {
      // Auto complete when timer hits 0
      const habit = habitsRef.current?.find(h => h.id === activeTimerId);
      if (habit) {
        logTimerSession(habit.id, habit.targetMinutes, 0);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeTimerId, timeLeft, logTimerSession]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase">Habits</h1>
          <p className="text-muted-foreground font-mono text-sm">Every day counts.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="font-bold tracking-widest uppercase text-xs rounded-none bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              New Habit
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-card border-border rounded-none">
            <DialogHeader>
              <DialogTitle className="uppercase font-black tracking-tighter text-2xl">Create Habit</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="e.g. Line Work Practice" className="bg-background border-border rounded-none h-12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-background border-border rounded-none h-12">
                              <SelectValue placeholder="Category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-none">
                            <SelectItem value="Technique">Technique</SelectItem>
                            <SelectItem value="Theory">Theory</SelectItem>
                            <SelectItem value="Creation">Creation</SelectItem>
                            <SelectItem value="Admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="targetMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input type="number" placeholder="Target Minutes" className="bg-background border-border rounded-none h-12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" disabled={createHabit.isPending} className="w-full h-12 font-bold tracking-widest uppercase text-xs rounded-none">
                  {createHabit.isPending ? "Creating..." : "Add to Routine"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full bg-card rounded-lg" />)
        ) : habits && habits.length > 0 ? (
          habits.map((habit) => {
            const isTimerActive = activeTimerId === habit.id;
            
            return (
              <div 
                key={habit.id} 
                className={`p-6 border rounded-lg transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6 ${
                  habit.completedToday 
                    ? "bg-card/50 border-white/5 opacity-70" 
                    : isTimerActive 
                      ? "bg-primary/5 border-primary shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                      : "bg-card border-border hover:border-primary/30"
                }`}
              >
                <div className="flex items-center gap-4 flex-1">
                  {habit.completedToday ? (
                    <div className="w-12 h-12 rounded bg-primary/20 flex items-center justify-center text-primary shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded bg-background border border-border flex items-center justify-center text-muted-foreground font-mono font-bold text-lg shrink-0">
                      {habit.targetMinutes}'
                    </div>
                  )}
                  
                  <div>
                    <h3 className={`font-bold text-lg tracking-tight ${habit.completedToday ? 'line-through text-muted-foreground' : ''}`}>
                      {habit.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs font-mono text-muted-foreground uppercase tracking-widest">
                      <span>{habit.category}</span>
                      {habit.currentStreak > 0 && (
                        <span className="flex items-center gap-1 text-primary">
                          <Flame className="w-3.5 h-3.5" />
                          {habit.currentStreak} Day Streak
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  {!habit.completedToday && (
                    <div className="flex items-center gap-3 flex-1 md:flex-initial">
                      {isTimerActive ? (
                        <div className="flex items-center gap-4 bg-background border border-primary/50 px-4 py-2 rounded flex-1 md:flex-initial justify-between">
                          <span className="font-mono text-xl font-bold text-primary tabular-nums">
                            {formatTime(timeLeft)}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => logTimerSession(habit.id, habit.targetMinutes, timeLeft)}
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/20"
                          >
                            <Square className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          onClick={() => startTimer(habit.id, habit.targetMinutes)}
                          disabled={activeTimerId !== null}
                          className="h-10 px-6 font-bold tracking-widest uppercase text-[10px] rounded-none bg-white/5 hover:bg-primary hover:text-primary-foreground text-foreground flex-1 md:flex-initial"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Start Session
                        </Button>
                      )}
                    </div>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDelete(habit.id)}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-20 bg-card border border-dashed border-border rounded-lg">
            <h3 className="text-xl font-bold mb-2">No habits tracked yet</h3>
            <p className="text-muted-foreground mb-6">Discipline starts with a single habit.</p>
            <Button onClick={() => setIsCreateOpen(true)} className="rounded-none font-bold tracking-widest uppercase text-xs">
              Create First Habit
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
