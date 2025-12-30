# Contributing to NebulaLinks

Thank you for your interest in contributing to NebulaLinks VPN Sales System!

## Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/nebulalinks-vpn-system.git`
3. Install dependencies:
   ```bash
   cd discord-bot && npm install
   cd ../api-gateway && npm install
   ```
4. Copy `.env.example` to `.env` in both directories and configure
5. Run the development environment

## Code Style

- Use ESLint configuration provided
- Follow existing code patterns
- Add comments for complex logic
- Use meaningful variable names

## Testing

- Test all changes thoroughly
- Ensure no breaking changes to existing functionality
- Test both Discord bot and API gateway components

## Pull Request Process

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Commit with clear messages: `git commit -m "Add: feature description"`
4. Push to your fork: `git push origin feature/your-feature-name`
5. Create a Pull Request with detailed description

## Issues

- Use the issue templates provided
- Include steps to reproduce for bugs
- Provide clear feature descriptions for enhancements

## Security

- Never commit sensitive data (tokens, passwords, keys)
- Report security vulnerabilities privately
- Follow security best practices

## License

By contributing, you agree that your contributions will be licensed under the MIT License.