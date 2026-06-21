interface EventLogProps {
  events: string[];
}

export function EventLog({ events }: EventLogProps) {
  const recentEvents = events.slice(-4).reverse();
  const fullEvents = [...events].reverse();

  return (
    <section className="event-log war-report">
      <div className="panel-heading compact-heading">
        <div>
          <span className="eyebrow">戰報</span>
          <h2>審判紀錄</h2>
        </div>
      </div>

      <ol className="war-report-list">
        {recentEvents.map((event, index) => (
          <li key={`${events.length - index}-${event}`}>{event}</li>
        ))}
      </ol>

      {events.length > recentEvents.length ? (
        <details className="war-report-details">
          <summary>展開完整紀錄</summary>
          <ol>
            {fullEvents.map((event, index) => (
              <li key={`${events.length - index}-full-${event}`}>{event}</li>
            ))}
          </ol>
        </details>
      ) : null}
    </section>
  );
}
