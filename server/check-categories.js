const mongoose = require('mongoose');
const Category = require('./models/Category');

mongoose.connect('mongodb://localhost:27017/sabzi-mandi').then(async () => {
  const cats = await Category.find();
  console.log('Checking isActive status:');
  cats.forEach(c => console.log(`  ${c.name} - isActive: ${c.isActive}`));
  
  // Update all to have isActive: true if not set
  const result = await Category.updateMany(
    { isActive: { $ne: true } },
    { $set: { isActive: true } }
  );
  console.log(`\nUpdated ${result.modifiedCount} categories to isActive: true`);
  
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
