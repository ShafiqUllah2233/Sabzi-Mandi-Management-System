const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`📦 MongoDB Connected: ${conn.connection.host}`);
    
    // Create default admin if not exists
    const User = require('../models/User');
    const bcrypt = require('bcryptjs');
    
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', salt);
      
      await User.create({
        name: 'Admin',
        email: process.env.ADMIN_EMAIL || 'admin@sabzimandi.com',
        password: hashedPassword,
        phone: '0000000000',
        role: 'admin',
        isActive: true
      });
      
      console.log('👤 Default admin user created');
    }

    // Create default categories if none exist
    const Category = require('../models/Category');
    const categoryCount = await Category.countDocuments();
    
    if (categoryCount === 0) {
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
      
      await Category.insertMany(defaultCategories);
      console.log('📦 Default categories created');
    }
  } catch (error) {
    console.error(`❌ Database Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
