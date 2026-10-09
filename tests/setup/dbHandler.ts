import mongoose from 'mongoose';

const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://localhost:27017/salon-db-test';

// Connect to the db
export const connect = async (): Promise<void> => {
  await mongoose.connect(MONGO_URI);
};

//Close the DB
export const closeDatabase = async (): Promise<void> => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
};


// Clear the db
export const clearDatabase = async (): Promise<void> => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};
