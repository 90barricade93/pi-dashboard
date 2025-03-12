# Pi Dashboard

Een moderne dashboard applicatie voor het monitoren van Pi Network statistieken, prijzen en nieuws.

## Features

- Real-time prijstracking via OKX API
- Prijsvoorspellingen gebaseerd op historische data
- Pi Calculator voor waarde berekeningen
- Nieuws feed met integratie van officiële Pi Network tweets
- Netwerk statistieken
- Dark/Light thema ondersteuning
- Responsive design

## Technische Stack

- Next.js 15
- React 18
- TypeScript
- Tailwind CSS
- Radix UI componenten
- OKX API voor prijsdata
- Twitter API v2 voor nieuws updates

## Setup

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

Vul de volgende environment variables in:
- `OKX_API_KEY`: Je OKX API key
- `OKX_API_SECRET`: Je OKX API secret
- `OKX_PASSPHRASE`: Je OKX API passphrase
- `TWITTER_BEARER_TOKEN`: Je Twitter API bearer token

4. Start de development server:
```bash
npm run dev
```

## Code Kwaliteit

Het project gebruikt verschillende tools voor code kwaliteit:

- ESLint voor code linting
- Prettier voor code formatting
- Husky voor pre-commit hooks
- lint-staged voor efficiënte linting

Beschikbare scripts:
- `npm run lint`: ESLint check
- `npm run lint:fix`: ESLint fix
- `npm run format`: Prettier format
- `npm run format:check`: Prettier check
- `npm run type-check`: TypeScript check
- `npm run validate`: Alle checks uitvoeren

## Tests

- Unit tests: `npm test`
- E2E tests: `npm run test:e2e`

## Deployment

De applicatie is geoptimaliseerd voor deployment op Vercel:

1. Push je code naar GitHub
2. Verbind je repository met Vercel
3. Configureer de environment variables
4. Deploy!

## API Rate Limiting

- OKX API: Requests worden gecached voor 4 uur
- Twitter API: Maximum 3 tweets per request, gecached voor 4 uur vanaf middernacht

## Contributing

1. Fork de repository
2. Maak een feature branch
3. Commit je wijzigingen (met Conventional Commits)
4. Push naar de branch
5. Open een Pull Request

## License

MIT License - Zie LICENSE bestand voor details
