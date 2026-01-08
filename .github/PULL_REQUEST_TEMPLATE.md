## Description
<!-- Describe your changes in detail -->

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
<!-- Link any related issues: Fixes #123 -->

---

## 🔒 Code Guardian Checklist

### Authentication & Authorization
- [ ] All new API routes use `authenticate` middleware
- [ ] All DB queries include `user_id` filter where applicable
- [ ] No routes expose data without ownership checks

### Data Integrity
- [ ] No `forEach(async...)` for authoritative data operations
- [ ] Mutations properly invalidate related cache entries
- [ ] Backend is single source of truth for analytics/counts

### Code Quality
- [ ] No new `console.log` statements in production code
- [ ] No `select('*')` - specify exact columns needed
- [ ] No `TODO` or `FIXME` comments in submitted code

### Error Handling
- [ ] All async operations have try/catch
- [ ] User-facing errors show meaningful messages
- [ ] Silent failures are not possible

### Security
- [ ] No secrets or PII logged
- [ ] Input validation on all user inputs
- [ ] SQL injection protection (parameterized queries)

### Performance
- [ ] No N+1 query patterns
- [ ] Large lists are paginated
- [ ] Heavy components are lazy loaded

---

## Testing
- [ ] I have tested this change locally
- [ ] All existing tests pass
- [ ] I have added tests for new functionality (if applicable)

## Screenshots (if applicable)
<!-- Add screenshots to help explain your changes -->

## Additional Notes
<!-- Any additional information reviewers should know -->
