# PFE-SCAN Landing Page

A high-converting, monochrome landing page for the PFE Assistant SaaS.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Components**: Custom UI components inspired by Shadcn UI
- **Animations**: Framer Motion
- **Icons**: Lucide React

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure
- `app/`: Next.js App Router structure.
  - `page.tsx`: Main landing page assembly.
  - `globals.css`: Global styles (variables, dot grid).
  - `layout.tsx`: Root layout with Inter font.
- `components/`:
  - `landing/`: Landing page specific sections (Hero, Features, MapSection, Navbar).
  - `ui/`: Reusable UI components (Button).
- `lib/`: Utilities (cn helper).
