# Kickstarter Dashboard - Production Ready

A modern, production-ready Kickstarter project dashboard built with React, TypeScript, and Tailwind CSS. Features advanced filtering, interactive charts with tooltips, and a responsive design.

## Features

### Core Functionality
- **Advanced Filtering**: Filter projects by name, creator, and goal amount range
- **Interactive Charts**: Beautiful bar charts with custom tooltips showing project metrics
- **Data Visualization**: Visual progress bars and status indicators
- **Responsive Design**: Fully responsive layout that works on all devices
- **Real-time Statistics**: Live stats showing total pledged, backers, and success rates

### Technical Highlights
- **React 19** with TypeScript for type safety
- **useMemo** hook for optimized filtering performance
- **Recharts** for interactive, accessible charts
- **Tailwind CSS** for modern, responsive styling
- **Vite** for lightning-fast development and builds

## Project Structure

```
kickstarter-dashboard/
├── src/
│   ├── components/
│   │   ├── KickstarterFilters.tsx    # Filter input component
│   │   ├── KickstarterChart.tsx      # Interactive chart with tooltips
│   │   └── KickstarterTable.tsx      # Data table component
│   ├── data/
│   │   └── mockData.ts               # Sample Kickstarter project data
│   ├── types/
│   │   └── index.ts                  # TypeScript type definitions
│   ├── App.tsx                       # Main app with filtering logic
│   ├── main.tsx                      # Application entry point
│   └── index.css                     # Global styles with Tailwind
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

1. Navigate to the project directory:
```bash
cd kickstarter-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:3000`

### Build for Production

```bash
npm run build
```

The production-ready files will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Usage

### Filtering Projects
1. **Name Filter**: Search for projects by name or creator
2. **Min Goal**: Set minimum goal amount in dollars
3. **Max Goal**: Set maximum goal amount in dollars
4. **Clear Filters**: Reset all filters to default state

### Chart Interactions
- Hover over bars to see detailed tooltips
- Tooltips show:
  - Project name
  - Goal amount
  - Pledged amount
  - Number of backers
  - Funding progress percentage

### Table Features
- View all project details in a sortable table
- Visual progress bars showing funding status
- Color-coded status badges (active, successful, failed)
- Responsive layout adapts to screen size

## Component Overview

### App.tsx
Main application component managing:
- Filter state using React hooks
- Efficient filtering with useMemo
- Statistics calculation
- Layout and composition

### KickstarterFilters.tsx
Reusable filter component featuring:
- Controlled input fields
- Clear filters functionality
- Responsive grid layout
- Accessible form elements

### KickstarterChart.tsx
Interactive chart component with:
- Custom tooltip component
- Responsive bar chart
- Data transformation for visualization
- Legend and axis labels

### KickstarterTable.tsx
Data table component providing:
- Sortable columns
- Progress visualization
- Status indicators
- Empty state handling

## Performance Optimizations

1. **useMemo Hook**: Filters are memoized to prevent unnecessary recalculations
2. **Efficient Re-renders**: Components only update when their props change
3. **Lazy Loading**: Chart data is limited to improve rendering performance
4. **Code Splitting**: Vite automatically splits code for optimal loading

## Deployment

### Deployment Options

1. **Vercel** (Recommended):
```bash
npm install -g vercel
vercel
```

2. **Netlify**:
```bash
npm run build
# Deploy dist/ folder via Netlify dashboard
```

3. **Docker**:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Technology Stack

- **React 19**: Modern UI library
- **TypeScript 5**: Type safety and developer experience
- **Vite 7**: Next-generation frontend tooling
- **Tailwind CSS 4**: Utility-first CSS framework
- **Recharts 3**: Composable charting library
- **PostCSS**: CSS transformations

## Contributing

This is a production-ready template. Feel free to customize:
- Add more filter options
- Integrate with real API data
- Add authentication
- Implement server-side rendering
- Add more chart types

## License

ISC

## Author

Built as a production-ready example of a modern React dashboard.

---

**Built with ❤️ using React, TypeScript, and Tailwind CSS**
