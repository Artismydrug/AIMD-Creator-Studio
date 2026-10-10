export default function Educators() {
  return (
    <div className="w-screen h-screen overflow-hidden relative deck-stage text-text font-body px-[6vw] py-[8vh]">
      <h1 className="deck-title">Support for educators</h1>
      <p className="deck-body text-muted mt-[4vh]">Ways teachers can connect creative practice to learning.</p>
      <div className="grid grid-cols-3 gap-[4vw] mt-[11vh]">
        <div>
          <h2 className="font-display font-bold text-[3.8vw] text-primary">Prompts</h2>
          <p className="deck-body mt-[4vh]">Use structured challenges to start creative conversations and practice.</p>
        </div>
        <div>
          <h2 className="font-display font-bold text-[3.8vw] text-primary">Reflection</h2>
          <p className="deck-body mt-[4vh]">Invite students to discuss habits, progress, and what they learned.</p>
        </div>
        <div>
          <h2 className="font-display font-bold text-[3.8vw] text-primary">Feedback</h2>
          <p className="deck-body mt-[4vh]">Encourage thoughtful responses and appreciation for different creative approaches.</p>
        </div>
      </div>
    </div>
  );
}
