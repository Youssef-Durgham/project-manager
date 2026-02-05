import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Project from '@/models/Project';

const sampleProject = {
  name: 'AUIB Ticket System',
  slug: 'auib-ticket-system',
  description: 'نظام تذاكر الدعم الفني لجامعة AUIB - يشمل تطبيق موبايل ولوحة تحكم ويب وباكند',
  techStack: ['Next.js', 'React Native', 'Node.js', 'MongoDB', 'Tailwind CSS'],
  type: 'fullstack',
  status: 'active',
  components: [
    {
      id: 'comp-dashboard',
      name: 'لوحة التحكم',
      icon: '📊',
      type: 'dashboard',
      phases: [
        {
          id: 'phase-dash-1',
          name: 'Dashboard Layout & Stats',
          description: 'تصميم لوحة التحكم الرئيسية مع الإحصائيات',
          order: 1,
          tasks: [
            { id: 'task-1', title: 'تصميم الهيكل الأساسي', description: 'Layout + sidebar + header', status: 'done', priority: 'high', tags: ['UI'] },
            { id: 'task-2', title: 'إحصائيات Dashboard', description: 'Charts + counters + recent tickets', status: 'done', priority: 'high', tags: ['UI', 'API'] },
            { id: 'task-3', title: 'SLA Dashboard', description: 'مراقبة SLA وأوقات الاستجابة', status: 'done', priority: 'medium', tags: ['feature'] },
          ],
        },
        {
          id: 'phase-dash-2',
          name: 'Reports & Export',
          description: 'تقارير وتصدير البيانات',
          order: 2,
          tasks: [
            { id: 'task-4', title: 'تقارير Excel/PDF', description: 'تصدير التقارير بصيغ مختلفة', status: 'done', priority: 'medium', tags: ['feature'] },
            { id: 'task-5', title: 'Audit Logs', description: 'سجل التغييرات والعمليات', status: 'done', priority: 'low', tags: ['security'] },
          ],
        },
      ],
    },
    {
      id: 'comp-web',
      name: 'الموقع',
      icon: '🌐',
      type: 'web',
      phases: [
        {
          id: 'phase-web-1',
          name: 'واجهة المستخدم',
          description: 'صفحات الويب الأساسية',
          order: 1,
          tasks: [
            { id: 'task-6', title: 'صفحة تقديم التذاكر', description: 'نموذج تقديم تذكرة جديدة', status: 'done', priority: 'high', tags: ['UI'] },
            { id: 'task-7', title: 'صفحة متابعة التذاكر', description: 'عرض حالة التذاكر المقدمة', status: 'done', priority: 'high', tags: ['UI'] },
            { id: 'task-8', title: 'Multi-language (AR/EN)', description: 'دعم العربي والإنجليزي', status: 'done', priority: 'medium', tags: ['i18n'] },
          ],
        },
      ],
    },
    {
      id: 'comp-backend',
      name: 'Backend API',
      icon: '⚙️',
      type: 'backend',
      phases: [
        {
          id: 'phase-back-1',
          name: 'Core API',
          description: 'الـ API الأساسية',
          order: 1,
          tasks: [
            { id: 'task-9', title: 'Auth System', description: 'JWT + admin registration', status: 'done', priority: 'high', tags: ['security'] },
            { id: 'task-10', title: 'Smart Auto-Assignment', description: 'توزيع تلقائي ذكي للتذاكر', status: 'done', priority: 'high', tags: ['feature'] },
            { id: 'task-11', title: 'Email Notifications', description: 'إشعارات بريد إلكتروني', status: 'done', priority: 'medium', tags: ['feature'] },
          ],
        },
      ],
    },
  ],
};

export async function GET() {
  return POST();
}

export async function POST() {
  try {
    await connectDB();
    
    // Check if already seeded
    const existing = await Project.findOne({ slug: 'auib-ticket-system' });
    if (existing) {
      return NextResponse.json({ success: true, message: 'Already seeded', data: existing });
    }
    
    const project = await Project.create(sampleProject);
    return NextResponse.json({ success: true, message: 'Seeded successfully', data: project });
  } catch (error) {
    console.error('Error seeding:', error);
    return NextResponse.json({ success: false, error: 'Failed to seed' }, { status: 500 });
  }
}
