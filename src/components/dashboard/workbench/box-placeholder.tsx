interface BoxPlaceholderProps {
  boxId: string;
  title: string;
}

export function BoxPlaceholder({ boxId, title }: BoxPlaceholderProps) {
  return (
    <section className="box-placeholder panel" aria-label={`${title} placeholder`}>
      <h2 className="board-heading">
        {boxId} · {title}
      </h2>
      <p className="board-muted">This box is not implemented in `/lab` yet.</p>
    </section>
  );
}
