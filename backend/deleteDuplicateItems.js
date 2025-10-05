import mongoose from 'mongoose';
import Item from './src/models/item.model.js'; // 👈 Adjust the path to your Item model if needed

// --- CONFIGURATION ---
// ❗️❗️❗️ IMPORTANT: Replace with your actual MongoDB connection string ❗️❗️❗️
const MONGO_URI = 'mongodb+srv://pjdavid27:bkc1MjfqNLyKkuEx@cluster0.dfktjvb.mongodb.net/chat_db?retryWrites=true&w=majority&appName=Cluster0';

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB Connected...');
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB', err.message);
    process.exit(1);
  }
};

const runCleanup = async () => {
  await connectDB();

  try {
    console.log('🔎 Fetching all items to check for duplicates...');
    const allItems = await Item.find({}).sort({ _id: 1 }); // Sort by oldest first

    const seenNames = new Map();
    const idsToDelete = [];

    for (const item of allItems) {
      const normalizedName = item.name.trim().toLocaleLowerCase();

      if (seenNames.has(normalizedName)) {
        idsToDelete.push(item._id);
        console.log(`- Marked for deletion (Duplicate): "${item.name}" (ID: ${item._id})`);
      } else {
        seenNames.set(normalizedName, item._id);
        console.log(`+ Keeping (Original): "${item.name}" (ID: ${item._id})`);
      }
    }

    console.log('\n-----------------------------------------');
    console.log(`Found ${idsToDelete.length} duplicate items to delete.`);
    console.log('-----------------------------------------');

    if (idsToDelete.length > 0) {
      console.log('\nStarting deletion process...');

      
       const deleteResult = await Item.deleteMany({
         _id: { $in: idsToDelete }
       });
      
       console.log(`\n✅ Successfully deleted ${deleteResult.deletedCount} items.`);

      console.log('\nDRY RUN COMPLETE. No items were deleted.');
      console.log('To delete the items, uncomment the Item.deleteMany() block in the script and run it again.');
    } else {
      console.log('\nNo duplicates found. Your database is clean! ✨');
    }

  } catch (error) {
    console.error('An error occurred during the cleanup process:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB.');
  }
};

runCleanup();