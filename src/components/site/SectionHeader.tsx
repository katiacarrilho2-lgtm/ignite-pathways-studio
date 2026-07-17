interface Props {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  center?: boolean;
}
export const SectionHeader = ({ eyebrow, title, subtitle, center }: Props) => (
  <div className={`mb-12 ${center ? "text-center mx-auto max-w-2xl" : "max-w-3xl"}`}>
    {eyebrow && (
      <span className="inline-block text-xs font-semibold tracking-widest uppercase text-primary-glow mb-3">
        {eyebrow}
      </span>
    )}
    <h2 className="text-3xl md:text-5xl font-bold text-primary text-balance">{title}</h2>
    {subtitle && <p className="mt-4 text-lg text-muted-foreground">{subtitle}</p>}
  </div>
);