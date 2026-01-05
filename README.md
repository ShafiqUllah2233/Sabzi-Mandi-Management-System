# 🥬 Sabzi Mandi Management System

A comprehensive **Vegetable Market (Sabzi Mandi) Management System** built with the MERN stack. This software helps manage daily operations of a vegetable market including farmer arrivals, sales, stock management, payments, and reporting.

![License](https://img.shields.io/badge/license-ISC-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![MongoDB](https://img.shields.io/badge/mongodb-%3E%3D6.0-green.svg)

## 📋 Features

### 👥 User Management
- Multi-role authentication (Admin, Trader, Vendor, Accountant)
- Role-based access control
- User profile management

### 🌾 Farmer Management
- Register and manage farmer profiles
- Track farmer details (Aadhar, Bank Account, Village)
- View farmer balance and total business

### 🥕 Vegetable & Category Management
- Add/Edit vegetable categories
- Manage vegetable inventory with Urdu support
- Track vegetable prices and units

### 📦 Arrivals Management
- Record daily vegetable arrivals from farmers
- Track quantity, rate, and total value
- Associate arrivals with specific farmers

### 💰 Sales Management
- Record sales transactions
- Calculate commission automatically
- Track buyer information

### 📊 Stock Management
- Real-time stock tracking
- View available quantities
- Stock alerts and reporting

### 💳 Payment Management
- Track payments to/from farmers
- Payment history
- Outstanding balance tracking

### 📈 Reports & Dashboard
- Daily/Weekly/Monthly reports
- Sales analytics with charts
- Export reports to PDF/Excel
- Visual dashboard with key metrics

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **PDFKit** - PDF generation
- **ExcelJS** - Excel export

### Frontend
- **React 18** - UI library
- **React Router v6** - Routing
- **Chart.js** - Data visualization
- **React Icons** - Icon library
- **Axios** - HTTP client
- **React Hot Toast** - Notifications

## 📁 Project Structure

```
sabzi-mandi/
├── client/                 # React frontend
│   ├── public/
│   └── src/
│       ├── components/     # Reusable components
│       ├── context/        # React context (Auth)
│       ├── pages/          # Page components
│       └── services/       # API services
├── server/                 # Express backend
│   ├── config/            # Database configuration
│   ├── middleware/        # Auth & validation middleware
│   ├── models/            # Mongoose models
│   └── routes/            # API routes
└── package.json           # Root package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (v6 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/sabzi-mandi.git
   cd sabzi-mandi
   ```

2. **Install dependencies**
   ```bash
   # Install all dependencies (server + client)
   npm run install-all
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/sabzi-mandi
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRE=7d
   ```

4. **Start MongoDB**
   
   Make sure MongoDB is running on your system:
   ```bash
   # Windows
   net start MongoDB
   
   # macOS/Linux
   sudo systemctl start mongod
   ```

5. **Run the application**
   ```bash
   # Development mode (runs both server and client)
   npm run dev
   
   # Run server only
   npm run server
   
   # Run client only
   npm run client
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run both server and client in development mode |
| `npm run server` | Run server with nodemon (auto-restart) |
| `npm run client` | Run React development server |
| `npm start` | Run server in production mode |
| `npm run build` | Build React app for production |
| `npm run install-all` | Install all dependencies |

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Farmers
- `GET /api/farmers` - Get all farmers
- `POST /api/farmers` - Create farmer
- `PUT /api/farmers/:id` - Update farmer
- `DELETE /api/farmers/:id` - Delete farmer

### Vegetables & Categories
- `GET /api/vegetables` - Get all vegetables
- `GET /api/categories` - Get all categories
- `POST /api/vegetables` - Create vegetable
- `POST /api/categories` - Create category

### Arrivals
- `GET /api/arrivals` - Get all arrivals
- `POST /api/arrivals` - Record new arrival
- `PUT /api/arrivals/:id` - Update arrival
- `DELETE /api/arrivals/:id` - Delete arrival

### Sales
- `GET /api/sales` - Get all sales
- `POST /api/sales` - Record new sale
- `PUT /api/sales/:id` - Update sale

### Stock
- `GET /api/stock` - Get current stock
- `GET /api/stock/summary` - Get stock summary

### Payments
- `GET /api/payments` - Get all payments
- `POST /api/payments` - Record payment
- `GET /api/payments/farmer/:id` - Get farmer payments

### Reports
- `GET /api/reports/daily` - Daily report
- `GET /api/reports/weekly` - Weekly report
- `GET /api/reports/monthly` - Monthly report

### Dashboard
- `GET /api/dashboard` - Get dashboard statistics

## 🔐 Default Admin Credentials

After first run, create an admin user through the registration API or seed the database:

```json
{
  "email": "admin@sabzimandi.com",
  "password": "admin123",
  "role": "admin"
}
```

## 🌐 Language Support

The system supports **Urdu** for vegetable names and categories, making it suitable for local markets in Pakistan and India.

## 📸 Screenshots

*Coming soon...*

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License.

## 👨‍💻 Author

Your Name - [@yourusername](https://github.com/yourusername)

## 🙏 Acknowledgments

- Thanks to all contributors
- Inspired by the need for digital transformation in traditional vegetable markets

---

⭐ **Star this repo if you find it helpful!**
