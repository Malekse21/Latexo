# Assets Configuration

## Logo
1. Place your logo file in: `public/images/`
2. Name it: `logo.svg` (or update `components/landing/Navbar.tsx` if you use a different format like png).

## Fonts
1. Place your font file (e.g., `MyFont.woff2`) in: `public/fonts/`
2. To use it, update `app/layout.tsx`:
   ```tsx
   import localFont from 'next/font/local'

   const myFont = localFont({
     src: '../public/fonts/MyFont.woff2',
     display: 'swap',
   })

   // In HTML
   <body className={myFont.className}>
   ```
