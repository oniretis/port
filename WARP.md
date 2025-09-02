# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

WuWei Studio is a creative portfolio website built with Next.js 15, featuring advanced animations with GSAP, smooth scrolling with Lenis, and WebGL particle effects. The project uses the App Router architecture and implements custom view transitions for page navigation.

## Development Commands

```bash
# Development server
npm run dev
# or
pnpm dev

# Production build
npm run build
pnpm build

# Production server
npm start
pnpm start

# Linting
npm run lint
pnpm lint
```

## Architecture & Key Technologies

### Core Stack
- **Next.js 15** with App Router
- **React 19** with client components for animations
- **GSAP** for complex animations and scroll triggers
- **Lenis** for smooth scrolling
- **WebGL/Canvas** for particle system background effects

### Animation System
The project heavily relies on GSAP for animations:
- `useGSAP` hook for React integration
- Custom easing curves (`CustomEase.create("hop", "0.9, 0, 0.1, 1")`)
- ScrollTrigger for scroll-based animations
- Timeline-based orchestration of complex animation sequences

### Component Architecture
Components follow a consistent pattern:
- Each component has its own CSS file co-located
- Animation logic is encapsulated within components using `useGSAP`
- Client-side components for interactive features
- Shared layout through `ClientLayout` wrapper

### Navigation & Transitions
- Custom view transitions using `next-view-transitions`
- Route-based navigation with animated overlays
- Menu system with slide animations and state management

## Project Structure

```
src/
├── app/                    # App Router pages
│   ├── layout.js          # Root layout with ViewTransitions
│   ├── page.js            # Home page with preloader
│   ├── globals.css        # Global styles and CSS variables
│   ├── work/              # Portfolio gallery
│   ├── studio/            # About page
│   ├── contact/           # Contact form
│   └── archive/           # Archive page
├── client-layout.js       # Client-side layout with Lenis
└── components/
    ├── Menu/              # Navigation with overlay
    ├── DynamicBackground/ # WebGL particle system
    ├── Copy/              # Text animation wrapper
    ├── BtnLink/           # Animated button component
    └── ...
```

## Development Patterns

### Animation Timing
- Preloader animations run for ~6.2 seconds on initial load
- Subsequent page loads use shorter delays (~0.9 seconds)
- Global animation state managed through `isInitialLoad` flag

### Component Communication
- Menu state changes propagated through callback props
- Route transitions handled through custom transition router
- Scroll behavior managed globally through Lenis provider

### Asset Management
- Portfolio data centralized in `src/app/work/portfolio.js`
- Images organized by type in `/public/images/`
- Custom fonts loaded via CSS with fallbacks

### Performance Considerations
- WebGL particle system disabled on mobile devices (`window.innerWidth < 1000`)
- High DPI support with device pixel ratio scaling
- Cleanup patterns for animation frames and WebGL contexts
- Smooth scrolling configurations differentiated for mobile/desktop

## Key Configuration

### CSS Custom Properties
```css
--background: #1a1a1a
--foreground: #e4e7df
--btn-icon: #ffc22a
```

### Typography System
- Primary: "nm" (custom font)
- Mono: "DM Mono" (Google Fonts)
- Responsive font sizes using `clamp()`

### Path Aliases
- `@/*` maps to `./src/*` (configured in jsconfig.json)

## Common Gotchas

- WebGL context requires cleanup on component unmount to prevent memory leaks
- GSAP animations need explicit cleanup in useEffect return functions
- View transitions require specific CSS for proper animation handling
- Mobile detection affects both scroll behavior and WebGL initialization
- Initial load state must be managed globally to prevent animation conflicts

