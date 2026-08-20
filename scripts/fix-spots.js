/**
 * Maintenance: recompute spotsRemaining from actual (non-cancelled) RSVPs.
 * Fixes counters that drifted (e.g. capacity edited without resyncing spots).
 *
 * Usage:
 *   node scripts/fix-spots.js          # dry run — reports drift, changes nothing
 *   node scripts/fix-spots.js --apply  # applies the corrections
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { Game, RSVP } = require('../api/models');

const APPLY = process.argv.includes('--apply');

(async () => {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`✅ Connected to MongoDB (${APPLY ? 'APPLY' : 'DRY RUN'})\n`);

  const games = await Game.find({});
  let drifted = 0;

  for (const game of games) {
    const activeRsvps = await RSVP.find({
      gameId: game.gameId,
      status: { $ne: 'cancelled' }
    }).select('totalPlayers');
    const booked = activeRsvps.reduce((sum, r) => sum + (r.totalPlayers || 1), 0);

    const correctSpots = Math.max(0, game.capacity - booked);

    if (game.spotsRemaining !== correctSpots) {
      drifted++;
      console.log(
        `⚠️  ${game.gameId} "${game.title}" — capacity=${game.capacity}, booked=${booked}, ` +
        `spotsRemaining=${game.spotsRemaining} → should be ${correctSpots}`
      );

      if (APPLY) {
        game.spotsRemaining = correctSpots;
        game.status = correctSpots <= 0
          ? 'full'
          : (game.status === 'full' ? 'open' : game.status);
        await game.save();
        console.log(`   ✅ fixed (status: ${game.status})`);
      }
    }
  }

  console.log(`\n${drifted === 0 ? '✅ No drift found.' : `Found ${drifted} game(s) with drift.`}`);
  if (drifted > 0 && !APPLY) {
    console.log('Run with --apply to correct them.');
  }

  await mongoose.disconnect();
  process.exit(0);
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
