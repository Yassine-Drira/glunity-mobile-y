---
name: glunity-design-system-integration
description: Preserves Glunity's premium visual design identity, color tokens, typography, and UI aesthetics while integrating code, logic flows, and backend logic from Glutenia.
---

# Glunity Design System & Feature Integration Skill

This skill enforces strict visual design preservation and architectural standards when migrating or porting feature logic, APIs, or screens from external codebases (such as Glutenia) into **Glunity Mobile**.

---

## 1. Core Rule: Logic Integration Without Visual Pollution

When integrating features from Glutenia (such as the Groq AI Label Scanner, E-Commerce Cart, Onboarding Survey, or Favorite Spots):
- **EXTRACT**: Business logic, state hooks, Mongoose schemas, controllers, and API endpoints.
- **DISCARD**: External styling, basic color constants, and raw JSX layouts.
- **APPLY**: Glunity's premium design tokens, `useTheme()`, `useLanguage()`, `AppScaffold`, and animated UI components.

---

## 2. Visual Token & UI Architecture Rules

Always use Glunity's central theme context and design system primitives:

```tsx
import { useTheme } from '@/shared/context/theme.context';
import { useLanguage } from '@/shared/context/language.context';
import { AppScaffold } from '@/shared/components/AppScaffold';

export function IntegratedScreen() {
  const { theme, colors, isDark } = useTheme();
  const { t, isRTL } = useLanguage();

  return (
    <AppScaffold title={t('screen.title')}>
      {/* Screen Content styled strictly with theme tokens */}
    </AppScaffold>
  );
}
```

### Color & Styling Standards
- **Theme Tokens**: All colors must use `colors` or `theme` from `useTheme()`. Hardcoded hex codes (`#ffffff`, `#000000`) are strictly forbidden.
- **Dark Mode**: Every component must adapt automatically to Light and Dark mode.
- **Card Styling**: Soft, modern cards with `borderRadius: 16` (`Radius.lg`) and subtle shadow elevation.
- **RTL Support**: Apply `isRTL` direction checks for Arabic text alignment.

---

## 3. Migration Execution Checklist

1. **Strict TypeScript Conversion**: Convert all `.js`/`.jsx` files to `.tsx`/`.ts` with explicit interfaces for props, state, and API models.
2. **Component Scaffolding**: Wrap top-level screen components with `<AppScaffold>`.
3. **Image Compression**: Use `expo-image-manipulator` to resize images (max 1024px) before sending to AI endpoints.
4. **State Isolation**: Scope context providers (e.g., `CartContext`) strictly to relevant feature sub-trees.
5. **Typecheck Verification**: Confirm 0 errors with `npm --workspace mobile run typecheck`.
