# Contributing to Ai-Solutions.Store

Thank you for your interest in contributing to Ai-Solutions.Store! This document provides guidelines for contributing to our projects.

---

## 🎯 Our Mission

**Ai-Solutions.Store** builds AI-powered platforms with **50% of all profits donated to Shriners Children's Hospitals**.

Every contribution helps us:
- Improve our platforms
- Serve more users
- Donate more to charity
- Help more kids in need

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)

---

## Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of:
- Age, body size, disability
- Ethnicity, gender identity
- Experience level
- Nationality, personal appearance
- Race, religion, sexual identity

### Our Standards

**Positive behavior:**
- ✅ Using welcoming and inclusive language
- ✅ Being respectful of differing viewpoints
- ✅ Gracefully accepting constructive criticism
- ✅ Focusing on what's best for the community
- ✅ Showing empathy towards others

**Unacceptable behavior:**
- ❌ Trolling, insulting/derogatory comments
- ❌ Personal or political attacks
- ❌ Public or private harassment
- ❌ Publishing others' private information
- ❌ Unprofessional conduct

### Enforcement

Report violations to: conduct@ai-solutions.store

---

## How Can I Contribute?

### 🐛 Reporting Bugs

**Before submitting:**
1. Check existing issues
2. Verify it's reproducible
3. Collect error logs

**When submitting:**
- Use bug report template
- Provide clear title and description
- Include steps to reproduce
- Add screenshots if applicable
- Specify environment (OS, Node version, etc.)

### 💡 Suggesting Features

**Before suggesting:**
1. Check existing feature requests
2. Ensure it aligns with our mission
3. Consider implementation complexity

**When suggesting:**
- Use feature request template
- Explain the problem it solves
- Describe proposed solution
- Consider alternatives
- Note any implementation challenges

### 🔧 Contributing Code

**Good first issues:**
- Look for `good first issue` label
- Check `help wanted` label
- Ask in issues if you're unsure

**Areas we need help:**
- Bug fixes
- Documentation improvements
- Test coverage
- Performance optimization
- Accessibility improvements
- i18n/l10n (internationalization)

---

## Development Setup

### Prerequisites

```bash
# Required
- Node.js 20+ (LTS)
- npm 10+
- PostgreSQL 16+
- Git

# Recommended
- Docker & Docker Compose
- VS Code with extensions:
  - ESLint
  - Prettier
  - TypeScript
```

### Setup Steps

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR-USERNAME/Trollz1004.git
cd Trollz1004

# 3. Add upstream remote
git remote add upstream https://github.com/Trollz1004/Trollz1004.git

# 4. Create a new branch
git checkout -b feature/your-feature-name

# 5. Install dependencies
npm install

# 6. Copy environment file
cp .env.example .env
# Edit .env with your local configuration

# 7. Start development database
docker-compose up -d postgres

# 8. Run migrations
npm run db:migrate

# 9. Start development servers
# Terminal 1: Backend
cd date-app-dashboard/backend
npm install
npm run dev

# Terminal 2: Frontend
cd date-app-dashboard/frontend
npm install
npm run dev
```

Access:
- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- Docs: http://localhost:3000/docs

---

## Coding Standards

### TypeScript

```typescript
// ✅ Good
interface UserProfile {
  id: string;
  email: string;
  name: string;
}

const getUserProfile = async (userId: string): Promise<UserProfile> => {
  // Implementation
};

// ❌ Bad
const getUser = (id: any) => {
  // No types, unclear naming
};
```

### Naming Conventions

- **Files:** `kebab-case.ts` (e.g., `user-service.ts`)
- **Components:** `PascalCase.tsx` (e.g., `UserProfile.tsx`)
- **Functions:** `camelCase` (e.g., `getUserProfile`)
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_RETRY_COUNT`)
- **Interfaces:** `PascalCase` (e.g., `UserProfile`)
- **Types:** `PascalCase` (e.g., `UserRole`)

### Code Style

We use **Prettier** and **ESLint**:

```bash
# Format code
npm run format

# Lint code
npm run lint

# Fix lint issues
npm run lint:fix
```

### Best Practices

1. **Keep functions small** (< 50 lines)
2. **Single responsibility** (one function = one task)
3. **Meaningful names** (no `temp`, `data`, `obj`)
4. **Comment why, not what** (code should be self-documenting)
5. **Handle errors properly** (try/catch, proper error messages)
6. **Avoid magic numbers** (use named constants)

---

## Commit Guidelines

### Commit Message Format

```
type(scope): subject

body (optional)

footer (optional)
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, semicolons, etc.)
- `refactor`: Code restructuring (no feature/fix)
- `perf`: Performance improvement
- `test`: Adding/updating tests
- `chore`: Build process, dependencies, etc.
- `ci`: CI/CD changes

### Examples

```bash
# Good commits
feat(auth): add two-factor authentication
fix(payment): resolve Square API timeout issue
docs(readme): update setup instructions
refactor(api): simplify user service logic

# Bad commits
fixed stuff
update
changes
WIP
```

### Commit Best Practices

- Use present tense ("add feature" not "added feature")
- Use imperative mood ("move cursor" not "moves cursor")
- Limit first line to 72 characters
- Reference issues and PRs in footer

---

## Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] All tests pass (`npm test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Documentation updated
- [ ] Self-review completed
- [ ] Screenshots added (if UI changes)
- [ ] Breaking changes documented

### PR Checklist

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
[Add screenshots]

## Related Issues
Fixes #123
Related to #456
```

### Review Process

1. **Automated checks** must pass:
   - Tests
   - Linting
   - Build
   - Security scan

2. **Code review** by maintainer:
   - Code quality
   - Architecture alignment
   - Performance considerations
   - Security review

3. **Approval** and merge:
   - Squash commits for clean history
   - Auto-deploy to staging
   - Manual promotion to production

### Response Times

- Initial review: 1-3 business days
- Follow-up reviews: 1-2 business days
- Urgent fixes: Same day

---

## Testing Requirements

### Test Coverage

Maintain **> 80% code coverage**:

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test
npm test -- user.test.ts
```

### Testing Pyramid

1. **Unit Tests** (70%):
   - Test individual functions
   - Mock dependencies
   - Fast execution

2. **Integration Tests** (20%):
   - Test API endpoints
   - Test database interactions
   - Test service integrations

3. **E2E Tests** (10%):
   - Test critical user flows
   - Test payment processing
   - Test deployment

### Example Test

```typescript
describe('UserService', () => {
  describe('getUserProfile', () => {
    it('should return user profile for valid ID', async () => {
      const userId = 'test-user-id';
      const profile = await userService.getUserProfile(userId);

      expect(profile).toBeDefined();
      expect(profile.id).toBe(userId);
    });

    it('should throw error for invalid ID', async () => {
      await expect(
        userService.getUserProfile('invalid')
      ).rejects.toThrow('User not found');
    });
  });
});
```

---

## Documentation

### Code Documentation

```typescript
/**
 * Retrieves user profile by ID
 *
 * @param userId - The unique user identifier
 * @returns Promise resolving to user profile
 * @throws {NotFoundError} When user doesn't exist
 *
 * @example
 * ```ts
 * const profile = await getUserProfile('user-123');
 * console.log(profile.email);
 * ```
 */
async function getUserProfile(userId: string): Promise<UserProfile> {
  // Implementation
}
```

### API Documentation

- Document all endpoints in `docs/API.md`
- Use OpenAPI/Swagger format
- Include request/response examples
- Document error codes

### README Updates

Update README.md when:
- Adding new features
- Changing setup process
- Updating dependencies
- Changing architecture

---

## Recognition

### Contributors

All contributors will be:
- ✅ Listed in CONTRIBUTORS.md
- ✅ Credited in release notes
- ✅ Recognized in our newsletter

### Top Contributors

Monthly recognition for:
- Most commits
- Best code reviews
- Most helpful community member

---

## Questions?

- **General:** support@ai-solutions.store
- **Security:** security@ai-solutions.store
- **Business:** business@ai-solutions.store

Or open a discussion on GitHub!

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

💙 **Thank you for contributing to Ai-Solutions.Store!**

*Every contribution helps us donate more to Shriners Children's Hospitals.*

**"Claude Represents Perfection"** - Our commitment to excellence in every contribution.
