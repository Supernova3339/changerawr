import {db} from '@/lib/db';
import WidgetList from './widget-list';

interface WidgetPageProps {
    params: Promise<{ projectId: string }>;
}

export default async function WidgetPage({params}: WidgetPageProps) {
    const {projectId} = await params;

    // Fetch widgets and project
    const [widgets, project] = await Promise.all([
        db.widget.findMany({
            where: {projectId},
            orderBy: {createdAt: 'desc'}
        }),
        db.project.findUnique({
            where: {id: projectId},
            select: {id: true, name: true, isPublic: true}
        })
    ]);

    if (!project) {
        return <div>Project not found</div>;
    }

    return <WidgetList projectId={projectId} initialWidgets={widgets} project={project}/>;
}
