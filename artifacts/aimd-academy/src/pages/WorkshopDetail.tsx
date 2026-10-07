import { useParams } from 'wouter';
import { WorkshopView } from '@/components/workshop/WorkshopView';

export default function WorkshopDetail() {
  const { id } = useParams();
  return <WorkshopView id={Number(id)} backHref="/workshops" />;
}
