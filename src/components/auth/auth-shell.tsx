import { LockKeyhole, ShieldCheck, Sparkles, UserRoundCheck } from "lucide-react";
import Link from "next/link";

const trustPoints = [
  { icon: ShieldCheck, text: "Every transaction is recorded and traceable" },
  { icon: LockKeyhole, text: "Your account is protected with secure sessions" },
  { icon: UserRoundCheck, text: "Built around real banking safeguards" },
];

export function AuthShell({ children, title, subtitle }: Readonly<{ children: React.ReactNode; title: string; subtitle: string }>) {
  return <main className="min-h-screen bg-background lg:grid lg:grid-cols-[minmax(360px,0.85fr)_1.15fr]">
    <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#0F2A4A] via-[#123b5c] to-[#087f78] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
      <div className="absolute -right-32 top-16 size-96 rounded-full border-[48px] border-white/5" />
      <div className="relative"><Link href="/" className="flex items-center gap-3 text-xl font-bold tracking-tight"><span className="grid size-10 place-items-center rounded-xl bg-[#14B8A6]"><ShieldCheck className="size-5" /></span>SecureTx</Link><div className="mt-28 max-w-md"><p className="mb-5 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-[#7de5d7]"><Sparkles className="size-4" /> Trusted money movement</p><h1 className="text-5xl font-bold leading-[1.08] tracking-tight">Banking with clarity and confidence.</h1><p className="mt-6 text-lg leading-8 text-white/70">A secure place to manage your money, built for the moments that matter.</p></div></div>
      <div className="relative space-y-5 text-sm text-white/80">{trustPoints.map(({ icon: Icon, text }) => <div className="flex items-center gap-3" key={text}><span className="grid size-9 place-items-center rounded-lg bg-white/10 text-[#7de5d7]"><Icon className="size-4" /></span>{text}</div>)}</div>
    </section>
    <section className="flex min-h-screen items-center justify-center p-5 sm:p-10"><div className="w-full max-w-md"><div className="mb-10 lg:hidden"><Link href="/" className="flex items-center gap-2 text-xl font-bold text-primary"><span className="grid size-9 place-items-center rounded-lg bg-accent text-white"><ShieldCheck className="size-5" /></span>SecureTx</Link></div><div className="mb-8"><h2 className="text-3xl font-bold tracking-tight text-primary">{title}</h2><p className="mt-2 text-muted-foreground">{subtitle}</p></div>{children}<p className="mt-8 text-center text-xs text-muted-foreground">SecureTx demo environment · Your data stays protected</p></div></section>
  </main>;
}