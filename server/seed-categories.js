const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const Category = require('./models/Category');

const defaultCategories = [
  { name: 'Leafy Vegetables', nameHindi: 'Pattay Wali Sabziyan', description: 'Green leafy vegetables like spinach, lettuce, etc.' },
  { name: 'Root Vegetables', nameHindi: 'Jarh Wali Sabziyan', description: 'Vegetables that grow underground like carrots, potatoes, etc.' },
  { name: 'Gourds', nameHindi: 'Lauki Qisam', description: 'Gourd family vegetables like bottle gourd, bitter gourd, etc.' },
  { name: 'Beans & Legumes', nameHindi: 'Phaliyan', description: 'Beans, peas, and other legumes' },
  { name: 'Cruciferous', nameHindi: 'Gobhi Qisam', description: 'Cauliflower, cabbage, broccoli, etc.' },
  { name: 'Alliums', nameHindi: 'Piyaz Qisam', description: 'Onions, garlic, leeks, etc.' },
  { name: 'Fruiting Vegetables', nameHindi: 'Phal Wali Sabziyan', description: 'Tomatoes, brinjal, peppers, etc.' },
  { name: 'Others', nameHindi: 'Doosri', description: 'Other vegetables' }
];

const seedCategories = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sabzi-mandi');
    console.log('Connected to MongoDB');

    const count = await Category.countDocuments();
    console.log(`Existing categories: ${count}`);

    if (count === 0) {
      await Category.insertMany(defaultCategories);
      console.log('✅ Default categories created successfully!');
    } else {
      console.log('Categories already exist. Skipping seed.');
    }

    // List all categories
    const categories = await Category.find();
    console.log('\nCategories in database:');
    categories.forEach(cat => console.log(`  - ${cat.name} (${cat.nameHindi})`));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

seedCategories();
