# Pi Dashboard

Een moderne, performante en veilige dashboard applicatie gebouwd met Next.js 14, React 18 en TypeScript.

## 🚀 Features

- ⚡️ Next.js 14 met App Router
- 🎨 Tailwind CSS voor styling
- 🔒 TypeScript voor type safety
- 🧪 Jest & Playwright voor testing
- 🐳 Docker ondersteuning
- 🔄 CI/CD met GitHub Actions
- 📱 Responsive design
- 🌙 Dark/Light mode
- ♿️ Toegankelijkheid (ARIA, keyboard navigation)
- 🔒 Security best practices
- 📈 Real-time prijsdata via OKX API

## 🛠️ Technische Stack

- **Framework:** Next.js 14.1.0
- **UI Library:** React 18.2.0
- **Styling:** Tailwind CSS
- **Type Checking:** TypeScript
- **Testing:** Jest & Playwright
- **Containerization:** Docker
- **CI/CD:** GitHub Actions
- **Code Quality:** ESLint & Prettier
- **API Integration:** OKX API v5

## 📋 Vereisten

- Node.js 20.x
- npm 10.x
- Docker (optioneel)
- OKX API credentials

## 🔑 Environment Variables

Maak een `.env` bestand aan in de root van het project met de volgende variabelen:

```env
# OKX API Credentials
OKX_API_KEY=jouw_api_key
OKX_API_SECRET=jouw_api_secret
OKX_PASSPHRASE=jouw_passphrase
```

Deze credentials kun je verkrijgen via je OKX account onder API Management.

## 🚀 Installatie

1. Clone de repository:
```bash
git clone https://github.com/90barricade93/pi-dashboard.git
cd pi-dashboard
```

2. Installeer dependencies:
```bash
npm install
```

3. Configureer environment variables:
- Kopieer `.env.example` naar `.env`
- Vul je OKX API credentials in

4. Start de development server:
```bash
npm run dev
```

De applicatie is nu beschikbaar op `http://localhost:3000`

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### E2E Tests
```bash
npm run test:e2e
```

## 🐳 Docker

### Build
```bash
docker build -t pi-dashboard .
```

### Run
```bash
docker run -p 3000:3000 pi-dashboard
```

## 📝 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build voor productie
- `npm start` - Start productie server
- `npm run lint` - Run ESLint
- `npm run format` - Format code met Prettier
- `npm test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests

## 🔒 Security

- Security headers geconfigureerd
- Dependency updates geautomatiseerd
- TypeScript strict mode
- ESLint security regels
- Input validatie met Zod

## 🤝 Bijdragen

We verwelkomen bijdragen! Zie [CONTRIBUTING.md](CONTRIBUTING.md) voor details.

## 📄 Licentie

Dit project is gelicentieerd onder de MIT License - zie het [LICENSE](LICENSE) bestand voor details.

## 📞 Contact

- GitHub Issues: [https://github.com/90barricade93/pi-dashboard/issues](https://github.com/90barricade93/pi-dashboard/issues)
- Email: [jouw-email@example.com](mailto:jouw-email@example.com)

## 🙏 Credits

- [Next.js](https://nextjs.org/)
- [React](https://reactjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)
- [TypeScript](https://www.typescriptlang.org/)

## 📈 API Integratie

De applicatie gebruikt de OKX API v5 voor real-time prijsdata. De belangrijkste endpoints zijn:

- `/market/ticker` - Voor real-time prijsinformatie
- `/market/candles` - Voor historische prijsdata

De API client is geconfigureerd met:
- Automatische valuta conversie
- Fallback prijzen bij API fouten
- Rate limiting volgens OKX specificaties
- Veilige authenticatie handling
