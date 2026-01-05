const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars from the correct location
dotenv.config({ path: path.join(__dirname, '../.env') });

const Category = require('./models/Category');

const updates = [
  { name: 'Leafy Vegetables', nameHindi: 'Pattay Wali Sabziyan' },
  { name: 'Root Vegetables', nameHindi: 'Jarh Wali Sabziyan' },
  { name: 'Gourds', nameHindi: 'Lauki Qisam' },
  { name: 'Beans & Legumes', nameHindi: 'Phaliyan' },
  { name: 'Cruciferous', nameHindi: 'Gobhi Qisam' },
  { name: 'Alliums', nameHindi: 'Piyaz Qisam' },
  { name: 'Fruiting Vegetables', nameHindi: 'Phal Wali Sabziyan' },
  { name: 'Others', nameHindi: 'Doosri' }
];

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('Connected to MongoDB:', process.env.MONGODB_URI);
  
  // Show current state
  const before = await Category.find();
  console.log('\nBefore update:');
  before.forEach(c => console.log(`  ${c.name}: "${c.nameHindi}"`));
  
  // Update each category
  for (const update of updates) {
    const result = await Category.updateOne(
      { name: update.name },
      { $set: { nameHindi: update.nameHindi } }
    );
    console.log(`\nUpdated ${update.name}: ${result.modifiedCount > 0 ? '✅ SUCCESS' : '⚠️ No change'}`);
  }
  
  // Show updated state
  const after = await Category.find();
  console.log('\n✅ After update:');
  after.forEach(c => console.log(`  ${c.name}: "${c.nameHindi}"`));
  
  process.exit(0);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
