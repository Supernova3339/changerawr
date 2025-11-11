import {notFound} from 'next/navigation';
import {Metadata} from 'next';
import {db} from '@/lib/db';
import {EntryContent} from './EntryContent';

interface ChangelogEntry {
    id: string;
    title: string;
    content: string;
    excerpt?: string;
    version?: string;
    publishedAt: string;
    createdAt: string;
    updatedAt: string;
    tags: Array<{
        id: string;
        name: string;
        color: string | null;
    }>;
}

interface EntryResponse {
    project: {
        id: string;
        name: string;
        description?: string;
    };
    entry: ChangelogEntry;
}

type EntryPageProps = {
    params: Promise<{ domain: string; entryId: string }>;
};

async function getProjectFromDomain(domain: string) {
    // First find the custom domain
    const customDomain = await db.customDomain.findUnique({
        where: {
            domain: domain,
            verified: true,
        },
        select: {
            projectId: true,
        },
    });

    if (!customDomain) {
        return null;
    }

    // Then get the project with changelog
    const project = await db.project.findUnique({
        where: {
            id: customDomain.projectId,
            isPublic: true,
        },
        select: {
            id: true,
            name: true,
            changelog: {
                select: {
                    id: true,
                },
            },
        },
    });

    return project;
}

async function getEntry(changelogId: string, entryId: string): Promise<ChangelogEntry | null> {
    const entry = await db.changelogEntry.findFirst({
        where: {
            id: entryId,
            changelogId: changelogId,
            publishedAt: {not: null},
        },
        select: {
            id: true,
            title: true,
            content: true,
            excerpt: true,
            version: true,
            publishedAt: true,
            createdAt: true,
            updatedAt: true,
            tags: {
                select: {
                    id: true,
                    name: true,
                    color: true,
                },
            },
        },
    });

    if (!entry) return null;

    return {
        id: entry.id,
        title: entry.title,
        content: entry.content,
        excerpt: entry.excerpt ?? undefined,
        version: entry.version ?? undefined,
        publishedAt: entry.publishedAt!.toISOString(),
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
        tags: entry.tags,
    };
}

export async function generateMetadata({params}: EntryPageProps): Promise<Metadata> {
    const {domain, entryId} = await params;
    const project = await getProjectFromDomain(domain);

    if (!project?.changelog) {
        return {
            title: 'Entry Not Found',
        };
    }

    const entry = await getEntry(project.changelog.id, entryId);

    if (!entry) {
        return {
            title: 'Entry Not Found',
        };
    }

    return {
        title: `${entry.title} - ${project.name}`,
        description: entry.excerpt || entry.content.substring(0, 160),
        openGraph: {
            title: entry.title,
            description: entry.excerpt || entry.content.substring(0, 160),
            type: 'article',
            publishedTime: entry.publishedAt,
            modifiedTime: entry.updatedAt,
        },
    };
}

export default async function CustomDomainEntryPage({params}: EntryPageProps) {
    const {domain, entryId} = await params;
    const project = await getProjectFromDomain(domain);

    if (!project?.changelog) {
        notFound();
    }

    const entry = await getEntry(project.changelog.id, entryId);

    if (!entry) {
        notFound();
    }

    return (
        <EntryContent
            domain={domain}
            projectId={project.id}
            projectName={project.name}
            entry={entry}
        />
    );
}
