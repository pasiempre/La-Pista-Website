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

    // ============================================
    // ADD THIS WEEK'S GAMES (Jan 29 & Feb 1, 2026)
    // ============================================

    // 1. Create Thursday Jan 29th game at Prairie Lane
    console.log('\n--- Creating Thursday Jan 29th game at Prairie Lane ---');
    const thursdayExists = await Game.findOne({ gameId: 'LP-2030' });
    if (thursdayExists) {
      console.log(`⚠️ Game LP-2030 already exists`);
    } else {
      const thursdayGame = new Game({
        gameId: 'LP-2030',
        title: 'Thursday Night',
        venue: {
          name: 'Prairie Lane Fields',
          address: '4005 Prairie Ln, Austin, TX 78728',
          mapsUrl: 'https://maps.google.com/?q=4005+Prairie+Ln+Austin+TX+78728'
        },
        dayOfWeek: 'Thursday',
        time: '8:30 PM',
        date: new Date('2026-01-30T02:30:00.000Z'), // Jan 29th 8:30PM CST = Jan 30 02:30 UTC
        price: 5.99,
        capacity: 24,
        spotsRemaining: 24,
        status: 'open',
        format: '7v7',
        skillLevel: 'all',
        description: 'Thursday night pickup game at Prairie Lane. All skill levels welcome.'
      });

      await thursdayGame.save();
      console.log(`✅ Created game: ${thursdayGame.gameId} - ${thursdayGame.title} on ${thursdayGame.date}`);
    }

    // 2. Create Sunday Feb 1st game at Shady Lane
    console.log('\n--- Creating Sunday Feb 1st game at Shady Lane ---');
    const sundayExists = await Game.findOne({ gameId: 'LP-2031' });
    if (sundayExists) {
      console.log(`⚠️ Game LP-2031 already exists`);
    } else {
      const sundayGame = new Game({
        gameId: 'LP-2031',
        title: 'Sunday Pickup',
        venue: {
          name: 'Shady Lane Fields',
          address: '757 Shady Ln, Austin, TX 78702',
          mapsUrl: 'https://maps.google.com/?q=757+Shady+Ln+Austin+TX+78702'
        },
        dayOfWeek: 'Sunday',
        time: '8:00 PM',
        date: new Date('2026-02-02T02:00:00.000Z'), // Feb 1st 8:00PM CST = Feb 2 02:00 UTC
        price: 5.99,
        capacity: 24,
        spotsRemaining: 24,
        status: 'open',
        format: '7v7',
        skillLevel: 'all',
        description: 'Sunday pickup game at Shady Lane. All skill levels welcome.'
      });

      await sundayGame.save();
      console.log(`✅ Created game: ${sundayGame.gameId} - ${sundayGame.title} on ${sundayGame.date}`);
    }

    // 3. Show current active games
    console.log('\n--- Current Active Games ---');
    const activeGames = await Game.find({
      status: { $ne: 'cancelled' },
      date: { $gte: new Date() }
    }).sort({ date: 1 });

    activeGames.forEach(g => {
      console.log(`${g.gameId.padEnd(15)} ${g.dayOfWeek.padEnd(10)} ${g.date.toISOString().slice(0,10)} ${g.time.padEnd(10)} ${g.title}`);
    });

    console.log('\n✅ Done!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

main();
