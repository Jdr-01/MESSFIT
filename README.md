# MessFit - Indian Mess Food Tracker

A comprehensive food tracking application built with Next.js, TypeScript, Firebase, and Tailwind CSS. Track your daily meals, monitor nutrition, and achieve your fitness goals.

## Features

- 🔐 **Authentication**: Secure login and signup with Firebase Auth
- 🏠 **Dashboard**: Real-time calorie tracking with RDA progress
- 🍽️ **Meal Logging**: Track breakfast, lunch, snacks, and dinner
- ➕ **Food Entry**: Add food items with quantity adjustments
- 📊 **Daily Summary**: Detailed breakdown of daily nutrition
- 📈 **Weekly Summary**: View trends and progress over time
- ⚙️ **Profile Management**: Update personal details and goals
- 🎯 **Goal Tracking**: Support for cut, maintain, and bulk goals

## Tech Stack

- **Framework**: Next.js 15+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Authentication & Firestore)
- **Charts**: Recharts
- **State Management**: React Hooks

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Firebase project created
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd apps
```

2. Install dependencies:
```bash
npm install
```

3. Set up Firebase:
   - Create a Firebase project at [firebase.google.com](https://firebase.google.com)
   - Enable Authentication (Email/Password)
   - Create a Firestore database
   - Copy your Firebase config

4. Create `.env.local` file:
```bash
cp .env.local.example .env.local
```

5. Add your Firebase credentials to `.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### Running the App

Development mode:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Build for production:
```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/
│   ├── add-food/         # Food entry page
│   ├── daily-summary/    # Daily nutrition summary
│   ├── dashboard/        # Main dashboard
│   ├── login/            # Authentication page
│   ├── meal-selection/   # Meal type food list
│   ├── profile/          # User profile & settings
│   ├── weekly-summary/   # Weekly progress charts
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page (redirects)
├── lib/
│   └── firebase.ts       # Firebase configuration
└── types/
    └── index.ts          # TypeScript interfaces
```

## Firebase Collections

### `users`
- User profile data (name, height, weight, goal, RDA)

### `food_master`
- Master list of food items with nutrition info

### `meal_logs`
- Individual meal entries with timestamps

## Features Overview

### Authentication
- Email/password signup and login
- Profile creation during signup
- Secure session management

### Dashboard
- Today's calorie count
- RDA percentage progress bar
- Protein tracking
- Quick meal entry buttons
- Navigation to summaries

### Meal Selection
- Browse all foods from food_master
- Search functionality
- Sample Indian mess food items included

### Food Entry
- Quantity adjustment with +/- buttons
- Real-time nutrition calculation
- Detailed macronutrient display

### Daily Summary
- Complete daily nutrition breakdown
- Meal-by-meal view
- Edit/delete meal entries
- RDA progress visualization

### Weekly Summary
- 7-day calorie and protein charts
- Average daily statistics
- Goal progress indicator
- Activity tracking

### Profile
- Personal information management
- Goal selection (cut/maintain/bulk)
- BMI calculation
- RDA auto-calculation
- Logout functionality

## Customization

### Adding New Foods
Add documents to the `food_master` collection in Firestore with this structure:
```json
{
  "name": "Food Name",
  "calories_per_portion": 200,
  "protein_g": 10,
  "carbs_g": 30,
  "fat_g": 5,
  "fiber_g": 3,
  "unit": "piece",
  "grams_per_unit": 100
}
```

**Note:** Meal type (breakfast/lunch/snacks/dinner) is stored in meal_log, not in food_master.

### Adjusting RDA Calculation
Modify the `calculateRDA` function in [login/page.tsx](src/app/login/page.tsx) and [profile/page.tsx](src/app/profile/page.tsx).

## Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## License

This project is open source and available under the MIT License.

## Support

For issues or questions, please open an issue on the repository.

---

Built with ❤️ for tracking Indian mess food nutrition
