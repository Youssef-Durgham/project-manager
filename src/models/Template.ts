// Project templates — predefined structures for common project types
// These are static data, not stored in DB

export interface TemplateTask {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  estimatedHours: number;
  assignee: 'yusif' | 'employee-1' | '';
}

export interface TemplatePhase {
  name: string;
  description: string;
  tasks: TemplateTask[];
}

export interface TemplateComponent {
  name: string;
  type: 'dashboard' | 'mobile' | 'web' | 'backend' | 'other';
  icon: string;
  phases: TemplatePhase[];
}

export interface ProjectTemplate {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  icon: string;
  techStack: string[];
  type: 'mobile' | 'web' | 'backend' | 'fullstack';
  components: TemplateComponent[];
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'nextjs-fullstack',
    name: 'Next.js Full-Stack',
    nameAr: 'Next.js فل ستاك',
    description: 'Next.js + MongoDB + Tailwind CSS + API Routes',
    icon: '⚡',
    techStack: ['Next.js', 'MongoDB', 'Tailwind CSS', 'TypeScript'],
    type: 'fullstack',
    components: [
      {
        name: 'Web Dashboard',
        type: 'dashboard',
        icon: '📊',
        phases: [
          {
            name: 'Setup & Foundation',
            description: 'Project setup, DB connection, auth',
            tasks: [
              { title: 'Initialize Next.js project', description: 'npx create-next-app with TypeScript + Tailwind', priority: 'high', estimatedHours: 1, assignee: 'employee-1' },
              { title: 'MongoDB connection setup', description: 'Mongoose connection + models', priority: 'high', estimatedHours: 2, assignee: 'employee-1' },
              { title: 'Authentication system', description: 'Login/register + session management', priority: 'high', estimatedHours: 6, assignee: 'employee-1' },
              { title: 'Base layout & navigation', description: 'Sidebar, header, responsive layout', priority: 'high', estimatedHours: 4, assignee: 'employee-1' },
              { title: 'Design system setup', description: 'Colors, fonts, component library', priority: 'medium', estimatedHours: 3, assignee: 'employee-1' },
            ],
          },
          {
            name: 'Core Features',
            description: 'Main CRUD operations and business logic',
            tasks: [
              { title: 'CRUD API routes', description: 'Create, Read, Update, Delete endpoints', priority: 'high', estimatedHours: 8, assignee: 'employee-1' },
              { title: 'Dashboard page', description: 'Stats, charts, overview', priority: 'high', estimatedHours: 6, assignee: 'employee-1' },
              { title: 'List/Table views', description: 'Data tables with sorting, filtering, pagination', priority: 'medium', estimatedHours: 6, assignee: 'employee-1' },
              { title: 'Form pages', description: 'Create/edit forms with validation', priority: 'medium', estimatedHours: 5, assignee: 'employee-1' },
            ],
          },
          {
            name: 'Polish & Deploy',
            description: 'Testing, optimization, deployment',
            tasks: [
              { title: 'Responsive design pass', description: 'Mobile + tablet testing', priority: 'medium', estimatedHours: 4, assignee: 'employee-1' },
              { title: 'Error handling & loading states', description: 'Skeleton loaders, error boundaries', priority: 'medium', estimatedHours: 3, assignee: 'employee-1' },
              { title: 'Deploy to production', description: 'Vercel/AWS deployment + environment setup', priority: 'high', estimatedHours: 3, assignee: 'employee-1' },
              { title: 'Documentation', description: 'README, API docs, setup guide', priority: 'low', estimatedHours: 2, assignee: 'employee-1' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'react-native-app',
    name: 'React Native Mobile App',
    nameAr: 'تطبيق React Native',
    description: 'React Native + Expo + Node.js Backend',
    icon: '📱',
    techStack: ['React Native', 'Expo', 'Node.js', 'MongoDB'],
    type: 'mobile',
    components: [
      {
        name: 'Mobile App',
        type: 'mobile',
        icon: '📱',
        phases: [
          {
            name: 'Setup & Navigation',
            description: 'Expo init, navigation, base screens',
            tasks: [
              { title: 'Initialize Expo project', description: 'Expo SDK setup with TypeScript', priority: 'high', estimatedHours: 1, assignee: 'employee-1' },
              { title: 'Navigation structure', description: 'Tab navigator, stack navigator, auth flow', priority: 'high', estimatedHours: 4, assignee: 'employee-1' },
              { title: 'Auth screens', description: 'Login, register, forgot password', priority: 'high', estimatedHours: 6, assignee: 'employee-1' },
              { title: 'Design tokens', description: 'Colors, spacing, typography constants', priority: 'medium', estimatedHours: 2, assignee: 'employee-1' },
            ],
          },
          {
            name: 'Core Screens',
            description: 'Main app functionality',
            tasks: [
              { title: 'Home screen', description: 'Main dashboard/feed', priority: 'high', estimatedHours: 6, assignee: 'employee-1' },
              { title: 'Detail screens', description: 'Item detail views', priority: 'high', estimatedHours: 5, assignee: 'employee-1' },
              { title: 'Create/Edit forms', description: 'Input forms with validation', priority: 'medium', estimatedHours: 5, assignee: 'employee-1' },
              { title: 'Profile/Settings', description: 'User profile and app settings', priority: 'medium', estimatedHours: 4, assignee: 'employee-1' },
              { title: 'Push notifications', description: 'Expo notifications setup', priority: 'medium', estimatedHours: 4, assignee: 'employee-1' },
            ],
          },
          {
            name: 'Polish & Release',
            description: 'Testing, store submission',
            tasks: [
              { title: 'Offline support', description: 'AsyncStorage caching', priority: 'medium', estimatedHours: 4, assignee: 'employee-1' },
              { title: 'App icon & splash screen', description: 'Branding assets', priority: 'medium', estimatedHours: 2, assignee: 'yusif' },
              { title: 'Build & submit to stores', description: 'EAS Build + App Store + Play Store', priority: 'high', estimatedHours: 4, assignee: 'employee-1' },
            ],
          },
        ],
      },
      {
        name: 'API Backend',
        type: 'backend',
        icon: '⚙️',
        phases: [
          {
            name: 'API Setup',
            description: 'Server, database, auth',
            tasks: [
              { title: 'Express/Fastify server setup', description: 'Node.js server with TypeScript', priority: 'high', estimatedHours: 2, assignee: 'employee-1' },
              { title: 'Database models', description: 'Mongoose schemas and models', priority: 'high', estimatedHours: 4, assignee: 'employee-1' },
              { title: 'JWT Authentication', description: 'Register, login, refresh tokens', priority: 'high', estimatedHours: 5, assignee: 'employee-1' },
              { title: 'CRUD endpoints', description: 'REST API for all resources', priority: 'high', estimatedHours: 8, assignee: 'employee-1' },
              { title: 'File upload (S3)', description: 'Image/file upload to AWS S3', priority: 'medium', estimatedHours: 3, assignee: 'employee-1' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'serverless-api',
    name: 'Serverless AWS API',
    nameAr: 'AWS Serverless API',
    description: 'Lambda + API Gateway + DynamoDB',
    icon: '☁️',
    techStack: ['AWS Lambda', 'API Gateway', 'DynamoDB', 'Node.js'],
    type: 'backend',
    components: [
      {
        name: 'Serverless Backend',
        type: 'backend',
        icon: '☁️',
        phases: [
          {
            name: 'Infrastructure',
            description: 'AWS setup, IAM, VPC',
            tasks: [
              { title: 'SAM/CDK project init', description: 'Infrastructure as Code setup', priority: 'high', estimatedHours: 3, assignee: 'employee-1' },
              { title: 'DynamoDB table design', description: 'Single-table design, GSIs', priority: 'high', estimatedHours: 4, assignee: 'employee-1' },
              { title: 'IAM roles & policies', description: 'Least-privilege access', priority: 'high', estimatedHours: 2, assignee: 'employee-1' },
              { title: 'API Gateway setup', description: 'Routes, CORS, auth', priority: 'high', estimatedHours: 3, assignee: 'employee-1' },
            ],
          },
          {
            name: 'Lambda Functions',
            description: 'Business logic',
            tasks: [
              { title: 'CRUD handlers', description: 'Create, Read, Update, Delete lambdas', priority: 'high', estimatedHours: 8, assignee: 'employee-1' },
              { title: 'Authentication lambda', description: 'Cognito or custom JWT', priority: 'high', estimatedHours: 5, assignee: 'employee-1' },
              { title: 'Event handlers', description: 'EventBridge/SQS consumers', priority: 'medium', estimatedHours: 4, assignee: 'employee-1' },
              { title: 'Deploy pipeline', description: 'CI/CD with GitHub Actions', priority: 'medium', estimatedHours: 3, assignee: 'employee-1' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'landing-page',
    name: 'Landing Page / Website',
    nameAr: 'صفحة هبوط / موقع',
    description: 'Next.js static site with CMS',
    icon: '🌐',
    techStack: ['Next.js', 'Tailwind CSS', 'TypeScript'],
    type: 'web',
    components: [
      {
        name: 'Website',
        type: 'web',
        icon: '🌐',
        phases: [
          {
            name: 'Design & Build',
            description: 'All pages and sections',
            tasks: [
              { title: 'Hero section', description: 'Main banner with CTA', priority: 'high', estimatedHours: 3, assignee: 'employee-1' },
              { title: 'Features section', description: 'Product features grid', priority: 'high', estimatedHours: 3, assignee: 'employee-1' },
              { title: 'Pricing section', description: 'Pricing cards', priority: 'medium', estimatedHours: 2, assignee: 'employee-1' },
              { title: 'Contact/Footer', description: 'Contact form + footer links', priority: 'medium', estimatedHours: 2, assignee: 'employee-1' },
              { title: 'Mobile responsive', description: 'Full responsive pass', priority: 'high', estimatedHours: 3, assignee: 'employee-1' },
              { title: 'SEO & Meta tags', description: 'OpenGraph, structured data', priority: 'medium', estimatedHours: 2, assignee: 'employee-1' },
              { title: 'Deploy', description: 'Vercel deployment + custom domain', priority: 'high', estimatedHours: 1, assignee: 'employee-1' },
            ],
          },
        ],
      },
    ],
  },
];
