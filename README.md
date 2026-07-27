# Dr. Trivedi's Homeopathy - Patient Portal & Website

A premium, modern healthcare web application designed for Dr. Trivedi's Homeopathy clinic. This platform provides a seamless experience for patients to manage their health journey, from initial registration to appointment booking and digital record access.

## ✨ Features

### 🔐 Patient Authentication & Security
- **OTP-Based Verification**: Secure login and registration using mobile number verification.
- **Role-Based Access**: Dedicated patient portal with protected routes.
- **Session Management**: Persistent authentication states using secure local storage.

### 📅 Appointment Management
- **Smart Booking System**: Real-time appointment scheduling with clinic location and treatment type selection.
- **Dynamic Slot Selection**: View available morning and evening slots for consultations.
- **Appointment History**: Track past and upcoming visits in a clean, chronological dashboard.

### 🏥 Digital Patient Portal
- **Centralized Dashboard**: At-a-glance view of health statistics and upcoming tasks.
- **Prescription Records**: Access digital prescriptions anytime, anywhere.
- **Billing & Invoices**: View and download medical bills and payment history.
- **Profile Management**: Update personal health details and contact information.

### 🎨 Premium UI/UX
- **Modern Aesthetic**: Glassmorphism design with a curated teal and gold color palette.
- **Fluid Animations**: Smooth transitions and interactive elements powered by Framer Motion.
- **Live Clinic Status**: Real-time visibility of doctor availability.
- **Responsive Design**: Optimized for both desktop and mobile browsing.

## 🛠️ Tech Stack

- **Framework**: React 18 with Vite for ultra-fast development.
- **Styling**: Tailwind CSS for a modern, utility-first design.
- **Animations**: Framer Motion (motion/react) for premium micro-interactions.
- **Icons**: Lucide React for consistent, high-quality medical iconography.
- **Routing**: React Router DOM for seamless single-page navigation.
- **Icons**: Lucide React for consistent, high-quality medical iconography.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (Version 16 or higher)
- npm or yarn

### Installation & Local Development

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd dr.-trivedi-s-homeopathy
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to `http://localhost:5173` to view the application.

## 📁 Project Structure

- `src/components`: Reusable UI components (Navigation, Booking, etc.)
- `src/components/dashboard`: Patient-specific portal layouts and views.
- `src/context`: Authentication and global state management.
- `src/assets`: Static assets, images, and brand logos.
- `src/App.tsx`: Main application routing and route protection logic.

---

Designed and developed for **Dr. Trivedi's Homeopathy**.
