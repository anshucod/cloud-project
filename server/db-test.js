const mongoose = require('mongoose');
require('dotenv').config();

console.log('Connecting to:', process.env.MONGO_DB_URL);

mongoose.connect(process.env.MONGO_DB_URL)
  .then(() => {
    console.log('✅ Connection successful');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  });
