import { useParams } from 'wouter';
import { MarketingNav } from '@/components/MarketingNav';
import { WorkshopView } from '@/components/workshop/WorkshopView';

export default function LearnDetail() {
  const { id } = useParams();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />
      <WorkshopView id={Number(id)} backHref="/learn" />
    </div>
  );
}
