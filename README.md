# Pi Dashboard

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.0-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub_Actions-2088FF?style=flat-square&logo=github-actions)](https://github.com/features/actions)

Een moderne, performante en veilige dashboard applicatie voor het monitoren van Pi Network statistieken, prijzen en nieuws.

## 🚀 Features

- ⚡️ Real-time prijstracking via OKX API
- 📊 Prijsvoorspellingen gebaseerd op historische data
- 🧮 Pi Calculator voor waarde berekeningen
- 📰 Nieuws feed met Pi Network tweets integratie
- 📈 Netwerk statistieken
- 🌓 Dark/Light thema ondersteuning
- 📱 Responsive design
- ♿️ Toegankelijkheid (ARIA)
- 🔒 Security best practices

## 🛠️ Technische Stack

- **Framework:** Next.js 15
- **UI Library:** React 18
- **Type Safety:** TypeScript
- **Styling:** Tailwind CSS
- **Components:** Radix UI
- **API's:** OKX API, Twitter API v2
- **Testing:** Jest & Playwright
- **CI/CD:** GitHub Actions
- **Code Quality:** ESLint & Prettier

## 📋 Vereisten

- Node.js 20.x
- npm 10.x
- OKX API credentials
- Twitter API credentials

## 🔑 Environment Variables

```env
# API Credentials
OKX_API_KEY=jouw_api_key
OKX_API_SECRET=jouw_api_secret
OKX_PASSPHRASE=jouw_passphrase
TWITTER_BEARER_TOKEN=jouw_twitter_token
```

## 🚀 Setup

1. Clone de repository:
```bash
git clone https://github.com/yourusername/pi-dashboard.git
cd pi-dashboard
```

2. Installeer dependencies:
```bash
npm install
```

3. Configureer environment variables:
```bash
cp .env.example .env.local
```

4. Start de development server:
```bash
npm run dev
```

## 🧪 Code Kwaliteit & Testing

### Quality Tools
- 🔍 ESLint voor code linting
- ✨ Prettier voor code formatting
- 🐶 Husky voor pre-commit hooks
- ⚡️ lint-staged voor efficiënte linting

### Scripts
- `npm run lint`: ESLint check
- `npm run lint:fix`: ESLint fix
- `npm run format`: Prettier format
- `npm run format:check`: Prettier check
- `npm run type-check`: TypeScript check
- `npm run validate`: Alle checks
- `npm test`: Unit tests
- `npm run test:e2e`: E2E tests

## 🚀 Deployment

De applicatie is geoptimaliseerd voor Vercel deployment:

1. Push naar GitHub
2. Verbind met Vercel
3. Configureer variables
4. Deploy! 🎉

## ⚡️ API Rate Limiting

- **OKX API:** Cache 4 uur
- **Twitter API:** Max 3 tweets/request, 4 uur cache

## 🤝 Contributing

1. Fork de repository
2. Maak een feature branch
3. Commit wijzigingen (Conventional Commits)
4. Push naar de branch
5. Open een Pull Request

## 📄 License

MIT License - Zie [LICENSE](LICENSE) bestand voor details

## 📞 Contact & Support

- 🐛 [Issues](https://github.com/yourusername/pi-dashboard/issues)
- 📧 [Email](mailto:contact@example.com)

## 🙏 Credits

- [Next.js](https://nextjs.org/)
- [React](https://reactjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)
- [TypeScript](https://www.typescriptlang.org/)
