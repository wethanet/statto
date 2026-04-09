type MatchFieldIllustrationProps = {
  background?: boolean;
};

export function MatchFieldIllustration({ background = false }: MatchFieldIllustrationProps) {
  const className = background ? 'pitch-field pitch-field--background' : 'pitch-field';

  return (
    <div aria-hidden="true" className={className}>
      <div className="pitch-field__center-line" />
      <div className="pitch-field__center-square" />
      <div className="pitch-field__center-circle" />
      <div className="pitch-field__arc pitch-field__arc--left" />
      <div className="pitch-field__arc pitch-field__arc--right" />
      <div className="pitch-field__goal-square pitch-field__goal-square--left" />
      <div className="pitch-field__goal-square pitch-field__goal-square--right" />
      <div className="pitch-field__goal-posts pitch-field__goal-posts--left" />
      <div className="pitch-field__goal-posts pitch-field__goal-posts--right" />
    </div>
  );
}
