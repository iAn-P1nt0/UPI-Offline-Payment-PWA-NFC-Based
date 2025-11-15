# UPI Offline Payment PWA (NFC-Based)

An offline-first, privacy-centric Progressive Web App for secure UPI payments using NFC and QR code fallback, compliant with NPCI UPI Lite specifications.

## Overview

This project delivers a modern PWA that enables UPI payments in offline scenarios, leveraging NFC technology for tap-to-pay experiences with automatic synchronization when connectivity is restored. Built with Next.js 14+, Supabase, and deployed on Vercel's free tier.

## Features (Phase 1 MVP)

- **Offline-First Architecture**: Full functionality without internet connectivity
- **NFC Payments**: Tap-to-pay using Web NFC API
- **QR Code Fallback**: Scan/generate QR codes when NFC unavailable
- **Secure Authentication**: Phone-based OTP login via Supabase Auth
- **Wallet Management**: UPI ID linking with NPCI-compliant limits
- **Transaction Queue**: Automatic sync when online
- **PWA Capabilities**: Installable, works offline, native app-like experience
- **NPCI Compliance**: Adheres to UPI Lite specifications

## Technology Stack

### Frontend
- **Next.js 14+** - React framework with App Router
- **React 18+** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Shadcn/ui** - Component library (Radix UI)

### State & Data Management
- **Zustand** - Global state management
- **React Query** - Server state synchronization
- **Dexie.js** - IndexedDB wrapper for offline storage

### Authentication & Backend
- **Supabase** - Auth, PostgreSQL database, real-time subscriptions
- **Supabase SSR** - Server-side auth helpers

### PWA & Offline
- **next-pwa** - PWA configuration
- **Workbox** - Service worker strategies

### Utilities
- **Zod** - Runtime validation
- **date-fns** - Date manipulation
- **qrcode** - QR generation
- **html5-qrcode** - QR scanning
- **nanoid** - Unique ID generation

## NPCI UPI Lite Compliance

This application strictly enforces NPCI UPI Lite specifications:

- **Maximum Transaction Amount**: ₹1,000
- **Maximum Wallet Balance**: ₹5,000
- **Maximum Daily Transactions**: 20
- **Maximum Offline Transactions**: 5 (before mandatory sync)
- **Sync Deadline**: 4 days

## Project Structure

```
UPI-Offline-Payment-PWA-NFC-Based/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── auth/              # Authentication flows
│   │   ├── dashboard/         # Main dashboard
│   │   ├── pay/               # Payment flows (NFC/QR)
│   │   ├── transactions/      # Transaction history
│   │   ├── wallet/            # Wallet management
│   │   └── api/               # API routes
│   ├── components/            # React components
│   │   ├── ui/               # Shadcn/ui components
│   │   ├── auth/             # Auth-related components
│   │   ├── wallet/           # Wallet components
│   │   ├── payment/          # Payment components
│   │   ├── transaction/      # Transaction components
│   │   └── dashboard/        # Dashboard components
│   ├── lib/                  # Utility libraries
│   │   ├── db/              # Database clients (Supabase, Dexie)
│   │   ├── auth/            # Auth helpers
│   │   ├── nfc/             # NFC manager
│   │   ├── qr/              # QR code utilities
│   │   ├── sync/            # Sync manager
│   │   ├── wallet/          # Wallet business logic
│   │   └── utils/           # Common utilities
│   ├── hooks/               # Custom React hooks
│   ├── types/               # TypeScript type definitions
│   └── styles/              # Global styles
├── public/                  # Static assets
│   ├── icons/              # PWA icons
│   └── manifest.json       # PWA manifest
├── supabase/               # Supabase migrations & seeds
├── __tests__/              # Test files
└── docs/                   # Documentation

```

## Prerequisites

- **Node.js** 18.17 or later
- **npm** or **yarn**
- **Supabase account** (free tier)
- **Vercel account** (optional, for deployment)
- **NFC-capable device** for testing NFC payments

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/iAn-P1nt0/UPI-Offline-Payment-PWA-NFC-Based.git
cd UPI-Offline-Payment-PWA-NFC-Based
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Create a new project at [Supabase](https://app.supabase.com)
2. Navigate to **Settings** → **API** and copy:
   - Project URL
   - Anon (public) key
   - Service role key (keep this secret!)

### 4. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in your Supabase credentials and other settings.

### 5. Run Database Migrations

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations (coming in next steps)
# supabase db push
```

### 6. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler check
```

## Development Workflow

### Phase 1 Implementation Status

- [x] Project scaffolding
- [x] Dependencies installed
- [x] Configuration files created
- [ ] Database schema setup
- [ ] Authentication flows
- [ ] Wallet management
- [ ] NFC payment implementation
- [ ] QR code fallback
- [ ] Transaction sync
- [ ] PWA configuration
- [ ] Deployment setup

See **AGENTS.md** for detailed implementation checklist.

## Security Considerations

This project implements multiple security layers:

- **No PIN Storage**: UPI PINs are NEVER stored
- **End-to-End Encryption**: Web Crypto API for sensitive data
- **JWT Authentication**: Secure token-based auth
- **Row-Level Security**: Supabase RLS policies
- **Device Fingerprinting**: Bind wallet to trusted devices
- **Transaction Signing**: Cryptographic signatures for all transactions
- **Input Validation**: Zod schemas for all user inputs
- **HTTPS Only**: Enforced in production
- **Security Headers**: CSP, HSTS, X-Frame-Options, etc.

## Browser Compatibility

### Required Features
- **Service Workers**: For offline functionality
- **IndexedDB**: For local data storage
- **Web Crypto API**: For encryption
- **NFC (optional)**: For tap-to-pay (fallback to QR)

### Recommended Browsers
- Chrome/Edge 89+
- Safari 15.4+
- Firefox 90+

**Note**: NFC support requires Chrome/Edge on Android or Safari on iOS 13+.

## Deployment

### Vercel (Recommended)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

3. Set environment variables in Vercel dashboard

### Manual Deployment

```bash
npm run build
npm run start
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

## Documentation

- **CLAUDE.md**: Project vision, architecture, and implementation guidelines
- **AGENTS.md**: Modular implementation checklist and conventions
- **/docs**: Additional technical documentation (coming soon)

## Contributing

This is an open-source project. Contributions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Reference **AGENTS.md** and **CLAUDE.md** in your PR description
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

ISC License - see LICENSE file for details

## Roadmap

### Phase 1: MVP Foundations (Current)
- Core authentication
- Wallet setup
- NFC/QR payments
- Offline queue
- Basic sync

### Phase 2: Advanced Features
- Merchant mode
- Biometric auth
- Analytics dashboard
- Enhanced sync logic

### Phase 3: Security & Compliance
- Fraud detection
- Wallet freeze
- Compliance audits
- Multi-device sync

### Phase 4: Modularity & Customization
- Plugin architecture
- Feature flags
- Custom hooks
- Extended documentation

## Support

For issues, questions, or contributions:
- **GitHub Issues**: [Report bugs or request features](https://github.com/iAn-P1nt0/UPI-Offline-Payment-PWA-NFC-Based/issues)
- **Discussions**: Share ideas and ask questions

## Acknowledgments

Built with adherence to NPCI UPI specifications and modern web standards. Designed for privacy, security, and offline-first user experiences.

---

**Built with ❤️ for the future of offline payments**
