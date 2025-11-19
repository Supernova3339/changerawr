/**
 * Announcement Bar Changelog Widget
 * Top or bottom bar displaying latest changelog entry
 */

class ChangelogAnnouncementWidget {
    constructor(container, options) {
        this.container = container;
        this.options = {
            theme: 'light',
            position: 'top',
            dismissible: true,
            autoHide: false,
            hideDelay: 10000,
            showIcon: true,
            customCSS: null,
            ...options
        };

        this.isVisible = true;
        this.isDismissed = false;
        this.baseUrl = options.baseUrl || process.env.NEXT_PUBLIC_APP_URL || '';
        this.storageKey = `changerawr-announcement-dismissed-${this.options.projectId}`;
        this.init();
    }

    async loadStyles() {
        // Load core CSS files
        const cssFiles = [
            '/widgets/core/styles/variables.css',
            '/widgets/core/styles/reset.css',
            '/widgets/core/styles/common.css',
            '/widgets/core/styles/announcement.css'
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

    checkDismissed() {
        if (!this.options.dismissible) return false;

        try {
            const dismissed = localStorage.getItem(this.storageKey);
            return dismissed === 'true';
        } catch (e) {
            return false;
        }
    }

    markDismissed() {
        try {
            localStorage.setItem(this.storageKey, 'true');
        } catch (e) {
            console.warn('Changerawr: Could not save dismissal state');
        }
    }

    async init() {
        await this.loadStyles();

        // Check if already dismissed
        if (this.checkDismissed()) {
            this.container.style.display = 'none';
            return;
        }

        // Apply base classes
        this.container.classList.add('changerawr-widget', 'changerawr-announcement');

        // Apply theme
        if (this.options.theme === 'dark') {
            this.container.classList.add('dark');
        }

        // Apply position
        if (this.options.position === 'bottom') {
            this.container.classList.add('changerawr-announcement-bottom');
        } else {
            this.container.classList.add('changerawr-announcement-top');
        }

        // ARIA attributes
        this.container.setAttribute('role', 'banner');
        this.container.setAttribute('aria-label', 'Changelog announcement');

        await this.loadLatestEntry();

        if (this.options.autoHide && this.options.hideDelay > 0) {
            setTimeout(() => this.hide(), this.options.hideDelay);
        }
    }

    async loadLatestEntry() {
        try {
            const response = await fetch(
                `${this.baseUrl}/api/changelog/${this.options.projectId}/entries`
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const entries = data.items || [];
            this.project = data.project;

            if (entries.length > 0) {
                this.latestEntry = entries[0];
                this.render();
            } else {
                this.container.style.display = 'none';
            }
        } catch (error) {
            console.error('Failed to load changelog entry:', error);
            this.container.style.display = 'none';
        }
    }

    render() {
        if (!this.latestEntry) return;

        const bar = document.createElement('div');
        bar.className = 'changerawr-announcement-bar';

        // Icon
        if (this.options.showIcon) {
            const icon = document.createElement('span');
            icon.className = 'changerawr-announcement-icon';
            icon.innerHTML = '🎉';
            bar.appendChild(icon);
        }

        // Content container
        const content = document.createElement('div');
        content.className = 'changerawr-announcement-content';

        // Label (optional)
        const label = document.createElement('span');
        label.className = 'changerawr-announcement-label';
        label.textContent = 'New:';
        content.appendChild(label);

        // Title
        const title = document.createElement('span');
        title.className = 'changerawr-announcement-title';
        title.textContent = this.latestEntry.title;
        content.appendChild(title);

        // Tags (if any)
        if (this.latestEntry.tags && this.latestEntry.tags.length > 0) {
            const tag = this.latestEntry.tags[0]; // Show only first tag
            const tagEl = document.createElement('span');
            tagEl.className = 'changerawr-announcement-tag';
            tagEl.textContent = tag.name;
            if (tag.color) {
                tagEl.style.backgroundColor = tag.color + '20';
                tagEl.style.color = tag.color;
            }
            content.appendChild(tagEl);
        }

        bar.appendChild(content);

        // Actions
        const actions = document.createElement('div');
        actions.className = 'changerawr-announcement-actions';

        // Read more link
        const readMore = document.createElement('a');
        readMore.className = 'changerawr-announcement-link';
        readMore.href = `${this.baseUrl}/changelog/${this.options.projectId}/${this.latestEntry.id}`;
        readMore.textContent = 'Read more';
        readMore.target = '_blank';
        readMore.rel = 'noopener';
        actions.appendChild(readMore);

        // Dismiss button
        if (this.options.dismissible) {
            const dismissBtn = document.createElement('button');
            dismissBtn.className = 'changerawr-announcement-dismiss';
            dismissBtn.innerHTML = '✕';
            dismissBtn.setAttribute('aria-label', 'Dismiss announcement');
            dismissBtn.addEventListener('click', () => this.dismiss());
            actions.appendChild(dismissBtn);
        }

        bar.appendChild(actions);

        this.container.innerHTML = '';
        this.container.appendChild(bar);
    }

    dismiss() {
        if (this.isDismissed) return;

        this.isDismissed = true;
        this.markDismissed();
        this.hide();
    }

    hide() {
        if (!this.isVisible) return;

        this.isVisible = false;
        this.container.classList.add('changerawr-announcement-hidden');

        setTimeout(() => {
            this.container.style.display = 'none';
        }, 300);
    }

    show() {
        if (this.isVisible) return;

        this.isVisible = true;
        this.container.style.display = 'block';
        this.container.classList.remove('changerawr-announcement-hidden');
    }
}

// Export globally for browser
window.ChangerawrWidget = {
    init: (options) => {
        const container = options.container || document.getElementById('changerawr-widget');
        return new ChangelogAnnouncementWidget(container, options);
    }
};
