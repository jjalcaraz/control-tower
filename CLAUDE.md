# SMS Marketing System - Developer Guide

This is a TCPA-compliant SMS marketing platform built with React, TypeScript, and modern web technologies.

## Quick Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run typecheck    # Type check without building
npm run lint         # Run ESLint
npm run test         # Run tests

# Deployment
npm run preview      # Preview production build
```

## Architecture Overview

### Frontend Stack
- **React 18** with TypeScript
- **Tailwind CSS** for styling  
- **Shadcn/ui** for component library
- **React Query** for server state management
- **React Hook Form** with Zod validation
- **Vite** for build tooling

### Project Structure
```
src/
├── components/     # React components organized by feature
├── hooks/          # Custom React hooks
├── lib/            # Core utilities and API clients
├── pages/          # Page components
├── types/          # TypeScript type definitions
└── utils/          # Helper functions
```

## Key Features Implemented

### ✅ Phase 1 - Core Foundation
1. **Authentication System**
   - JWT-based authentication with refresh tokens
   - Role-based access control (admin, campaign_manager, operator, viewer)
   - Two-factor authentication support
   - Secure password reset flow

2. **Dashboard**
   - Real-time KPI metrics display
   - Active campaigns overview
   - Recent leads activity
   - Message inbox summary

3. **Lead Management**
   - CSV/Excel import functionality
   - Advanced filtering and search
   - Duplicate detection
   - Bulk operations support
   - Property and contact information management

4. **Campaign Management**
   - Campaign creation wizard
   - A/B testing support
   - Scheduling and automation
   - Real-time metrics tracking

5. **Two-Way Messaging**
   - Real-time conversation interface
   - Message templates and quick responses
   - Conversation threading
   - Mobile-responsive design

## Development Patterns

### Component Structure
```tsx
interface ComponentProps {
  required: string
  optional?: number
}

export function ComponentName({ required, optional }: ComponentProps) {
  const { data, isLoading, error } = useQuery(['key'], fetchFunction)
  
  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  
  return (
    <div className="space-y-4">
      {/* Component content */}
    </div>
  )
}
```

### API Integration
```tsx
// Custom hook pattern
export function useResource() {
  return useQuery({
    queryKey: ['resource'],
    queryFn: () => api.get('/resource'),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Mutation pattern
export function useCreateResource() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data) => api.post('/resource', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['resource'])
    },
  })
}
```

### Form Handling
```tsx
const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
})

export function FormComponent() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })
  
  const onSubmit = (data) => {
    // Handle form submission
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  )
}
```

## Environment Setup

Required environment variables:
- `VITE_API_URL` - Backend API endpoint
- `VITE_JWT_SECRET` - JWT signing secret

Optional for SMS functionality:
- `VITE_TWILIO_ACCOUNT_SID` - Twilio Account SID
- `VITE_TWILIO_AUTH_TOKEN` - Twilio Auth Token

## Testing Strategy

- **Unit Tests**: Business logic and utilities
- **Integration Tests**: API interactions and hooks
- **Component Tests**: User interactions and rendering
- **E2E Tests**: Critical user workflows

Run tests with: `npm test`

## Code Quality

### ESLint Rules
- TypeScript strict mode enabled
- React hooks rules enforced
- Unused variables warnings
- Import/export consistency

### Prettier Configuration
- Single quotes, no semicolons
- 80 character line length
- Tailwind CSS class sorting

## Security Considerations

1. **Authentication**
   - JWT tokens with short expiration
   - Secure refresh token rotation
   - Role-based route protection

2. **Data Protection**
   - Input validation with Zod schemas
   - XSS prevention with proper escaping
   - CSRF protection for API calls

3. **TCPA Compliance**
   - Automated opt-out processing
   - Consent tracking and documentation
   - Time-based sending restrictions

## Performance Optimizations

1. **Code Splitting**
   - Route-based lazy loading
   - Component-level code splitting
   - Dynamic imports for heavy features

2. **Data Fetching**
   - React Query caching and stale-while-revalidate
   - Pagination for large datasets
   - Background refetching

3. **Bundle Optimization**
   - Tree shaking enabled
   - Production build minification
   - Asset compression

## Future Enhancements (Phase 2+)

### Phase 2 - Enhanced Features
- Advanced analytics dashboard
- Campaign automation workflows  
- Drip sequence builder
- Lead scoring algorithms

### Phase 3 - Advanced Capabilities
- CRM integrations (Salesforce, HubSpot)
- Webhook system for external notifications
- Advanced reporting and exports
- Multi-tenant support

### Phase 4 - Enterprise Features
- Advanced compliance tools
- Audit trail system
- API rate limiting
- White-label customization

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Type Errors**
   ```bash
   # Run type checking
   npm run typecheck
   ```

3. **Style Issues**
   ```bash
   # Format code
   npm run format
   ```

### Performance Issues
- Check bundle analyzer: `npm run build --analyze`
- Monitor React DevTools Profiler
- Use React Query DevTools in development

## Deployment

### Production Build
```bash
npm run build
```

### Environment Setup
1. Copy `.env.example` to `.env.production`
2. Set production environment variables
3. Configure HTTPS certificates
4. Set up CDN for static assets

### Monitoring
- Error tracking with Sentry
- Performance monitoring
- User analytics
- Server health checks

## Contributing Guidelines

1. Follow existing code patterns
2. Write tests for new features
3. Update documentation
4. Use conventional commit messages
5. Ensure TypeScript compliance
6. Test on multiple screen sizes

## Support

For technical questions or issues:
1. Check existing documentation
2. Review error logs and console output
3. Test with clean environment
4. Contact development team