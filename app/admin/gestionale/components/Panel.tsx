import { ReactNode } from "react";

export function Panel({
  title,
  eyebrow,
  status,
  children,
}: {
  title: string;
  eyebrow: string;
  status?: "live" | "warning" | "error" | "offline";
  children: ReactNode;
}) {
  const dotColor = {
    live: "bg-[#3ECF8E]",
    warning: "bg-[#F2B155]",
    error: "bg-[#F0554D]",
    offline: "bg-[#4B5563]",
  }[status ?? "offline"];

  return (
    <section className="rounded-lg border border-[#232830] bg-[#14171C] p-5 flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#838C99] font-mono">
            {eyebrow}
          </p>
          <h2 className="text-[15px] font-semibold text-[#EDEFF2]">{title}</h2>
        </div>
        <span className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${dotColor}`} />
        </span>
      </header>
      <div className="text-sm text-[#C4CAD3]">{children}</div>
    </section>
  );
}
