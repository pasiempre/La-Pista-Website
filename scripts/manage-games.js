/**
 * Quick script to manage games
 * Run with: node scripts/manage-games.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
  gameId: String,
  title: String,
  venue: {
    name: String,
    address: String,
    mapsUrl: String
  },
  dayOfWeek: String,
  time: String,
  date: Date,
  price: Number,
  capacity: Number,
  spotsRemaining: Number,
  status: String,
  format: String,
  skillLevel: String,
  description: String
}, { timestamps: true });

const Game = mongoose.model('Game', GameSchema);

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Cancel/Remove Sunday Jan 25th game (LP-2027)
    console.log('\n--- Cancelling Sunday Jan 25th game (LP-2027) ---');
    const cancelResult = await Game.findOneAndUpdate(
      { gameId: 'LP-2027' },
      { status: 'cancelled' },
      { new: true }
    );

    if (cancelResult) {
      console.log(`✅ Cancelled game: ${cancelResult.gameId} - ${cancelResult.title} on ${cancelResult.date}`);
    } else {
      console.log('❌ Game LP-2027 not found');
    }

    // 2. Create Tuesday Jan 27th game
    console.log('\n--- Creating Tuesday Jan 27th game ---');

    // Check if it already exists
    const existing = await Game.findOne({ gameId: 'LP-2029' });
    if (existing) {
      console.log(`⚠️ Game LP-2029 already exists`);
    } else {
      const newGame = new Game({
        gameId: 'LP-2029',
        title: 'Tuesday Night',
        venue: {
          name: 'Shady Lane Fields',
          address: '757 Shady Ln, Austin, TX 78702',
          mapsUrl: 'https://maps.google.com/?q=757+Shady+Ln+Austin+TX+78702'
        },
        dayOfWeek: 'Tuesday',
        time: '8:00 PM',
        date: new Date('2026-01-28T02:00:00.000Z'), // Jan 27th 8PM CST = Jan 28 02:00 UTC
        price: 5.99,
        capacity: 24,
        spotsRemaining: 24,
        status: 'open',
        format: '7v7',
        skillLevel: 'all',
        description: 'Tuesday night pickup game at Shady Lane. All skill levels welcome.'
      });

      await newGame.save();
      console.log(`✅ Created game: ${newGame.gameId} - ${newGame.title} on ${newGame.date}`);
    }

    // 3. Show current active games
    console.log('\n--- Current Active Games ---');
    const activeGames = await Game.find({
      status: { $ne: 'cancelled' },
      date: { $gte: new Date() }
    }).sort({ date: 1 });

    activeGames.forEach(g => {
      console.log(`${g.gameId.padEnd(15)} ${g.dayOfWeek.padEnd(10)} ${g.date.toISOString().slice(0,10)} ${g.title}`);
    });

    console.log('\n✅ Done!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

main();
