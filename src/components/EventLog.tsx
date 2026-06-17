interface EventLogProps {
  events: string[];
}

export function EventLog({ events }: EventLogProps) {
  return (
    <section className="event-log">
      <div className="panel-heading compact-heading">
        <div>
          <span className="eyebrow">Log</span>
          <h2>審判紀錄</h2>
        </div>
      </div>
      <ol>
        {events.map((event, index) => (
          <li key={`${event}-${index}`}>{event}</li>
        ))}
      </ol>
    </section>
  );
}
