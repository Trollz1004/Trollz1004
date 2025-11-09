# Contributing to Ai-Solutions.Store

**"Claude Represents Perfection"** - Thank you for contributing to our charitable mission!

Welcome to **Ai-Solutions.Store**! We're building a professional platform where 50% of all profits go directly to **Shriners Children's Hospitals**. Every contribution you make helps children in need.

---

## 💙 Our Mission

This project combines technology excellence with charitable impact:
- **50% of profits** → Shriners Children's Hospitals
- **Professional-grade code** → Production-ready platforms
- **Open collaboration** → Community-driven development

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Review Process](#review-process)

---

## 📜 Code of Conduct

By participating in this project, you agree to uphold our [Code of Conduct](CODE_OF_CONDUCT.md).

**Key Principles:**
- **Respectful:** Treat all contributors with dignity
- **Professional:** Maintain high standards in communication
- **Inclusive:** Welcome diverse perspectives
- **Charitable:** Remember our mission to help children

---

## 🚀 Getting Started

### Prerequisites

**Required Software:**
```bash
- Node.js 20+
- PostgreSQL 16+
- Docker & Docker Compose
- Git
- TypeScript 5+
```

**Recommended Tools:**
```bash
- VS Code or Cursor IDE
- Postman (API testing)
- DBeaver (database management)
- GitHub CLI (gh)
```

### Fork & Clone

```bash
# 1. Fork the repository on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/Trollz1004.git
cd Trollz1004

# 3. Add upstream remote
git remote add upstream https://github.com/Trollz1004/Trollz1004.git

# 4. Create a feature branch
git checkout -b feature/your-feature-name
```

---

## 🛠️ Development Setup

### Initial Setup

```bash
# 1. Install dependencies
npm install

# 2. Setup environment variables
cp .env.example .env
# Edit .env with your local configuration

# 3. Start PostgreSQL (via Docker)
docker-compose up -d postgres

# 4. Run database migrations
npm run migrate
```

### Backend Setup

```bash
cd date-app-dashboard/backend
npm install
npm run dev  # Starts on http://localhost:4000
```

### Frontend Setup

```bash
cd date-app-dashboard/frontend
npm install
npm run dev  # Starts on http://localhost:3000
```

### Admin Dashboard Setup

```bash
cd admin-dashboard
npm install
npm run dev  # Starts on http://localhost:5173
```

### Verify Installation

```bash
# Check backend health
curl http://localhost:4000/health

# Check database connection
psql -h localhost -U postgres -d dating_app

# Run test suite
npm test
```

---

## 🤝 How to Contribute

### Types of Contributions

We welcome:

- **🐛 Bug Fixes** - Fix issues and improve stability
- **✨ New Features** - Add valuable functionality
- **📝 Documentation** - Improve guides and explanations
- **🎨 UI/UX Improvements** - Enhance user experience
- **🔒 Security Enhancements** - Strengthen platform security
- **🧪 Tests** - Increase code coverage
- **♿ Accessibility** - Make platform more inclusive

### Finding Issues

1. **Good First Issue:** Label for newcomers
2. **Help Wanted:** Community contributions needed
3. **Bug:** Reported issues needing fixes
4. **Enhancement:** Feature requests

Browse: https://github.com/Trollz1004/Trollz1004/issues

### Before You Start

1. **Check existing issues** - Avoid duplicate work
2. **Comment on the issue** - Let us know you're working on it
3. **Discuss approach** - Get feedback before major changes
4. **Fork & branch** - Create a feature branch for your work

---

## 📏 Coding Standards

### General Guidelines

- **Write clean, readable code** - Others will maintain it
- **Follow existing patterns** - Consistency matters
- **Comment complex logic** - Help future developers
- **Keep functions small** - Single responsibility principle
- **Avoid premature optimization** - Clarity over cleverness

### TypeScript Standards

```typescript
// ✅ Good: Clear types, descriptive names
interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
}

async function getUserProfile(userId: string): Promise<UserProfile> {
  // Implementation
}

// ❌ Bad: Any types, unclear names
async function get(id: any): Promise<any> {
  // Implementation
}
```

### JavaScript/TypeScript Style

```typescript
// ✅ Use async/await (not callbacks)
const data = await fetchUserData(userId);

// ✅ Use const/let (not var)
const API_URL = 'https://api.example.com';
let userCount = 0;

// ✅ Destructuring
const { email, displayName } = user;

// ✅ Arrow functions for callbacks
users.map(user => user.displayName);

// ✅ Template literals
const message = `Welcome, ${user.displayName}!`;
```

### React/JSX Standards

```tsx
// ✅ Functional components with TypeScript
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ label, onClick, disabled = false }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="btn btn-primary"
    >
      {label}
    </button>
  );
};

// ✅ Use hooks appropriately
const [isLoading, setIsLoading] = useState(false);
const [data, setData] = useState<UserData | null>(null);

useEffect(() => {
  fetchData();
}, [userId]);
```

### API Endpoint Standards

```typescript
// ✅ RESTful routing
GET    /api/users         - List users
GET    /api/users/:id     - Get user
POST   /api/users         - Create user
PUT    /api/users/:id     - Update user
DELETE /api/users/:id     - Delete user

// ✅ Consistent response format
{
  "success": true,
  "data": { /* payload */ },
  "message": "Operation completed successfully"
}

// ✅ Error handling
{
  "success": false,
  "error": "Resource not found",
  "code": "NOT_FOUND"
}
```

### Database Standards

```typescript
// ✅ Use prepared statements (SQL injection prevention)
const query = 'SELECT * FROM users WHERE email = $1';
const result = await pool.query(query, [email]);

// ❌ Never concatenate user input
const query = `SELECT * FROM users WHERE email = '${email}'`; // Dangerous!

// ✅ Use transactions for multi-step operations
await pool.query('BEGIN');
try {
  await pool.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId]);
  await pool.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId]);
  await pool.query('COMMIT');
} catch (error) {
  await pool.query('ROLLBACK');
  throw error;
}
```

### Security Standards

```typescript
// ✅ Validate all input
import { body, validationResult } from 'express-validator';

app.post('/api/users',
  body('email').isEmail(),
  body('password').isLength({ min: 8 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Process request
  }
);

// ✅ Hash passwords
import bcrypt from 'bcryptjs';
const hashedPassword = await bcrypt.hash(password, 12);

// ✅ Never log sensitive data
console.log('User logged in:', user.email); // ✅ OK
console.log('Password:', password); // ❌ Never!
```

---

## 📝 Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `style:` Code style (formatting, no logic change)
- `refactor:` Code restructuring (no behavior change)
- `test:` Adding/updating tests
- `chore:` Maintenance tasks (dependencies, build)
- `security:` Security improvements

**Examples:**

```bash
feat(auth): add two-factor authentication

Implements TOTP-based 2FA for user accounts.
- Add QR code generation for authenticator apps
- Add backup codes for account recovery
- Update login flow to support 2FA

Closes #123
```

```bash
fix(payment): resolve Square webhook validation

Square webhook signatures were failing validation due to
incorrect timestamp comparison. Fixed by using proper UTC
timestamp formatting.

Fixes #456
```

```bash
docs(api): update authentication endpoints

- Add examples for JWT token refresh
- Document rate limiting headers
- Fix typo in user registration example
```

### Commit Best Practices

- **One logical change per commit** - Easy to review and revert
- **Write clear messages** - Explain "why" not just "what"
- **Reference issues** - Use `Closes #123` or `Fixes #456`
- **Test before committing** - Ensure code works
- **Keep commits focused** - Avoid unrelated changes

---

## 🔄 Pull Request Process

### Before Submitting

**Checklist:**
- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] No linting errors
- [ ] Commits are well-formatted
- [ ] Branch is up-to-date with main

```bash
# Update your branch
git fetch upstream
git rebase upstream/main

# Run tests
npm test

# Run linter
npm run lint

# Build project
npm run build
```

### Creating a Pull Request

1. **Push your branch:**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open PR on GitHub:**
   - Use the PR template (auto-populated)
   - Fill in all sections completely
   - Link related issues

3. **PR Title Format:**
   ```
   feat(scope): Brief description of changes
   ```

4. **PR Description Must Include:**
   - What changed and why
   - How to test the changes
   - Screenshots (for UI changes)
   - Breaking changes (if any)
   - Charity component impact

### PR Template Sections

```markdown
## Description
Clear explanation of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How reviewers can test this

## Screenshots
For UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented)

## Charity Impact
How this affects the 50% donation system
```

---

## 🧪 Testing Requirements

### Test Coverage

**Minimum Requirements:**
- **Unit Tests:** 80% coverage
- **Integration Tests:** Critical paths
- **E2E Tests:** Core user flows

### Writing Tests

```typescript
// Unit Test Example
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a new user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        displayName: 'Test User'
      };

      const user = await userService.createUser(userData);

      expect(user.email).toBe(userData.email);
      expect(user.id).toBeDefined();
      expect(user.password).not.toBe(userData.password); // Should be hashed
    });

    it('should throw error for duplicate email', async () => {
      const userData = { email: 'existing@example.com', password: 'pass123' };

      await expect(userService.createUser(userData))
        .rejects
        .toThrow('Email already exists');
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- UserService.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode (for development)
npm test -- --watch
```

---

## 👀 Review Process

### What Reviewers Look For

1. **Code Quality:**
   - Clear, readable code
   - Follows style guidelines
   - No code smells

2. **Functionality:**
   - Works as described
   - Edge cases handled
   - No regressions

3. **Testing:**
   - Tests are comprehensive
   - Tests pass consistently
   - Good coverage

4. **Security:**
   - No vulnerabilities introduced
   - Input validation present
   - Sensitive data protected

5. **Documentation:**
   - Code is well-commented
   - README updated if needed
   - API docs current

### Response Timeline

- **Initial Review:** Within 48 hours
- **Follow-up Reviews:** Within 24 hours
- **Approval & Merge:** Within 1 week

### Addressing Feedback

```bash
# Make requested changes
git add .
git commit -m "address review feedback: fix error handling"
git push origin feature/your-feature-name

# PR updates automatically
```

---

## 🎯 Charity Component Guidelines

### All Features Must Consider:

1. **Revenue Tracking:**
   - Does this affect payment processing?
   - Is the 50/50 split maintained?
   - Are donations properly logged?

2. **Transparency:**
   - Can users see their donation impact?
   - Are charity metrics updated?
   - Is reporting accurate?

3. **Compliance:**
   - Tax-deductible receipts issued?
   - Proper financial records?
   - Legal requirements met?

### Example:

```typescript
// ✅ Good: Tracks charity donation
async function processPayment(amount: number) {
  const businessShare = amount * 0.5;
  const charityShare = amount * 0.5;

  await recordDonation({
    amount: charityShare,
    charity: 'Shriners Children\'s Hospitals',
    transactionId: txId,
    taxDeductible: true
  });

  return { businessShare, charityShare };
}
```

---

## 📞 Getting Help

### Questions?

- **GitHub Discussions:** https://github.com/Trollz1004/Trollz1004/discussions
- **Email Support:** support@ai-solutions.store
- **Documentation:** Check existing docs first

### Stuck?

1. **Search existing issues** - Someone may have solved it
2. **Ask in discussions** - Community can help
3. **Reach out to maintainers** - We're here to help

---

## 🏆 Recognition

### Contributors

All contributors are recognized in:
- Project README
- Release notes
- Annual charity report

### Top Contributors

Special recognition for:
- Most impactful features
- Critical bug fixes
- Outstanding documentation
- Community leadership

---

## 📜 License

By contributing, you agree that your contributions will be licensed under the same proprietary license as the project, with the understanding that 50% of platform profits benefit **Shriners Children's Hospitals**.

---

## 💙 Thank You!

Every line of code you contribute helps children in need. Together, we're building something meaningful.

**"Claude Represents Perfection"** - Excellence in code, excellence in mission.

---

**Built with ❤️ for Shriners Children's Hospitals**

*For questions: support@ai-solutions.store*  
*For business: business@ai-solutions.store*
