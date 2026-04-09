type RoutePlaceholderProps = {
  title: string;
  description: string;
};

export function RoutePlaceholder({ title, description }: RoutePlaceholderProps) {
  return (
    <section className="page-grid">
      <section className="panel">
        <span className="eyebrow">Migration backlog</span>
        <h2>{title}</h2>
        <p className="muted">{description}</p>
        <p className="muted">
          The route is intentionally registered now so we can migrate screens incrementally without changing
          the web app structure later.
        </p>
      </section>
    </section>
  );
}
