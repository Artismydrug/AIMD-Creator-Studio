import { useState } from "react";
import { 
  useListStudioPosts, 
  useCreateStudioPost, 
  useLikeStudioPost,
  getListStudioPostsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Heart, MessageSquare, Share2, ImagePlus, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const postSchema = z.object({
  caption: z.string().min(1, "Caption is required"),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  tags: z.string().optional(),
});

export default function StudioLog() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: posts, isLoading } = useListStudioPosts({ limit: 20 });
  const createPost = useCreateStudioPost();
  const likePost = useLikeStudioPost();

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const form = useForm<z.infer<typeof postSchema>>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      caption: "",
      imageUrl: "",
      tags: "",
    }
  });

  const onSubmit = (values: z.infer<typeof postSchema>) => {
    const tagsArray = values.tags 
      ? values.tags.split(",").map(t => t.trim()).filter(Boolean)
      : undefined;

    createPost.mutate({ 
      data: { 
        caption: values.caption, 
        imageUrl: values.imageUrl || null, 
        tags: tagsArray 
      } 
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStudioPostsQueryKey() });
        setIsCreateOpen(false);
        form.reset();
        toast({ title: "Posted to Log", description: "Your progress is live." });
      }
    });
  };

  const handleLike = (id: number, currentLiked: boolean) => {
    // Optimistic-like UI update could go here
    likePost.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStudioPostsQueryKey() });
      }
    });
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase">Studio Log</h1>
          <p className="text-muted-foreground font-mono text-sm">Document the process. Prove the work.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="font-bold tracking-widest uppercase text-xs rounded-none bg-primary text-primary-foreground hover:bg-primary/90">
              <ImagePlus className="w-4 h-4 mr-2" />
              New Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-card border-border rounded-none">
            <DialogHeader>
              <DialogTitle className="uppercase font-black tracking-tighter text-2xl">Log Progress</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Image URL (optional)" className="bg-background border-border rounded-none h-12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.watch("imageUrl") && (
                  <div className="aspect-video w-full bg-background border border-border overflow-hidden">
                    <img 
                      src={form.watch("imageUrl")} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  </div>
                )}
                <FormField
                  control={form.control}
                  name="caption"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea 
                          placeholder="What did you work on today?" 
                          className="bg-background border-border rounded-none resize-none h-24" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Tags (comma separated)" className="bg-background border-border rounded-none h-12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={createPost.isPending} className="w-full h-12 font-bold tracking-widest uppercase text-xs rounded-none">
                  {createPost.isPending ? "Posting..." : "Publish Entry"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="columns-1 md:columns-2 gap-6 space-y-6 pb-20">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="break-inside-avoid mb-6">
              <Skeleton className="h-[300px] w-full bg-card rounded-lg" />
            </div>
          ))
        ) : posts && posts.length > 0 ? (
          posts.map((post) => (
            <div key={post.id} className="break-inside-avoid mb-6 bg-card border border-border rounded-lg overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-4 flex items-center gap-3">
                <Avatar className="w-8 h-8 rounded-sm border border-border">
                  <AvatarImage src={post.userAvatarUrl || ""} />
                  <AvatarFallback className="rounded-sm bg-background text-xs"><User className="w-4 h-4" /></AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-bold text-sm tracking-tight">{post.username || "Creator"}</div>
                  <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
                    {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                  </div>
                </div>
              </div>
              
              {/* Image */}
              {post.imageUrl && (
                <div className="w-full bg-background border-y border-border">
                  <img src={post.imageUrl} alt={post.caption} className="w-full h-auto object-cover max-h-[500px]" />
                </div>
              )}
              
              {/* Body */}
              <div className="p-4 space-y-3">
                <p className="text-sm leading-relaxed">{post.caption}</p>
                
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map(tag => (
                      <span key={tag} className="text-xs font-mono text-primary/80">#{tag}</span>
                    ))}
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex items-center gap-4 pt-3 border-t border-white/5 mt-3">
                  <button 
                    onClick={() => handleLike(post.id, !!post.likedByMe)}
                    disabled={likePost.isPending}
                    className={`flex items-center gap-1.5 text-xs font-bold font-mono transition-colors ${post.likedByMe ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <Heart className={`w-4 h-4 ${post.likedByMe ? 'fill-current' : ''}`} />
                    {post.likes}
                  </button>
                  <button className="flex items-center gap-1.5 text-xs font-bold font-mono text-muted-foreground hover:text-foreground transition-colors">
                    <MessageSquare className="w-4 h-4" />
                    Reply
                  </button>
                  <button className="flex items-center gap-1.5 text-xs font-bold font-mono text-muted-foreground hover:text-foreground transition-colors ml-auto">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center border border-dashed border-border rounded-lg text-muted-foreground">
            No studio logs yet. Be the first to post your progress.
          </div>
        )}
      </div>
    </div>
  );
}
