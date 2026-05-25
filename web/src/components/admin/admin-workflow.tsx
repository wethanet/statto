import type { PropsWithChildren, ReactNode } from 'react';

type AdminSectionProps = PropsWithChildren<{
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
}>;

type AdminPanelProps = PropsWithChildren<{
  title: string;
  description?: string;
  actions?: ReactNode;
}>;

type AdminSummaryItem = {
  label: string;
  value: string;
  note?: string;
  tone?: 'neutral' | 'positive' | 'negative';
};

export function AdminSection({ actions, children, description, eyebrow, title }: AdminSectionProps) {
  return (
    <section className="admin-workflow-section">
      <div className="admin-workflow-section__header">
        <div className="stack-sm">
          {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
          <h3>{title}</h3>
          {description ? <p className="muted">{description}</p> : null}
        </div>
        {actions ? <div className="admin-workflow-section__actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function AdminActionPanel({ actions, children, description, title }: AdminPanelProps) {
  return (
    <section className="card stack admin-action-panel">
      <div className="admin-panel-header">
        <div className="stack-sm">
          <span className="eyebrow">Primary workflow</span>
          <h3>{title}</h3>
          {description ? <p className="muted">{description}</p> : null}
        </div>
        {actions ? <div className="inline-actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function AdminRecordList({ actions, children, description, title }: AdminPanelProps) {
  return (
    <section className="card stack admin-record-list">
      <div className="admin-panel-header">
        <div className="stack-sm">
          <span className="eyebrow">Records</span>
          <h3>{title}</h3>
          {description ? <p className="muted">{description}</p> : null}
        </div>
        {actions ? <div className="inline-actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function AdminSupportingPanel({ actions, children, description, title }: AdminPanelProps) {
  return (
    <section className="card stack admin-supporting-panel">
      <div className="admin-panel-header">
        <div className="stack-sm">
          <span className="eyebrow">Supporting tool</span>
          <h3>{title}</h3>
          {description ? <p className="muted">{description}</p> : null}
        </div>
        {actions ? <div className="inline-actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function AdminSummaryStrip({ items }: { items: AdminSummaryItem[] }) {
  return (
    <section className="admin-summary-strip">
      {items.map((item) => (
        <article className={`admin-summary-strip__item admin-summary-strip__item--${item.tone ?? 'neutral'}`} key={item.label}>
          <span className="eyebrow">{item.label}</span>
          <strong>{item.value}</strong>
          {item.note ? <span className="muted">{item.note}</span> : null}
        </article>
      ))}
    </section>
  );
}

export function AdminHelpText({ children }: PropsWithChildren) {
  return <p className="admin-help-text">{children}</p>;
}
