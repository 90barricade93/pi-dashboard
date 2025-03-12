# Changelog

Alle belangrijke wijzigingen in dit project worden hier gedocumenteerd.

## [1.0.1] - 2024-03-12

### Toegevoegd
- Code kwaliteit tools:
  - ESLint configuratie voor TypeScript en React
  - Prettier configuratie voor consistente code formatting
  - Husky pre-commit hooks
  - lint-staged voor efficiënte linting
- Type definities voor externe dependencies

### Gewijzigd
- Twitter API integratie:
  - Aangepast naar minimum van 10 tweets ophalen
  - Filteren naar 3 meest recente tweets
  - Verbeterde caching logica (4 uur vanaf middernacht)
- Migratie van CoinGecko naar OKX API:
  - Prijsdata ophalen via OKX endpoints
  - Historische data voor prijsvoorspellingen
  - Caching implementatie voor rate limiting
- Number formatting:
  - Consistente weergave tussen server en client
  - Gebruik van Intl.NumberFormat
  - Opgelost hydration mismatch issues

### Fixed
- Twitter API rate limiting errors
- Hydration mismatch bij number formatting
- Ontbrekende type definities voor lucide-react

## [1.0.0] - 2024-03-01

### Toegevoegd
- Initiële release
- Dashboard layout
- Prijstracking functionaliteit
- Nieuws feed met Twitter integratie
- Pi Calculator
- Netwerk statistieken
- Dark/Light thema
- Responsive design

Het formaat is gebaseerd op [Keep a Changelog](https://keepachangelog.com/nl/1.0.0/),
en dit project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- TypeScript configuratie met strikte checks
- ESLint configuratie met code kwaliteit regels
- Prettier configuratie voor consistente formatting
- Jest configuratie voor unit tests
- Playwright configuratie voor e2e tests
- GitHub Actions workflow voor CI/CD
- Dockerfile voor containerization
- CONTRIBUTING.md met richtlijnen
- CHANGELOG.md voor versie tracking

### Changed

- Geüpdatet naar Next.js 14.1.0 (stabiele versie)
- Geüpdatet naar React 18.2.0
- Verwijderd caret (^) van dependency versies voor betere stabiliteit
- Geüpdatet @types/node naar versie 20

### Fixed

- Security issues met next-themes door specifieke versie te gebruiken
- TypeScript configuratie voor betere type checking

### Security

- Toegevoegd security headers in next.config.mjs
- Geüpdatet dependencies naar veilige versies
