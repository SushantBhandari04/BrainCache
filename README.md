# 🧠 BrainCache

**BrainCache** is a modern, full-stack content management and knowledge organization platform that allows users to save, organize, and share various types of content including YouTube videos, tweets, documents, articles, links, and notes. Think of it as your personal second brain for managing digital content.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Authentication](#authentication)
- [Payment Integration](#payment-integration)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

### Core Features
- 📝 **Multi-format Content Support**: Save and organize YouTube videos, tweets, documents, articles, links, and notes
- 🗂️ **Spaces Organization**: Create multiple spaces to categorize your content
- 🔗 **Content Sharing**: Share individual spaces or content with others via unique links
- 👥 **Collaborative Spaces**: Share spaces with read or read-write permissions
- 💬 **Comments**: Add comments to spaces for collaboration
- 🔍 **Search & Filter**: Easily find your saved content
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices

### User Management
- 🔐 **Multiple Authentication Methods**:
  - Email OTP authentication
  - Google OAuth integration
- 👤 **User Profiles**: Manage personal information and preferences
- 🎫 **Subscription Plans**: Free and Pro tiers with different space limits

### Admin Features
- 📊 **Admin Dashboard**: Monitor users, content, and reports
- 🚨 **Content Reporting**: Users can report inappropriate content
- ⚙️ **User Management**: Admins can manage user accounts and subscriptions

### Premium Features
- 💎 **Pro Plan**: Upgrade to create more spaces (10 vs 3 for free users)
- 💳 **Razorpay Integration**: Secure payment processing for subscriptions

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 6.0.5
- **Routing**: React Router DOM 7.1.2
- **Styling**: Tailwind CSS 3.4.17
- **UI Components**: Lucide React (icons)
- **PDF Handling**: React PDF 9.2.1, @react-pdf-viewer
- **Authentication**: @react-oauth/google 0.12.2
- **HTTP Client**: Axios 1.7.9

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express 4.21.2
- **Database**: MongoDB with Mongoose 8.9.4
- **Authentication**: JWT (jsonwebtoken 9.0.2)
- **Validation**: Zod 3.24.1
- **File Upload**: Multer 1.4.5
- **Email Service**: Nodemailer 7.0.10
- **Payment Gateway**: Razorpay 2.9.4
- **OAuth**: Google Auth Library 10.5.0
- **CORS**: Enabled for cross-origin requests

### Development Tools
- **TypeScript**: ~5.6.2 (Frontend), 5.7.3 (Backend)
- **ESLint**: Code linting
- **PostCSS & Autoprefixer**: CSS processing

## 📁 Project Structure

```
BrainCache/
├── Backend/
│   ├── src/
│   │   ├── config.ts          # Environment configuration
│   │   ├── db.ts              # MongoDB schemas and models
│   │   ├── index.ts           # Main Express server and API routes
│   │   ├── middleware.ts      # Authentication middleware
│   │   ├── utils.ts           # Utility functions
│   │   ├── routes/            # API route handlers
│   │   └── types/             # TypeScript type definitions
│   ├── dist/                  # Compiled JavaScript output
│   ├── package.json
│   ├── tsconfig.json
│   └── .env                   # Environment variables
│
├── Frontend/
│   ├── src/
│   │   ├── components/        # Reusable React components
│   │   ├── pages/             # Page components
│   │   │   ├── LandingPage.tsx
│   │   │   ├── signin.tsx
│   │   │   ├── dashboard.tsx
│   │   │   ├── spaces.tsx
│   │   │   ├── profile.tsx
│   │   │   ├── sharedDashboard.tsx
│   │   │   └── adminDashboard.tsx
│   │   ├── context/           # React context providers
│   │   ├── assets/            # Static assets
│   │   ├── App.tsx            # Main app component
│   │   ├── main.tsx           # Entry point
│   │   ├── config.ts          # Frontend configuration
│   │   └── utils.ts           # Utility functions
│   ├── public/                # Public static files
│   ├── dist/                  # Production build output
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
│
└── README.md
```

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js**: v16.x or higher
- **npm**: v7.x or higher
- **MongoDB**: Local instance or MongoDB Atlas account
- **Git**: For version control

Optional (for full functionality):
- **Razorpay Account**: For payment processing
- **Google Cloud Console**: For Google OAuth
- **SMTP Server Access**: For email OTP delivery (e.g., Gmail)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/SushantBhandari04/BrainCache.git
cd BrainCache
```

### 2. Install Backend Dependencies

```bash
cd Backend
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../Frontend
npm install
```

## 🔧 Environment Variables

### Backend Configuration

Create a `.env` file in the `Backend` directory with the following variables:

```env
# Core Application
PORT=3000
JWT_SECRET=your_secure_jwt_secret_here

# Database
MONGO_URI=mongodb://localhost:27017/braincache
# Or for MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/braincache

# Payment Integration (Optional)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
PRO_PLAN_PRICE_INR=499

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Email Service (Optional - for OTP authentication)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_specific_password
EMAIL_FROM=BrainCache <your_email@gmail.com>

# OTP Configuration (Optional)
OTP_EXPIRY_MINUTES=10
OTP_RESEND_INTERVAL_SECONDS=60
```

### Frontend Configuration

The frontend uses the backend API URL. Update `src/config.ts` if needed:

```typescript
export const API_BASE_URL = 'http://localhost:3000';
```

## 🏃 Running the Application

### Development Mode

#### 1. Start the Backend Server

```bash
cd Backend
npm run dev
```

The backend server will start on `http://localhost:3000`

#### 2. Start the Frontend Development Server

```bash
cd Frontend
npm run dev
```

The frontend will start on `http://localhost:5173` (or another port if 5173 is busy)

### Production Mode

#### Backend

```bash
cd Backend
npm run build
npm start
```

#### Frontend

```bash
cd Frontend
npm run build
npm run preview
```

## 📡 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/auth/config` | Get authentication configuration |
| POST | `/api/v1/auth/google` | Google OAuth authentication |
| POST | `/api/v1/auth/request-otp` | Request OTP for email login |
| POST | `/api/v1/auth/verify-otp` | Verify OTP and login |

### User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/profile` | Get current user profile |
| PATCH | `/api/v1/profile` | Update user profile |

### Space Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/spaces` | Get all user spaces |
| POST | `/api/v1/spaces` | Create a new space |
| GET | `/api/v1/spaces/:spaceId/share` | Get space sharing status |
| POST | `/api/v1/spaces/:spaceId/share` | Toggle space sharing |

### Content Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/content` | Get content (filtered by space) |
| POST | `/api/v1/content` | Create new content |
| DELETE | `/api/v1/content/:contentId` | Delete content |

### Payment Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/payment/create-order` | Create Razorpay order |
| POST | `/api/v1/payment/confirm` | Confirm payment and upgrade |

## 🗄️ Database Schema

### Users Collection
```typescript
{
  email: String (unique, required)
  firstName: String
  lastName: String
  address: String
  googleId: String
  otpHash: String
  otpExpiresAt: Date
  otpLastSentAt: Date
  subscriptionPlan: "free" | "pro" (default: "free")
  role: "user" | "admin" (default: "user")
  timestamps: true
}
```

### Spaces Collection
```typescript
{
  name: String (required)
  description: String
  userId: ObjectId (ref: Users, required)
  timestamps: true
}
```

### Contents Collection
```typescript
{
  title: String (required)
  link: String
  body: String
  type: "youtube" | "twitter" | "document" | "link" | "article" | "note"
  userId: ObjectId (ref: Users, required)
  spaceId: ObjectId (ref: Spaces)
  tags: [ObjectId] (ref: Tags)
  timestamps: true
}
```

### Links Collection (Sharing)
```typescript
{
  hash: String (required)
  userId: ObjectId (ref: Users)
  contentId: ObjectId (ref: Contents)
  spaceId: ObjectId (ref: Spaces)
  timestamps: true
}
```

### ShareAccess Collection
```typescript
{
  resourceType: "space" | "content"
  resourceId: ObjectId (required)
  ownerId: ObjectId (ref: Users, required)
  sharedWithId: ObjectId (ref: Users, required)
  permissions: "read" | "read-write" (default: "read")
  timestamps: true
}
```

### SpaceComments Collection
```typescript
{
  spaceId: ObjectId (ref: Spaces, required)
  userId: ObjectId (ref: Users, required)
  comment: String (required, max: 2000)
  edited: Boolean (default: false)
  timestamps: true
}
```

### Reports Collection
```typescript
{
  contentId: ObjectId (ref: Contents, required)
  reportedBy: ObjectId (ref: Users, required)
  reason: String (required, max: 500)
  status: "pending" | "resolved" | "ignored" (default: "pending")
  timestamps: true
}
```

## 🔐 Authentication

BrainCache supports two authentication methods:

### 1. Email OTP Authentication
- User enters email address
- System sends 6-digit OTP via email
- OTP expires in 10 minutes (configurable)
- Rate limiting: 60 seconds between OTP requests

### 2. Google OAuth
- One-click sign-in with Google account
- Automatic profile information retrieval
- Secure token-based authentication

Both methods generate a JWT token valid for 30 days.

## 💳 Payment Integration

BrainCache uses **Razorpay** for payment processing:

- **Free Plan**: 3 spaces maximum
- **Pro Plan**: 10 spaces maximum, ₹499 (configurable)

Payment flow:
1. User initiates upgrade
2. Backend creates Razorpay order
3. Frontend displays Razorpay checkout
4. User completes payment
5. Backend verifies payment signature
6. User account upgraded to Pro

## 🎨 Key Features Implementation

### Content Types Supported
- **YouTube**: Validates YouTube URLs, extracts video information
- **Twitter/X**: Validates Twitter/X URLs, embeds tweets
- **Documents**: PDF upload and viewing support
- **Links**: Generic URL bookmarking
- **Articles**: Web article saving
- **Notes**: Plain text notes with optional links

### Space Limits
- **Free Users**: 3 spaces
- **Pro Users**: 10 spaces
- Default space "My Brain" created automatically

### Sharing Features
- Generate unique shareable links for spaces
- Set read or read-write permissions
- Share with specific users via email
- Public sharing via hash links

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👨‍💻 Author

**Sushant Bhandari**

## 🙏 Acknowledgments

- MongoDB for the database
- Razorpay for payment processing
- Google for OAuth integration
- All open-source libraries used in this project

---

**Note**: This is a personal project for learning and demonstration purposes. Please ensure you use your own API keys and credentials when deploying.
