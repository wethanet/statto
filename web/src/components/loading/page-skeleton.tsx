type SkeletonBlockProps = {
  width?: string;
  height?: string;
  className?: string;
};

function SkeletonBlock({ className, height, width }: SkeletonBlockProps) {
  return (
    <span
      aria-hidden="true"
      className={className ? `skeleton-block ${className}` : 'skeleton-block'}
      style={{
        width,
        height,
      }}
    />
  );
}

function LoadingHero({
  eyebrowWidth,
  titleWidth,
  bodyWidth,
}: {
  eyebrowWidth: string;
  titleWidth: string;
  bodyWidth: string;
}) {
  return (
    <section className="panel stack">
      <SkeletonBlock className="skeleton-block--eyebrow" width={eyebrowWidth} />
      <SkeletonBlock className="skeleton-block--title" width={titleWidth} />
      <SkeletonBlock className="skeleton-block--text" width={bodyWidth} />
    </section>
  );
}

function LoadingListCards({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <section key={index} className="card stack schedule-card skeleton-card">
          <div className="schedule-card__layout">
            <div className="stack-sm schedule-card__main">
              <SkeletonBlock className="skeleton-block--title" width="54%" />
              <SkeletonBlock className="skeleton-block--text" width="38%" />
              <SkeletonBlock className="skeleton-block--text" width="28%" />
            </div>

            <div className="schedule-card__side">
              <SkeletonBlock className="skeleton-block--button" width="132px" />
              <div className="schedule-card__status skeleton-card__metrics">
                <SkeletonBlock className="skeleton-block--chip" width="88px" />
                <SkeletonBlock className="skeleton-block--chip" width="104px" />
                <SkeletonBlock className="skeleton-block--chip" width="96px" />
              </div>
            </div>
          </div>
        </section>
      ))}
    </>
  );
}

function HomeSkeleton() {
  return (
    <section className="page-grid home-dashboard">
      <section className="home-hero skeleton-panel">
        <div className="home-hero__copy">
          <SkeletonBlock className="skeleton-block--eyebrow" width="138px" />
          <SkeletonBlock className="skeleton-block--hero-title" width="72%" />
          <SkeletonBlock className="skeleton-block--text" width="86%" />
          <div className="home-hero__actions">
            <SkeletonBlock className="skeleton-block--button" width="138px" />
            <SkeletonBlock className="skeleton-block--button" width="154px" />
            <SkeletonBlock className="skeleton-block--button" width="112px" />
          </div>
        </div>

        <section className="home-hero__spotlight skeleton-panel skeleton-panel--contrast">
          <div className="home-hero__spotlight-header">
            <SkeletonBlock className="skeleton-block--logo" width="64px" height="64px" />
            <div className="stack-sm">
              <SkeletonBlock className="skeleton-block--eyebrow skeleton-block--contrast" width="96px" />
              <SkeletonBlock className="skeleton-block--title skeleton-block--contrast" width="168px" />
            </div>
          </div>
          <SkeletonBlock className="skeleton-block--text skeleton-block--contrast" width="66%" />
          <SkeletonBlock className="skeleton-block--text skeleton-block--contrast" width="52%" />
          <SkeletonBlock className="skeleton-block--text skeleton-block--contrast" width="44%" />
        </section>
      </section>

      <section className="home-summary-grid">
        {Array.from({ length: 4 }, (_, index) => (
          <section key={index} className="card stack-sm skeleton-card">
            <SkeletonBlock className="skeleton-block--eyebrow" width="96px" />
            <SkeletonBlock className="skeleton-block--stat" width="64px" />
            <SkeletonBlock className="skeleton-block--text" width="88px" />
          </section>
        ))}
      </section>

      <section className="home-dashboard__grid">
        <section className="card stack skeleton-card">
          <SkeletonBlock className="skeleton-block--title" width="180px" />
          <div className="home-focus-grid">
            {Array.from({ length: 2 }, (_, index) => (
              <section key={index} className="home-focus-card skeleton-card">
                <SkeletonBlock className="skeleton-block--eyebrow" width="108px" />
                <SkeletonBlock className="skeleton-block--title" width="72%" />
                <SkeletonBlock className="skeleton-block--text" width="58%" />
                <SkeletonBlock className="skeleton-block--chip" width="120px" />
              </section>
            ))}
          </div>
        </section>

        <section className="card stack skeleton-card">
          <SkeletonBlock className="skeleton-block--title" width="160px" />
          <div className="home-action-list">
            {Array.from({ length: 3 }, (_, index) => (
              <section key={index} className="home-action-row skeleton-card">
                <div className="stack-sm">
                  <SkeletonBlock className="skeleton-block--title" width="180px" />
                  <SkeletonBlock className="skeleton-block--text" width="240px" />
                </div>
                <SkeletonBlock className="skeleton-block--button" width="120px" />
              </section>
            ))}
          </div>
        </section>
      </section>
    </section>
  );
}

function ListSkeleton({
  eyebrowWidth,
  titleWidth,
  bodyWidth,
}: {
  eyebrowWidth: string;
  titleWidth: string;
  bodyWidth: string;
}) {
  return (
    <section className="page-grid">
      <LoadingHero eyebrowWidth={eyebrowWidth} titleWidth={titleWidth} bodyWidth={bodyWidth} />
      <LoadingListCards count={3} />
    </section>
  );
}

function DetailSkeleton({
  eyebrowWidth,
  titleWidth,
  bodyWidth,
}: {
  eyebrowWidth: string;
  titleWidth: string;
  bodyWidth: string;
}) {
  return (
    <section className="page-grid">
      <LoadingHero eyebrowWidth={eyebrowWidth} titleWidth={titleWidth} bodyWidth={bodyWidth} />

      <section className="card stack skeleton-card">
        <div className="split-row availability-summary__header">
          <div className="stack-sm">
            <SkeletonBlock className="skeleton-block--title" width="188px" />
            <SkeletonBlock className="skeleton-block--text" width="296px" />
          </div>
          <div className="availability-summary__response">
            <SkeletonBlock className="skeleton-block--stat" width="72px" />
            <SkeletonBlock className="skeleton-block--text" width="88px" />
          </div>
        </div>

        <div className="availability-summary__tiles">
          {Array.from({ length: 3 }, (_, index) => (
            <article key={index} className="availability-tile skeleton-card">
              <SkeletonBlock className="skeleton-block--eyebrow" width="88px" />
              <SkeletonBlock className="skeleton-block--stat" width="56px" />
              <SkeletonBlock className="skeleton-block--text" width="112px" />
            </article>
          ))}
        </div>

        <div className="stack-sm">
          <div className="split-row">
            <SkeletonBlock className="skeleton-block--text" width="210px" />
            <SkeletonBlock className="skeleton-block--text" width="106px" />
          </div>
          <SkeletonBlock className="skeleton-block--track" width="100%" />
        </div>
      </section>

      <section className="card stack skeleton-card">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="selection-row selection-row--skeleton">
            <div className="stack-sm">
              <SkeletonBlock className="skeleton-block--title" width="148px" />
              <SkeletonBlock className="skeleton-block--text" width="72px" />
            </div>
            <div className="selection-row__controls">
              <SkeletonBlock className="skeleton-block--chip" width="90px" />
              <SkeletonBlock className="skeleton-block--chip" width="110px" />
              <SkeletonBlock className="skeleton-block--chip" width="98px" />
            </div>
          </div>
        ))}
      </section>
    </section>
  );
}

function MatchStatsSkeleton() {
  return (
    <section className="page-grid">
      <section className="live-stats-shell">
        <section className="score-strip skeleton-card">
          <div className="score-strip__team">
            <SkeletonBlock className="skeleton-block--logo" width="58px" height="58px" />
            <div className="stack-sm">
              <SkeletonBlock className="skeleton-block--title" width="140px" />
              <SkeletonBlock className="skeleton-block--text" width="52px" />
            </div>
          </div>

          <div className="score-strip__middle">
            <SkeletonBlock className="skeleton-block--hero-title" width="124px" />
            <SkeletonBlock className="skeleton-block--text" width="110px" />
          </div>

          <div className="score-strip__team score-strip__team--right">
            <div className="stack-sm score-strip__team-copy">
              <SkeletonBlock className="skeleton-block--title" width="128px" />
              <SkeletonBlock className="skeleton-block--text" width="48px" />
            </div>
            <SkeletonBlock className="skeleton-block--logo" width="58px" height="58px" />
          </div>
        </section>

        <section className="activity-rail skeleton-card">
          <SkeletonBlock className="skeleton-block--button" width="150px" />
          <div className="activity-rail__chips">
            <SkeletonBlock className="skeleton-block--chip" width="180px" />
            <SkeletonBlock className="skeleton-block--chip" width="220px" />
            <SkeletonBlock className="skeleton-block--chip" width="170px" />
          </div>
        </section>

        <section className="card stack skeleton-card">
          <SkeletonBlock className="skeleton-block--title" width="180px" />
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="stats-entry-row">
              <SkeletonBlock className="skeleton-block--title stats-entry-row__metric" width="148px" />
              <SkeletonBlock className="skeleton-block--button" width="92px" />
              <SkeletonBlock className="skeleton-block--button" width="92px" />
            </div>
          ))}
        </section>
      </section>
    </section>
  );
}

function AdminSkeleton() {
  return (
    <section className="page-grid admin-page">
      <section className="admin-page__hero skeleton-card">
        <div className="admin-page__top">
          <div className="admin-page__copy stack">
            <SkeletonBlock className="skeleton-block--eyebrow" width="84px" />
            <SkeletonBlock className="skeleton-block--title" width="220px" />
            <SkeletonBlock className="skeleton-block--text" width="360px" />
          </div>
        </div>

        <div className="admin-page__nav">
          {Array.from({ length: 6 }, (_, index) => (
            <SkeletonBlock key={index} className="skeleton-block--button" width="104px" />
          ))}
        </div>
      </section>

      <section className="admin-summary-grid">
        {Array.from({ length: 4 }, (_, index) => (
          <section key={index} className="card stack-sm skeleton-card">
            <SkeletonBlock className="skeleton-block--eyebrow" width="108px" />
            <SkeletonBlock className="skeleton-block--stat" width="96px" />
            <SkeletonBlock className="skeleton-block--text" width="86px" />
          </section>
        ))}
      </section>

      <section className="admin-section">
        <div className="admin-section__header">
          <div className="stack-sm">
            <SkeletonBlock className="skeleton-block--title" width="144px" />
            <SkeletonBlock className="skeleton-block--text" width="320px" />
          </div>
        </div>

        <div className="two-column">
          {Array.from({ length: 4 }, (_, index) => (
            <section key={index} className="card stack skeleton-card">
              <SkeletonBlock className="skeleton-block--title" width="168px" />
              <SkeletonBlock className="skeleton-block--text" width="88%" />
              <SkeletonBlock className="skeleton-block--text" width="70%" />
              <SkeletonBlock className="skeleton-block--button" width="142px" />
            </section>
          ))}
        </div>
      </section>
    </section>
  );
}

function PlayerSkeleton() {
  return (
    <section className="page-grid player-page">
      <section className="player-page__hero skeleton-card">
        <div className="player-page__copy stack">
          <SkeletonBlock className="skeleton-block--eyebrow" width="96px" />
          <SkeletonBlock className="skeleton-block--title" width="220px" />
          <SkeletonBlock className="skeleton-block--text" width="360px" />
        </div>

        <div className="admin-page__nav">
          {Array.from({ length: 3 }, (_, index) => (
            <SkeletonBlock key={index} className="skeleton-block--button" width="110px" />
          ))}
        </div>
      </section>

      <section className="card stack skeleton-card">
        <SkeletonBlock className="skeleton-block--title" width="160px" />
        <SkeletonBlock className="skeleton-block--text" width="320px" />
        <SkeletonBlock className="skeleton-block--button" width="240px" />
      </section>

      <LoadingListCards count={3} />
    </section>
  );
}

type PageSkeletonProps = {
  pathname: string;
};

type AppShellSkeletonProps = {
  pathname?: string;
};

export function AppShellSkeleton({ pathname = '/' }: AppShellSkeletonProps) {
  return (
    <div aria-busy="true" aria-label="Loading workspace" className="app-shell app-shell--loading">
      <button className="drawer-toggle drawer-toggle--skeleton" disabled type="button">
        Menu
      </button>

      <aside className="shell-drawer shell-drawer--skeleton">
        <div className="shell-drawer__panel">
          <div className="shell-drawer__brand">
            <SkeletonBlock className="skeleton-block--logo" height="54px" width="54px" />
            <div className="stack-sm">
              <SkeletonBlock className="skeleton-block--eyebrow" width="148px" />
              <SkeletonBlock className="skeleton-block--title" width="180px" />
            </div>
          </div>

          <div className="shell-drawer__meta">
            <SkeletonBlock className="skeleton-block--chip" width="100%" />
          </div>

          <div className="shell-drawer__body">
            <div className="shell-drawer__section">
              <SkeletonBlock className="skeleton-block--eyebrow" width="104px" />
              <nav aria-label="Loading primary navigation" className="drawer-nav">
                {Array.from({ length: 4 }, (_, index) => (
                  <span key={index} className="drawer-link drawer-link--skeleton">
                    <span className="drawer-link__bullet" />
                    <SkeletonBlock className="skeleton-block--text" width={index === 0 ? '72px' : '96px'} />
                  </span>
                ))}
              </nav>
            </div>
          </div>

          <div className="shell-drawer__footer">
            <div className="shell-drawer__section">
              <SkeletonBlock className="skeleton-block--eyebrow" width="112px" />
            </div>
            <div className="shell-drawer__actions">
              <section className="shell-view-switcher shell-view-switcher--skeleton">
                <SkeletonBlock className="skeleton-block--eyebrow" width="96px" />
                <SkeletonBlock className="skeleton-block--button" width="100%" />
                <SkeletonBlock className="skeleton-block--chip" width="100%" />
              </section>
              <SkeletonBlock className="skeleton-block--button" width="100%" />
              <SkeletonBlock className="skeleton-block--button" width="100%" />
            </div>
          </div>
        </div>
      </aside>

      <div className="shell-main">
        <header className="mobile-topbar mobile-topbar--skeleton">
          <div className="stack-sm">
            <SkeletonBlock className="skeleton-block--eyebrow" width="150px" />
            <SkeletonBlock className="skeleton-block--title" width="220px" />
          </div>
        </header>

        <main className="page-shell">
          <PageSkeleton pathname={pathname} />
        </main>
      </div>
    </div>
  );
}

export function PageSkeleton({ pathname }: PageSkeletonProps) {
  if (pathname.startsWith('/admin')) {
    return <AdminSkeleton />;
  }

  if (pathname.startsWith('/player')) {
    return <PlayerSkeleton />;
  }

  if (pathname === '/training') {
    return (
      <ListSkeleton
        bodyWidth="320px"
        eyebrowWidth="92px"
        titleWidth="260px"
      />
    );
  }

  if (pathname.startsWith('/training/')) {
    return (
      <DetailSkeleton
        bodyWidth="250px"
        eyebrowWidth="118px"
        titleWidth="240px"
      />
    );
  }

  if (pathname === '/matches') {
    return (
      <ListSkeleton
        bodyWidth="360px"
        eyebrowWidth="86px"
        titleWidth="320px"
      />
    );
  }

  if (pathname.endsWith('/stats')) {
    return <MatchStatsSkeleton />;
  }

  if (pathname.startsWith('/matches/')) {
    return (
      <DetailSkeleton
        bodyWidth="320px"
        eyebrowWidth="72px"
        titleWidth="230px"
      />
    );
  }

  return <HomeSkeleton />;
}
