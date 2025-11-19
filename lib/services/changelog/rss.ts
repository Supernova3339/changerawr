import { ChangelogEntry } from '@prisma/client'

interface RSSFeedOptions {
    title: string
    description: string
    link: string
    language?: string
    copyright?: string
    ttl?: number
}

export function generateRSSFeed(entries: ChangelogEntry[], options: RSSFeedOptions): string {
    const {
        title,
        description,
        link,
        language = 'en-US',
        copyright = `Copyright ${new Date().getFullYear()}`,
        ttl = 60
    } = options

    const items = entries
        .map(entry => {
            const pubDate = entry.publishedAt
                ? new Date(entry.publishedAt).toUTCString()
                : new Date(entry.createdAt).toUTCString()

            return `
        <item>
          <title><![CDATA[${entry.title}]]></title>
          <description><![CDATA[${entry.content}]]></description>
          <link>${link}/${entry.id}</link>
          <guid isPermaLink="false">${entry.id}</guid>
          <pubDate>${pubDate}</pubDate>
          ${entry.version ? `<version>${entry.version}</version>` : ''}
        </item>
      `.trim()
        })
        .join('\n')

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title><![CDATA[${title}]]></title>
    <description><![CDATA[${description}]]></description>
    <link>${link}</link>
    <language>${language}</language>
    <ttl>${ttl}</ttl>
    <copyright>${copyright}</copyright>
    <atom:link href="${link}/rss.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`.trim()
}