# Must Read

- Fetch latest documentation at https://deepwiki.com/yuanjian-org/app to deeply understand the codebase.
- ALWAYS make sure `yarn build` and `yarn test` pass before submitting pull requests.
- Keep all lines including comments within 80 characters limit.
- Add sufficient inline comments when making changes. Keep comments up to date.
- Avoid `any` types.
- When updating files for i18n support, ignore an entire file if the file has "@i18n-ignore-file" string in it; also ignore the line immediately below "@i18n-ignore".

# Development Environment

## Setup Requirements
- **Node.js**: Latest LTS version recommended
- **Yarn**: Package manager (avoid npm and pnpm)
- **PostgreSQL**: Local instance or cloud database
- **Environment Variables**: `.env` file with required secrets

## Required Environment Variables
```
DATABASE_URI=postgresql://...
NEXTAUTH_SECRET=your-secret-here
```

## Commands
- `yarn test` - Run all unit tests
- `yarn test:file` - Run specific unit test file
- `yarn prepare` - Setup project and Git hooks
- `yarn cypress-open` - Interactive E2E testing
- `yarn cypress-run` - Background E2E tests
- `yarn dev` - Start development server
- `yarn build` - Production build
- `yarn start` - Start production server

## Docker Support
- `docker compose build` - Build containerized environment
- `docker compose up` - Run full stack locally

# Development Workflows

## Code Organization Principles
- **Separation of Concerns**: Clear boundaries between client, server, and shared code
- **Type Safety**: Leverage TypeScript throughout the application. Avoid `any` types
- **Component Reusability**: Build modular, reusable React components
- **API Design**: Use tRPC for type-safe, self-documenting APIs

## Best Practices
- **Coding Style**: Follow [docs/CodingStyle.md](docs/CodingStyle.md)
- **ESLint**: Follow configured linting rules strictly
- **TypeScript**: Maintain strict type checking
- **Prettier**: Use consistent code formatting
- **File Naming**: Use PascalCase for React components, camelCase for utilities
- **Import Organization**: Group imports by type (React, external libs, internal). Use 2 spaces for indentation.
- **Error Handling**: Implement proper error boundaries and user feedback
- **Accessibility**: Follow WCAG guidelines for inclusive design
- **Git Hooks**: Pre-commit checks for quality assurance
- **Windows**: Use `cross-env` for environment variable issues
- **Performance**: Lazy loading and optimistic updates in UI

## Testing Strategy
- **Unit Tests**: Critical business logic and utility functions
- **Integration Tests**: API endpoints and database operations
- **E2E Tests**: Complete user workflows with Cypress
- **Manual Testing**: Role-based scenarios and edge cases

## How to Write Unit Tests
- **Running Unit Tests**: Use `yarn test:file` to run a single test file. Use `yarn test` to run all tests.
- **Mocking**: Always use real database and objects. Do not use mocks.
- **Simplicity**: Prioritize simple test constructs. The simpler the better.
- **Number of test cases**: Generate a small number of test cases. Focus only on the basic functionality and essential corner cases.
- **Errors**: Fix all build and linting errors.

# Troubleshooting

## Common Issues
- **Build Failures**: Check for improper imports between client/server code
- **Database Connections**: Verify `DATABASE_URI` format and accessibility
- **Authentication**: Ensure `NEXTAUTH_SECRET` is set and consistent
- **Matching Algorithm**: Check OR-Tools installation and solver availability

## Debug Tools
- **Next.js DevTools**: Built-in development server debugging
- **tRPC DevTools**: API call inspection and debugging
- **Sequelize Logging**: Database query debugging
- **Cypress Dashboard**: E2E test result analysis
