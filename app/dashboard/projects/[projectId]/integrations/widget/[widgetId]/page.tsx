import {db} from '@/lib/db';
import {notFound} from 'next/navigation';
import WidgetEditor from './widget-editor';

interface WidgetEditPageProps {
    params: Promise<{ projectId: string; widgetId: string }>;
}

export default async function WidgetEditPage({params}: WidgetEditPageProps) {
    const {projectId, widgetId} = await params;

    const widget = await db.widget.findUnique({
        where: {id: widgetId},
        include: {project: {select: {name: true, isPublic: true}}},
    });

    if (!widget || widget.projectId !== projectId) {
        notFound();
    }

    // ✅ rename Project → project to match WidgetEditor’s prop type
    const normalizedWidget = {
        ...widget,
        project: widget.project,
    };

    return <WidgetEditor widget={normalizedWidget} projectId={projectId}/>;
}
