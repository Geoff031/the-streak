export default function Rules() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold mb-6 text-white-900">How to Play</h1>

      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-3 text-white-900">Overview</h2>
          <p className="text-white-700">
            The Streak is a closed competition. Pick one Premier League team to win each round. 
            If your team wins, you progress. If they draw or lose, you're out. Last player standing wins the pot.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-white-900">Core Rules</h2>
          <ul className="list-disc pl-6 space-y-2 text-white-700">
            <li>Entry fee: R100 per game & to be paid to the details shared before the start of the first round of each game</li>
            <li>You must pick ONE team per round to WIN their match</li>
            <li>Your pick must WIN — draws and losses eliminate you</li>
            <li>You cannot pick the same team twice (unless game goes past 20 rounds)</li>
            <li>Pick deadline: at Midnight before the start of each round (00:00 CAT each week)</li>
            <li>You are able to change your pick up until the deadline</li>
            <li>If you miss the deadline, you're auto-assigned the first team alphabetically that you haven't used yet</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-white-900">Postponed Matches</h2>
          <p className="text-white-700">
            If a match is postponed or cancelled during the week, it's removed from the pick list and you must pick a different team. 
            If a match is postponed on match day, you progress automatically.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3 text-white-900">Payouts</h2>
          <p className="text-white-700">
            In the event that all remaining players are eliminated in the same round, the pot is split equally among them.
          </p>
        </section>
      </div>
    </div>
  )
}