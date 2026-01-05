const mongoose = require('mongoose');
const Category = require('./models/Category');

mongoose.connect('mongodb://localhost:27017/sabzi-mandi').then(async () => {
  console.log('Connected to MongoDB');
  
  // Update all categories to Roman Urdu
  const updates = [
    { oldName: 'Leafy Vegetables', nameHindi: 'Pattay Wali Sabziyan' },
    { oldName: 'Root Vegetables', nameHindi: 'Jarh Wali Sabziyan' },
    { oldName: 'Gourds', nameHindi: 'Lauki Qisam' },
    { oldName: 'Beans & Legumes', nameHindi: 'Phaliyan' },
    { oldName: 'Cruciferous', nameHindi: 'Gobhi Qisam' },
    { oldName: 'Alliums', nameHindi: 'Piyaz Qisam' },
    { oldName: 'Fruiting Vegetables', nameHindi: 'Phal Wali Sabziyan' },
    { oldName: 'Others', nameHindi: 'Doosri' }
  ];
  
  // First, let's see what's in the database
  const allCats = await Category.find();
  console.log('\nCurrent categories in database:');
  allCats.forEach(c => console.log(`  - ${c.name}: "${c.nameHindi}"`));
  
  // Force update all categories by matching name
  for (const update of updates) {
    const result = await Category.updateOne(
      { name: update.oldName },
      { $set: { nameHindi: update.nameHindi } }
    );
    console.log(`\nUpdating ${update.oldName} -> ${update.nameHindi}: ${result.modifiedCount > 0 ? 'SUCCESS' : 'NOT FOUND'}`);
  }
  
  // Also update any categories that might have different casing
  await Category.updateMany({}, [
    {
      $set: {
        nameHindi: {
          $switch: {
            branches: [
              { case: { $eq: ['$name', 'Leafy Vegetables'] }, then: 'Pattay Wali Sabziyan' },
              { case: { $eq: ['$name', 'Root Vegetables'] }, then: 'Jarh Wali Sabziyan' },
              { case: { $eq: ['$name', 'Gourds'] }, then: 'Lauki Qisam' },
              { case: { $eq: ['$name', 'Beans & Legumes'] }, then: 'Phaliyan' },
              { case: { $eq: ['$name', 'Cruciferous'] }, then: 'Gobhi Qisam' },
              { case: { $eq: ['$name', 'Alliums'] }, then: 'Piyaz Qisam' },
              { case: { $eq: ['$name', 'Fruiting Vegetables'] }, then: 'Phal Wali Sabziyan' },
              { case: { $eq: ['$name', 'Others'] }, then: 'Doosri' }
            ],
            default: '$nameHindi'
          }
        }
      }
    }
  ]);
  
  console.log('\n✅ Force updated all categories!');
  
  // Verify the update
  const updatedCats = await Category.find();
  console.log('\nUpdated categories:');
  updatedCats.forEach(c => console.log(`  - ${c.name}: "${c.nameHindi}"`));
  
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
