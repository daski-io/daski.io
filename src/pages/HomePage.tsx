import { Hero } from '../components/home/Hero';
import { ServicesDirectory } from '../components/home/ServicesDirectory';
import { DemoBlock } from '../components/home/DemoBlock';
import { OpenStandards } from '../components/home/OpenStandards';
import { BottomCTAs } from '../components/home/BottomCTAs';
import type { PublicService } from '../lib/api';

interface HomePageProps {
  services: PublicService[];
  loading: boolean;
  error: string | null;
}

export function HomePage({ services, loading, error }: HomePageProps) {
  return (
    <>
      <Hero />
      <ServicesDirectory services={services} loading={loading} error={error} />
      <DemoBlock />
      <OpenStandards />
      <BottomCTAs />
    </>
  );
}
