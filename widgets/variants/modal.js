/**
 * Modal Changelog Widget
 * Full-screen overlay modal for changelog entries
 */

class ChangelogModalWidget {
    constructor(container, options) {
        this.container = container;
        this.options = {
            theme: 'light',
            maxEntries: 10,
            autoOpen: false,
            trigger: null,
            customCSS: null,
            showOverlay: true,
            ...options
        };

        this.isOpen = false;
        this.isLoading = false;
        this.baseUrl = options.baseUrl || process.env.NEXT_PUBLIC_APP_URL || '';
        this.init();
    }

    async loadStyles() {
        // Load core CSS files
        const cssFiles = [
            '/widgets/core/styles/variables.css',
            '/widgets/core/styles/reset.css',
            '/widgets/core/styles/common.css',
            '/widgets/core/styles/modal.css'
        ];

        for (const file of cssFiles) {
            if (!document.querySelector(`link[href="${this.baseUrl}${file}"]`)) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = this.baseUrl + file;
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

        // Apply base classes
        this.container.classList.add('changerawr-widget', 'changerawr-modal');

        // Apply theme
        if (this.options.theme === 'dark') {
            this.container.classList.add('dark');
        }

        // Initially hidden
        this.container.style.display = 'none';

        // ARIA attributes
        this.container.setAttribute('role', 'dialog');
        this.container.setAttribute('aria-modal', 'true');
        this.container.setAttribute('aria-label', 'Changelog updates');

        this.render();
        await this.loadEntries();
        this.setupKeyboardNavigation();

        if (this.options.trigger) {
            this.setupTriggerButton();
        }

        if (this.options.autoOpen) {
            setTimeout(() => this.open(), 1000);
        }
    }

    setupKeyboardNavigation() {
        this.container.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }

            if (e.key === 'Tab' && this.isOpen) {
                const focusableElements = this.container.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        });
    }

    setupTriggerButton() {
        const trigger = document.getElementById(this.options.trigger);
        if (!trigger) {
            console.error(`Changerawr: Trigger button '${this.options.trigger}' not found`);
            return;
        }

        trigger.addEventListener('click', () => this.toggle());
        trigger.setAttribute('aria-haspopup', 'dialog');
        trigger.setAttribute('aria-expanded', this.isOpen.toString());
    }

    async loadEntries() {
        this.isLoading = true;
        this.renderLoading();

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
            this.renderEntries(this.entries);
        } catch (error) {
            console.error('Failed to load changelog entries:', error);
            this.renderError();
        } finally {
            this.isLoading = false;
        }
    }

    render() {
        // Overlay
        if (this.options.showOverlay) {
            const overlay = document.createElement('div');
            overlay.className = 'changerawr-modal-overlay';
            overlay.addEventListener('click', () => this.close());
            this.container.appendChild(overlay);
        }

        // Modal content
        const modal = document.createElement('div');
        modal.className = 'changerawr-modal-content';

        const header = this.createHeader();
        const content = document.createElement('div');
        content.className = 'changerawr-entries';
        const footer = this.createFooter();

        modal.appendChild(header);
        modal.appendChild(content);
        modal.appendChild(footer);

        this.container.appendChild(modal);
    }

    createHeader() {
        const header = document.createElement('div');
        header.className = 'changerawr-header';

        const title = document.createElement('div');
        title.className = 'changerawr-header-title';
        title.textContent = this.project?.name || 'Changelog';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'changerawr-close';
        closeBtn.innerHTML = '✕';
        closeBtn.setAttribute('aria-label', 'Close changelog');
        closeBtn.addEventListener('click', () => this.close());

        header.appendChild(title);
        header.appendChild(closeBtn);

        return header;
    }

    createFooter() {
        const footer = document.createElement('div');
        footer.className = 'changerawr-footer';

        const poweredBy = document.createElement('span');
        poweredBy.innerHTML = 'Powered by <a href="https://github.com/supernova3339/changerawr" target="_blank" rel="noopener">Changerawr</a>';

        const rssLink = document.createElement('a');
        rssLink.href = `${this.baseUrl}/changelog/${this.options.projectId}/rss.xml`;
        rssLink.textContent = 'RSS';
        rssLink.target = '_blank';
        rssLink.rel = 'noopener';

        footer.appendChild(poweredBy);
        footer.appendChild(rssLink);

        return footer;
    }

    renderLoading() {
        const content = this.container.querySelector('.changerawr-entries');
        if (!content) return;

        content.innerHTML = '<div class="changerawr-loading"><div class="changerawr-spinner"></div></div>';
    }

    renderError() {
        const content = this.container.querySelector('.changerawr-entries');
        if (!content) return;

        content.innerHTML = `
            <div class="changerawr-error">
                <div class="changerawr-error-icon">⚠️</div>
                <div class="changerawr-error-message">Failed to load changelog</div>
            </div>
        `;
    }

    renderEntries(entries) {
        const content = this.container.querySelector('.changerawr-entries');
        if (!content) return;

        content.innerHTML = '';

        if (!entries || entries.length === 0) {
            content.innerHTML = `
                <div class="changerawr-empty">
                    <div class="changerawr-empty-icon">📰</div>
                    <div class="changerawr-empty-message">No changelog entries yet</div>
                </div>
            `;
            return;
        }

        const entriesToShow = entries.slice(0, this.options.maxEntries);

        entriesToShow.forEach((entry, index) => {
            const entryEl = document.createElement('div');
            entryEl.className = 'changerawr-entry';
            entryEl.style.animationDelay = `${index * 0.05}s`;

            // Date
            const date = document.createElement('div');
            date.className = 'changerawr-entry-date';
            const entryDate = new Date(entry.createdAt);
            date.textContent = entryDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            entryEl.appendChild(date);

            // Tags
            if (entry.tags && entry.tags.length > 0) {
                const tagsContainer = document.createElement('div');
                tagsContainer.className = 'changerawr-entry-meta';

                entry.tags.forEach(tag => {
                    const tagEl = document.createElement('span');
                    tagEl.className = 'changerawr-tag';
                    tagEl.textContent = tag.name;
                    if (tag.color) {
                        tagEl.style.backgroundColor = tag.color + '20';
                        tagEl.style.color = tag.color;
                    }
                    tagsContainer.appendChild(tagEl);
                });

                entryEl.appendChild(tagsContainer);
            }

            // Title
            const title = document.createElement('div');
            title.className = 'changerawr-entry-title';
            title.textContent = entry.title;
            entryEl.appendChild(title);

            // Excerpt/Content
            if (entry.excerpt) {
                const excerpt = document.createElement('div');
                excerpt.className = 'changerawr-entry-content';
                excerpt.textContent = entry.excerpt;
                entryEl.appendChild(excerpt);
            }

            // Read more link
            const readMore = document.createElement('a');
            readMore.className = 'changerawr-read-more';
            readMore.href = `${this.baseUrl}/changelog/${this.options.projectId}/${entry.id}`;
            readMore.textContent = 'Read more →';
            readMore.target = '_blank';
            readMore.rel = 'noopener';
            entryEl.appendChild(readMore);

            content.appendChild(entryEl);
        });
    }

    open() {
        if (this.isOpen) return;

        this.isOpen = true;
        this.container.style.display = 'flex';
        this.container.classList.add('open');

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        const trigger = this.options.trigger ? document.getElementById(this.options.trigger) : null;
        if (trigger) {
            trigger.setAttribute('aria-expanded', 'true');
        }

        // Focus first focusable element
        setTimeout(() => {
            const focusable = this.container.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusable.length > 0) {
                focusable[0].focus();
            }
        }, 100);
    }

    close() {
        if (!this.isOpen) return;

        this.isOpen = false;
        this.container.classList.remove('open');

        // Restore body scroll
        document.body.style.overflow = '';

        setTimeout(() => {
            this.container.style.display = 'none';
        }, 300);

        const trigger = this.options.trigger ? document.getElementById(this.options.trigger) : null;
        if (trigger) {
            trigger.setAttribute('aria-expanded', 'false');
            trigger.focus();
        }
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
        return new ChangelogModalWidget(container, options);
    }
};
