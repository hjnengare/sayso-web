# Email Templates Setup Guide

This directory contains email templates for Supabase authentication emails. These templates need to be configured in your Supabase dashboard.

## Templates

1. **confirm-signup.html** - Email verification for new user signups
2. **confirm-email-change.html** - Email change confirmation
3. **reset-password.html** - Password reset confirmation

## How to Configure in Supabase

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **Authentication** → **Email Templates**
4. For each template:

### Signup Confirmation Email
- Template: **Confirm signup**
- Copy the contents of `confirm-signup.html`
- Paste into the template editor
- Available variables:
  - `{{ .ConfirmationURL }}` - The confirmation link

### Email Change Confirmation
- Template: **Change email address**
- Copy the contents of `confirm-email-change.html`
- Paste into the template editor
- Available variables:
  - `{{ .Email }}` - Current email address
  - `{{ .NewEmail }}` - New email address
  - `{{ .ConfirmationURL }}` - The confirmation link

### Password Reset
- Template: **Reset password**
- Copy the contents of `reset-password.html`
- Paste into the template editor
- Available variables:
  - `{{ .ConfirmationURL }}` - The password reset link

## Important Notes

- The templates use inline styles for email client compatibility
- All templates use the sayso brand colors:
  - Background: `#E5E0E5` (off-white)
  - Card: `#9DAB9B` (sage green)
  - Button: `#722F37` (burgundy)
- The redirect URL in the code points to `/auth/callback?type=email_change` which is handled by `src/app/auth/callback/route.ts`

## Testing

After configuring the templates in Supabase:
1. Test signup confirmation by creating a new account
2. Test email change by using `AuthService.changeEmail()` method
3. Verify that users are redirected correctly after clicking confirmation links

