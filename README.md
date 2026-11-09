
# 🚗 Our Parking

A simple and smart parking management app for shared apartments.

Our Parking allows apartment members to check parking availability in real time, reserve a shared parking spot, and get notified when it becomes available.

🌐 **Live App:** https://our-parking.vercel.app

## ✨ Features

- 🚗 **Real-Time Parking Status** — Instantly see whether the parking spot is available or occupied.
- 👤 **User Management** — Register with your name and a private apartment invitation code.
- 🔒 **Secure Parking Control** — Only the member who occupied the spot can release it.
- 🔑 **Manager Override** — Emergency parking release using a protected manager code.
- 🔔 **Push Notifications** — Receive notifications when the parking spot becomes available.
- ✏️ **Profile Management** — Update your display name or switch accounts.
- 📱 **Progressive Web App (PWA)** — Install directly on iPhone or Android.
- ☁️ **Cloud Sync** — Parking status stays synchronized across connected devices.

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| React | Frontend UI |
| Vite | Development and build |
| Firebase Authentication | Anonymous user authentication |
| Cloud Firestore | Real-time database |
| Firebase Admin SDK | Secure backend operations |
| Vercel | Hosting and serverless API |
| Web Push | Push notifications |
| Service Worker | PWA and notification support |

## 🏗️ Project Structure

```text
our-parking/
├── api/
│   ├── register.js
│   ├── parking.js
│   ├── profile.js
│   └── notifications.js
├── server/
│   └── common.js
├── src/
│   ├── firebase.js
│   ├── main.jsx
│   ├── style.css
│   └── sw.js
├── public/
├── firestore.rules
├── vite.config.js
├── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js and npm
- Firebase project
- Vercel project

### Installation

Clone the repository:

```bash
git clone https://github.com/HarelAmar1/our-parking.git
cd our-parking
```

Install dependencies:

```bash
npm install
```

Start the frontend development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

**Note:** The Vite development server does not run the Vercel API functions. Full local development requires a configured serverless environment.

## ⚙️ Environment Variables

Configure the following variables in your Vercel project:

| Variable | Description |
|----------|-------------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase Admin service account credentials |
| `INVITE_CODE` | Private apartment registration code |
| `MANAGER_CODE` | Emergency parking manager code |
| `VAPID_PUBLIC_KEY` | Public Web Push key |
| `VAPID_PRIVATE_KEY` | Private Web Push key |
| `VAPID_SUBJECT` | Web Push contact identifier |
| `VITE_VAPID_PUBLIC_KEY` | Public VAPID key exposed to the frontend |

Never commit private credentials, secret codes, or service account JSON files to GitHub.

## 🔐 Security

The application uses Firebase Authentication and protected serverless API endpoints.

- Users must authenticate before making API requests.
- Apartment members register using a private invitation code.
- Firestore Security Rules prevent direct client-side modifications.
- Parking operations are processed through server-side transactions.
- Only the current parking owner can perform a normal release.
- Manager override requires a separate secret code.
- Failed manager-code attempts are rate-limited per account.
- Push subscriptions are associated with authenticated users.

Firebase Admin SDK handles privileged database operations on the server.

## 🔔 Push Notifications

Members can enable notifications from the application settings.

When the parking spot is released, subscribed members can receive a notification.

On iPhone, Web Push requires the app to be added to the Home Screen on a supported iOS version.

Notification availability and delivery depend on device permissions, browser support, and operating-system restrictions.

## 📱 Install on Mobile

### iPhone

1. Open the app in Safari.
2. Tap **Share**.
3. Select **Add to Home Screen**.
4. Launch the app from your Home Screen.

### Android

1. Open the app in Chrome.
2. Tap the three-dot menu.
3. Select **Install app** or **Add to Home screen**.
4. Launch the installed app.

## ☁️ Deployment

The project is deployed using Vercel with GitHub integration.

Changes pushed to the production branch trigger a new deployment.

Before deploying, make sure:

- All required environment variables are configured.
- Firebase Authentication is enabled.
- Firestore is initialized.
- The required Firestore Security Rules are published.
- The Firebase Admin service account has the necessary permissions.

## 📌 Roadmap

- [x] Real-time parking availability
- [x] User registration with invitation code
- [x] Parking ownership and release
- [x] Manager emergency override
- [x] Push notifications
- [x] Mobile PWA support
- [ ] Home screen parking status widget
- [ ] Parking activity history

## 👨‍💻 Author

**Harel Amar**

GitHub: [@HarelAmar1](https://github.com/HarelAmar1)

---

Built to make shared parking simple. 🚗
