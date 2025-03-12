# Changelog

Alle belangrijke wijzigingen in dit project worden in dit bestand gedocumenteerd.

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