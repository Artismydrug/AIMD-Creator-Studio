import { useEffect, type ReactNode } from 'react';
import { Link } from 'wouter';

export function PublicLegalPage({ title, description, children }: {
  title: string; description: string; children: ReactNode;
}) {
  useEffect(() => {
    document.title = `${title} | Creator Studio by AIMD`;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const created = !meta;
    const previous = meta?.content;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = description;
    return () => {
      if (created) meta?.remove();
      else if (meta && previous !== undefined) meta.content = previous;
    };
  }, [title, description]);
  return (
    <main className="min-h-screen bg-[#FAF7F2] px-5 py-8 text-[#2C2623] md:px-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-block py-3 text-sm font-semibold underline underline-offset-4">
          Creator Studio by AIMD
        </Link>
        <header className="border-b border-[#E8E2D9] py-10">
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">{title}</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[#6E6660]">{description}</p>
        </header>
        <div className="space-y-8 py-10 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_p]:leading-7 [&_a]:underline [&_a]:underline-offset-4 [&_li]:leading-7">
          {children}
        </div>
        <nav aria-label="Policies and support" className="flex flex-wrap gap-x-6 gap-y-2 border-t border-[#E8E2D9] py-6 text-sm font-semibold">
          <Link href="/privacy" className="py-3 underline">Privacy</Link>
          <Link href="/terms" className="py-3 underline">Terms & community standards</Link>
          <Link href="/support" className="py-3 underline">Help & support</Link>
        </nav>
      </div>
    </main>
  );
}
