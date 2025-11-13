/**
 * Floating Changelog Widget
 * A floating button with badge count that expands to show changelog entries
 */

class ChangelogFloatingWidget {
    constructor(container, options) {
        this.container = container;
        this.options = {
            theme: 'light',
            position: 'bottom-right',
            maxEntries: 5,
            customCSS: null,
            buttonText: "What's New",
            showBadge: true,
            ...options
        };

        this.isOpen = false;
        this.isLoading = false;
        this.unreadCount = 0;
        this.entries = [];
        this.project = null;
        this.baseUrl = options.baseUrl || process.env.NEXT_PUBLIC_APP_URL || '';

        this.init();
    }

    async loadStyles() {
        // Load core CSS files
        const cssFiles = [
            '/widgets/core/styles/variables.css',
            '/widgets/core/styles/reset.css',
            '/widgets/core/styles/common.css',
            '/widgets/core/styles/floating.css'
        ];

        for (const file of cssFiles) {
            const href = this.baseUrl + file;
            if (!document.querySelector(`link[href="${href}"]`)) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = href;
                document.head.appendChild(link);
            }
        }

        // Inject custom CSS if provided
        if (this.options.customCSS) {
            const styleId = `changerawr-custom-css-${this.options.projectId || 'default'}`;
            let customStyle = document.getElementById(styleId);

            if (!customStyle) {
                customStyle = document.createElement('style');
                customStyle.id = styleId;
                document.head.appendChild(customStyle);
            }

            customStyle.textContent = this.options.customCSS;
        }
    }

    async init() {
        await this.loadStyles();

        // Setup container
        this.container.classList.add('changerawr-widget', 'changerawr-floating');

        if (this.options.theme === 'dark') {
            this.container.classList.add('changerawr-theme-dark');
        }

        this.container.classList.add(`changerawr-position-${this.options.position}`);
        this.container.setAttribute('role', 'region');
        this.container.setAttribute('aria-label', 'Changelog updates');

        this.render();
        await this.loadEntries();
        this.attachEventListeners();
    }

    render() {
        // Clear container
        this.container.innerHTML = '';

        // Create button wrapper with relative positioning
        const buttonWrapper = document.createElement('div');
        buttonWrapper.className = 'changerawr-floating-wrapper';
        buttonWrapper.style.position = 'relative';
        buttonWrapper.style.display = 'inline-block';

        // Create floating button
        const button = document.createElement('button');
        button.className = 'changerawr-floating-button';
        button.type = 'button';
        button.setAttribute('aria-label', 'Open changelog');
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-haspopup', 'dialog');

        // Button content
        const buttonContent = document.createElement('div');
        buttonContent.className = 'changerawr-floating-button-content';
        buttonContent.style.display = 'flex';
        buttonContent.style.alignItems = 'center';
        buttonContent.style.gap = '8px';

        const icon = document.createElement('span');
        icon.className = 'changerawr-floating-icon';
        icon.innerHTML = '📰';
        icon.style.fontSize = '1.2em';
        icon.style.flexShrink = '0';

        const text = document.createElement('span');
        text.className = 'changerawr-floating-text';
        text.textContent = this.options.buttonText;
        text.style.whiteSpace = 'nowrap';

        buttonContent.appendChild(icon);
        buttonContent.appendChild(text);
        button.appendChild(buttonContent);

        // Badge
        if (this.options.showBadge) {
            const badge = document.createElement('span');
            badge.className = 'changerawr-floating-badge';
            badge.setAttribute('aria-hidden', 'true');
            badge.textContent = '0';
            badge.style.display = 'none';
            button.appendChild(badge);
        }

        // Create panel
        const panel = document.createElement('div');
        panel.className = 'changerawr-floating-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', 'Changelog entries');
        panel.setAttribute('aria-hidden', 'true');
        panel.style.display = 'none';

        // Panel header
        const header = document.createElement('div');
        header.className = 'changerawr-floating-panel-header';
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.padding = '16px';
        header.style.borderBottom = '1px solid var(--changerawr-border-color, #eaeaea)';

        const title = document.createElement('h2');
        title.className = 'changerawr-floating-panel-title';
        title.textContent = this.project?.name || 'Changelog';
        title.style.margin = '0';
        title.style.fontSize = '16px';
        title.style.fontWeight = '600';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'changerawr-floating-close-btn';
        closeBtn.type = 'button';
        closeBtn.innerHTML = '✕';
        closeBtn.setAttribute('aria-label', 'Close changelog');
        closeBtn.style.background = 'none';
        closeBtn.style.border = 'none';
        closeBtn.style.padding = '4px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.fontSize = '20px';
        closeBtn.style.color = 'var(--changerawr-text-secondary, #666666)';
        closeBtn.style.display = 'flex';
        closeBtn.style.alignItems = 'center';
        closeBtn.style.justifyContent = 'center';

        header.appendChild(title);
        header.appendChild(closeBtn);

        // Panel content area
        const content = document.createElement('div');
        content.className = 'changerawr-floating-panel-content';
        content.style.flex = '1';
        content.style.overflowY = 'auto';
        content.style.padding = '0';

        // Panel footer
        const footer = document.createElement('div');
        footer.className = 'changerawr-floating-panel-footer';
        footer.style.padding = '12px 16px';
        footer.style.borderTop = '1px solid var(--changerawr-border-color, #eaeaea)';
        footer.style.fontSize = '12px';
        footer.style.color = 'var(--changerawr-text-secondary, #666666)';
        footer.style.display = 'flex';
        footer.style.justifyContent = 'space-between';
        footer.style.alignItems = 'center';
        footer.style.gap = '12px';

        const poweredBy = document.createElement('span');
        poweredBy.innerHTML = 'Powered by <a href="https://github.com/supernova3339/changerawr" target="_blank" rel="noopener" style="color: inherit; text-decoration: none;">Changerawr</a>';

        const rssLink = document.createElement('a');
        rssLink.href = `${this.baseUrl}/changelog/${this.options.projectId}/rss.xml`;
        rssLink.textContent = 'RSS';
        rssLink.target = '_blank';
        rssLink.rel = 'noopener';
        rssLink.style.color = 'inherit';
        rssLink.style.textDecoration = 'none';

        footer.appendChild(poweredBy);
        footer.appendChild(rssLink);

        // Assemble panel
        panel.appendChild(header);
        panel.appendChild(content);
        panel.appendChild(footer);

        // Assemble button wrapper
        buttonWrapper.appendChild(button);
        buttonWrapper.appendChild(panel);

        // Add to container
        this.container.appendChild(buttonWrapper);

        // Store references
        this.button = button;
        this.panel = panel;
        this.panelContent = content;
        this.badge = button.querySelector('.changerawr-floating-badge');
        this.closeBtn = closeBtn;
    }

    attachEventListeners() {
        this.button.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggle();
        });

        this.closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.close();
        });

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.button.contains(e.target) && !this.panel.contains(e.target)) {
                this.close();
            }
        });
    }

    async loadEntries() {
        this.isLoading = true;

        try {
            const response = await fetch(
                `${this.baseUrl}/api/changelog/${this.options.projectId}/entries`
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            this.entries = data.items || [];
            this.project = data.project;

            // Calculate unread count (entries from last 7 days)
            const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
            this.unreadCount = this.entries.filter(entry => {
                const entryDate = new Date(entry.createdAt).getTime();
                return entryDate > weekAgo;
            }).length;

            this.updateBadge();
        } catch (error) {
            console.error('Failed to load changelog entries:', error);
            this.unreadCount = 0;
        } finally {
            this.isLoading = false;
        }
    }

    updateBadge() {
        if (!this.badge) return;

        if (this.unreadCount > 0) {
            this.badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount.toString();
            this.badge.style.display = 'flex';
        } else {
            this.badge.style.display = 'none';
        }
    }

    renderEntries() {
        this.panelContent.innerHTML = '';

        if (!this.entries || this.entries.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'changerawr-floating-empty';
            empty.style.padding = '48px 24px';
            empty.style.textAlign = 'center';
            empty.style.color = 'var(--changerawr-text-secondary, #666666)';

            const emptyIcon = document.createElement('div');
            emptyIcon.style.fontSize = '40px';
            emptyIcon.style.marginBottom = '16px';
            emptyIcon.style.opacity = '0.5';
            emptyIcon.textContent = '📰';

            const emptyMsg = document.createElement('div');
            emptyMsg.style.fontSize = '14px';
            emptyMsg.textContent = 'No changelog entries yet';

            empty.appendChild(emptyIcon);
            empty.appendChild(emptyMsg);
            this.panelContent.appendChild(empty);
            return;
        }

        const entriesToShow = this.entries.slice(0, this.options.maxEntries);

        entriesToShow.forEach((entry, index) => {
            const entryEl = document.createElement('div');
            entryEl.className = 'changerawr-floating-entry';
            entryEl.style.padding = '12px 16px';
            entryEl.style.borderBottom = '1px solid var(--changerawr-border-color-light, #f5f5f5)';
            entryEl.style.transition = 'background-color 0.2s ease';

            // Tags
            if (entry.tags && entry.tags.length > 0) {
                const tagsContainer = document.createElement('div');
                tagsContainer.style.display = 'flex';
                tagsContainer.style.gap = '6px';
                tagsContainer.style.marginBottom = '8px';
                tagsContainer.style.flexWrap = 'wrap';

                entry.tags.forEach(tag => {
                    const tagEl = document.createElement('span');
                    tagEl.className = 'changerawr-floating-tag';
                    tagEl.textContent = tag.name;
                    tagEl.style.display = 'inline-block';
                    tagEl.style.padding = '3px 8px';
                    tagEl.style.fontSize = '11px';
                    tagEl.style.fontWeight = '500';
                    tagEl.style.borderRadius = '4px';
                    tagEl.style.whiteSpace = 'nowrap';

                    if (tag.color) {
                        tagEl.style.backgroundColor = tag.color + '20';
                        tagEl.style.color = tag.color;
                    } else {
                        tagEl.style.backgroundColor = 'var(--changerawr-primary-light, #e8f2ff)';
                        tagEl.style.color = 'var(--changerawr-primary-color, #0066ff)';
                    }

                    tagsContainer.appendChild(tagEl);
                });

                entryEl.appendChild(tagsContainer);
            }

            // Title
            const titleEl = document.createElement('h3');
            titleEl.className = 'changerawr-floating-entry-title';
            titleEl.textContent = entry.title;
            titleEl.style.margin = '0 0 6px 0';
            titleEl.style.fontSize = '14px';
            titleEl.style.fontWeight = '600';
            titleEl.style.color = 'var(--changerawr-text-primary, #1a1a1a)';
            titleEl.style.lineHeight = '1.4';
            entryEl.appendChild(titleEl);

            // Content
            if (entry.excerpt) {
                const contentEl = document.createElement('p');
                contentEl.className = 'changerawr-floating-entry-content';
                contentEl.textContent = entry.excerpt;
                contentEl.style.margin = '0 0 8px 0';
                contentEl.style.fontSize = '13px';
                contentEl.style.color = 'var(--changerawr-text-secondary, #666666)';
                contentEl.style.lineHeight = '1.5';
                contentEl.style.display = '-webkit-box';
                contentEl.style.webkitLineClamp = '3';
                contentEl.style.webkitBoxOrient = 'vertical';
                contentEl.style.overflow = 'hidden';
                contentEl.style.textOverflow = 'ellipsis';
                entryEl.appendChild(contentEl);
            }

            // Read more link
            const linkEl = document.createElement('a');
            linkEl.className = 'changerawr-floating-read-more';
            linkEl.href = `${this.baseUrl}/changelog/${this.options.projectId}/${entry.id}`;
            linkEl.textContent = 'Read more →';
            linkEl.target = '_blank';
            linkEl.rel = 'noopener';
            linkEl.style.display = 'inline-block';
            linkEl.style.marginTop = '6px';
            linkEl.style.fontSize = '12px';
            linkEl.style.fontWeight = '500';
            linkEl.style.color = 'var(--changerawr-primary-color, #0066ff)';
            linkEl.style.textDecoration = 'none';
            linkEl.style.cursor = 'pointer';
            linkEl.style.padding = '4px 0';

            linkEl.addEventListener('mouseenter', () => {
                linkEl.style.textDecoration = 'underline';
            });

            linkEl.addEventListener('mouseleave', () => {
                linkEl.style.textDecoration = 'none';
            });

            entryEl.appendChild(linkEl);

            // Hover effect
            entryEl.addEventListener('mouseenter', () => {
                entryEl.style.backgroundColor = 'var(--changerawr-bg-hover, #f5f5f5)';
            });

            entryEl.addEventListener('mouseleave', () => {
                entryEl.style.backgroundColor = 'transparent';
            });

            this.panelContent.appendChild(entryEl);
        });
    }

    open() {
        if (this.isOpen) return;

        this.isOpen = true;
        this.panel.style.display = 'flex';
        this.panel.setAttribute('aria-hidden', 'false');
        this.button.setAttribute('aria-expanded', 'true');

        // Render entries when opening
        this.renderEntries();

        // Trigger animation with a small delay
        setTimeout(() => {
            this.panel.classList.add('changerawr-floating-panel-open');
        }, 10);

        // Focus first element
        setTimeout(() => {
            const firstLink = this.panel.querySelector('a');
            if (firstLink) {
                firstLink.focus();
            }
        }, 100);
    }

    close() {
        if (!this.isOpen) return;

        this.isOpen = false;
        this.panel.classList.remove('changerawr-floating-panel-open');

        // Hide panel after animation
        setTimeout(() => {
            if (!this.isOpen) {
                this.panel.style.display = 'none';
                this.panel.setAttribute('aria-hidden', 'true');
            }
        }, 300);

        this.button.setAttribute('aria-expanded', 'false');
        this.button.focus();
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
}

// Export globally for browser
window.ChangerawrWidget = {
    init: (options) => {
        const container = options.container || document.getElementById('changerawr-widget');
        return new ChangelogFloatingWidget(container, options);
    }
};
