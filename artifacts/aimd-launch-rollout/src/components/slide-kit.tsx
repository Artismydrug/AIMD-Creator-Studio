import type { ReactNode } from 'react';

export function SlideShell({
  children,
  dark = false,
  className = '',
}: {
  children: ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`slide-shell relative h-screen w-full overflow-hidden ${
        dark ? 'bg-[#191715] text-[#F8F5EE]' : 'bg-[#F8F5EE] text-[#191715]'
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function Eyebrow({
  children,
  light = false,
}: {
  children: ReactNode;
  light?: boolean;
}) {
  return (
    <div
      className={`eyebrow text-[1.1vw] ${
        light ? 'text-[#FF7B45]' : 'text-[#FF4D00]'
      }`}
    >
      {children}
    </div>
  );
}

export function PageNo({ value, light = false }: { value: string; light?: boolean }) {
  return (
    <div
      className={`absolute right-[3.2vw] top-[2.8vw] text-[0.85vw] font-bold tracking-[0.2em] ${
        light ? 'text-[#F8F5EE]/55' : 'text-[#191715]/55'
      }`}
    >
      {value}
    </div>
  );
}

export function CornerMark({ light = false }: { light?: boolean }) {
  return (
    <div
      className={`absolute right-[4vw] top-[3.8vw] h-[5vw] w-[5vw] rounded-full border-[0.14vw] ${
        light ? 'border-[#F8F5EE]' : 'border-[#191715]'
      }`}
    />
  );
}

export function ArrowMark({ light = false }: { light?: boolean }) {
  return (
    <span className={`inline-block text-[2.2vw] leading-none ${light ? 'text-[#FF7B45]' : 'text-[#FF4D00]'}`}>
      ↗
    </span>
  );
}

export function OrangeRule() {
  return <div className="orange-rule" />;
}

export function NumberedPoint({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[3.5vw_1fr] gap-[1vw] border-t border-[#191715]/20 pt-[1.1vw]">
      <div className="text-[1.5vw] font-extrabold text-[#FF4D00]">{number}</div>
      <div>
        <h3 className="mb-[0.45vw] text-[1.65vw] font-extrabold tracking-[-0.04em]">{title}</h3>
        <p className="body-tight text-[1.25vw] text-[#5D5752]">{children}</p>
      </div>
    </div>
  );
}

export function PhaseCard({
  number,
  label,
  title,
  children,
  dark = false,
}: {
  number: string;
  label: string;
  title: string;
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <div
      className={`relative flex h-full flex-col justify-between rounded-[1.2vw] p-[2vw] ${
        dark ? 'bg-[#191715] text-[#F8F5EE]' : 'bg-[#FF4D00] text-[#191715]'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="text-[3.8vw] font-black leading-none tracking-[-0.08em]">{number}</div>
        <div className="eyebrow text-[0.9vw] opacity-75">{label}</div>
      </div>
      <div>
        <h3 className="mb-[0.8vw] text-[2.1vw] font-extrabold leading-[0.95] tracking-[-0.055em]">{title}</h3>
        <p className={`body-tight text-[1.2vw] ${dark ? 'text-[#F8F5EE]/70' : 'text-[#191715]/78'}`}>
          {children}
        </p>
      </div>
    </div>
  );
}