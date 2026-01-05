const mongoose = require('mongoose');
const Category = require('./models/Category');

mongoose.connect('mongodb://localhost:27017/sabzi-mandi').then(async () => {
  console.log('Connected to MongoDB');
  
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
  
  for (const update of updates) {
    await Category.updateOne(
      { name: update.name },
      { $set: { nameHindi: update.nameHindi, isActive: true } }
    );
    console.log(`Updated: ${update.name} -> ${update.nameHindi}`);
  }
  
  console.log('\n✅ All categories updated to Roman Urdu!');
  
  // List all categories
  const categories = await Category.find();
  console.log('\nCategories in database:');
  categories.forEach(c => console.log(`  - ${c.name} (${c.nameHindi}) - isActive: ${c.isActive}`));
  
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
