#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import { chromium, Page } from 'playwright';

interface PageInfo {
    path: string;
    fullPath: string;
    type: 'page' | 'layout' | 'loading' | 'error' | 'not-found' | 'route';
    isDynamic: boolean;
    segments: string[];
    screenshotPath?: string;
}

interface ScreenshotConfig {
    baseUrl: string;
    outputDir: string;
    auth?: {
        loginUrl: string;
        credentials: {
            email: string;
            password: string;
        };
        selectors: {
            emailInput: string;
            passwordInput: string;
            submitButton: string;
        };
    };
    viewport?: {
        width: number;
        height: number;
    };
    waitForSelector?: string;
    delay?: number;
    routeParams?: {
        projectId?: string;
        [key: string]: string | undefined;
    };
}

interface RouteTreeNode {
    name: string;
    path: string;
    type: PageInfo['type'];
    isDynamic: boolean;
    children: RouteTreeNode[];
}

class NextJSPageScanner {
    private appDir: string;
    private screenshotConfig?: ScreenshotConfig;

    constructor(appDir: string = './app', screenshotConfig?: ScreenshotConfig) {
        this.appDir = path.resolve(appDir);
        this.screenshotConfig = screenshotConfig;

        if (!fs.existsSync(this.appDir)) {
            throw new Error(`App directory not found: ${this.appDir}`);
        }

        if (this.screenshotConfig?.outputDir) {
            this.ensureDirectoryExists(this.screenshotConfig.outputDir);
        }
    }

    public async scanPages(): Promise<RouteTreeNode[]> {
        const pages: PageInfo[] = [];
        this.scanDirectory(this.appDir, '', pages);

        if (this.screenshotConfig) {
            await this.takeScreenshots(pages);
        }

        return this.buildRouteTree(pages);
    }

    private ensureDirectoryExists(dirPath: string): void {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    private async takeScreenshots(pages: PageInfo[]): Promise<void> {
        if (!this.screenshotConfig) return;

        const screenshotablePages = this.filterScreenshotablePages(pages);
        if (screenshotablePages.length === 0) {
            console.log('No screenshotable pages found');
            return;
        }

        console.log(`Taking screenshots for ${screenshotablePages.length} pages...`);

        const browser = await chromium.launch({ headless: false });
        const context = await browser.newContext({
            viewport: this.screenshotConfig.viewport || { width: 1920, height: 1080 }
        });

        const page = await context.newPage();

        try {
            // Handle authentication if configured
            if (this.screenshotConfig.auth) {
                await this.performLogin(page);
                // Wait 15 seconds after login before taking first screenshot
                console.log('Waiting 15 seconds after login...');
                await page.waitForTimeout(15000);
            }

            // Take screenshots of each page
            for (const pageInfo of screenshotablePages) {
                await this.screenshotPage(page, pageInfo);
            }

        } finally {
            await browser.close();
        }
    }

    private filterScreenshotablePages(pages: PageInfo[]): PageInfo[] {
        return pages.filter(p => {
            // Only screenshot page types
            if (p.type !== 'page') return false;

            // Handle dynamic routes
            if (p.isDynamic) {
                // Check if we have the required parameters
                const requiredParams = this.extractRequiredParams(p.segments);
                return this.hasRequiredParams(requiredParams);
            }

            // Static pages are always screenshotable
            return true;
        });
    }

    private extractRequiredParams(segments: string[]): string[] {
        return segments
            .filter(segment => segment.startsWith('[') && segment.endsWith(']'))
            .map(segment => segment.slice(1, -1)); // Remove brackets
    }

    private hasRequiredParams(requiredParams: string[]): boolean {
        if (!this.screenshotConfig?.routeParams) return false;

        return requiredParams.every(param =>
            this.screenshotConfig!.routeParams![param] !== undefined
        );
    }

    private buildRouteUrl(pageInfo: PageInfo): string {
        if (!pageInfo.isDynamic) {
            return `${this.screenshotConfig!.baseUrl}${pageInfo.path}`;
        }

        // Replace dynamic segments with actual values
        let url = pageInfo.path;

        if (this.screenshotConfig?.routeParams) {
            for (const [param, value] of Object.entries(this.screenshotConfig.routeParams)) {
                if (value) {
                    url = url.replace(`[${param}]`, value);
                }
            }
        }

        return `${this.screenshotConfig!.baseUrl}${url}`;
    }

    private async performLogin(page: Page): Promise<void> {
        if (!this.screenshotConfig?.auth) return;

        const { loginUrl, credentials, selectors } = this.screenshotConfig.auth;

        console.log(`Logging in at ${loginUrl}...`);

        await page.goto(loginUrl);

        // Step 1: Enter email and click continue
        await page.waitForSelector(selectors.emailInput);
        await page.fill(selectors.emailInput, credentials.email);
        await page.click(selectors.submitButton);

        // Step 2: Wait for password field to appear and enter password
        await page.waitForSelector(selectors.passwordInput, { timeout: 10000 });
        await page.fill(selectors.passwordInput, credentials.password);
        await page.click(selectors.submitButton);

        // Wait for navigation after final login
        await page.waitForNavigation({ waitUntil: 'networkidle' });
        console.log('Login completed');
    }

    private async screenshotPage(page: Page, pageInfo: PageInfo): Promise<void> {
        if (!this.screenshotConfig) return;

        try {
            const url = this.buildRouteUrl(pageInfo);
            console.log(`Capturing: ${url}`);

            await page.goto(url, { waitUntil: 'networkidle' });

            // Wait for specific selector if configured
            if (this.screenshotConfig.waitForSelector) {
                await page.waitForSelector(this.screenshotConfig.waitForSelector, { timeout: 10000 });
            }

            // Additional delay if configured
            if (this.screenshotConfig.delay) {
                await page.waitForTimeout(this.screenshotConfig.delay);
            }

            const screenshotFileName = this.generateScreenshotFilename(pageInfo.path);
            const screenshotPath = path.join(this.screenshotConfig.outputDir, screenshotFileName);

            await page.screenshot({
                path: screenshotPath,
                fullPage: true
            });

            pageInfo.screenshotPath = screenshotPath;
            console.log(`Screenshot saved: ${screenshotPath}`);

        } catch (error) {
            console.error(`Failed to screenshot ${pageInfo.path}:`, error);
        }
    }

    private generateScreenshotFilename(routePath: string): string {
        // Convert route path to safe filename
        const safeName = routePath
                .replace(/\//g, '_')
                .replace(/\[|\]/g, '')
                .replace(/^_/, 'root')
            || 'root';

        return `${safeName}.png`;
    }

    private scanDirectory(dirPath: string, relativePath: string, pages: PageInfo[]): void {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            const currentPath = path.join(relativePath, entry.name);

            if (entry.isDirectory()) {
                if (this.shouldSkipDirectory(entry.name)) {
                    continue;
                }
                this.scanDirectory(fullPath, currentPath, pages);
            } else if (entry.isFile()) {
                const pageInfo = this.analyzeFile(fullPath, currentPath);
                if (pageInfo) {
                    pages.push(pageInfo);
                }
            }
        }
    }

    private shouldSkipDirectory(dirName: string): boolean {
        const skipDirs = [
            'node_modules',
            '.next',
            '.git',
            'components',
            'lib',
            'utils',
            'styles',
            'public'
        ];
        return skipDirs.includes(dirName) || dirName.startsWith('.');
    }

    private analyzeFile(fullPath: string, relativePath: string): PageInfo | null {
        const fileName = path.basename(relativePath);
        const dirPath = path.dirname(relativePath);

        const pageFilePatterns: Record<string, PageInfo['type']> = {
            'page.tsx': 'page',
            'page.ts': 'page',
            'page.jsx': 'page',
            'page.js': 'page',
            'layout.tsx': 'layout',
            'layout.ts': 'layout',
            'layout.jsx': 'layout',
            'layout.js': 'layout',
            'loading.tsx': 'loading',
            'loading.ts': 'loading',
            'loading.jsx': 'loading',
            'loading.js': 'loading',
            'error.tsx': 'error',
            'error.ts': 'error',
            'error.jsx': 'error',
            'error.js': 'error',
            'not-found.tsx': 'not-found',
            'not-found.ts': 'not-found',
            'not-found.jsx': 'not-found',
            'not-found.js': 'not-found',
            'route.tsx': 'route',
            'route.ts': 'route',
            'route.jsx': 'route',
            'route.js': 'route'
        };

        const fileType = pageFilePatterns[fileName];
        if (!fileType) {
            return null;
        }

        const segments = dirPath === '.' ? [] : dirPath.split(path.sep).filter(Boolean);
        const isDynamic = this.checkIfDynamic(segments);

        let urlPath = segments.length === 0 ? '/' : '/' + segments.join('/');

        urlPath = segments.reduce((acc, segment) => {
            if (segment.startsWith('[') && segment.endsWith(']')) {
                const paramName = segment.slice(1, -1);
                return acc + '/[' + paramName + ']';
            }
            return acc + '/' + segment;
        }, '') || '/';

        return {
            path: urlPath,
            fullPath,
            type: fileType,
            isDynamic,
            segments
        };
    }

    private checkIfDynamic(segments: string[]): boolean {
        return segments.some(segment =>
            segment.startsWith('[') && segment.endsWith(']') ||
            segment.startsWith('(') && segment.endsWith(')')
        );
    }

    private buildRouteTree(pages: PageInfo[]): RouteTreeNode[] {
        const root: RouteTreeNode[] = [];

        const sortedPages = [...pages].sort((a, b) =>
            a.segments.length - b.segments.length
        );

        for (const page of sortedPages) {
            const segments = page.segments;
            let currentLevel = root;
            let currentPath = '';

            for (let i = 0; i < segments.length; i++) {
                const segment = segments[i];
                currentPath += '/' + segment;

                let node = currentLevel.find(n => n.name === segment);

                if (!node) {
                    node = {
                        name: segment,
                        path: currentPath,
                        type: i === segments.length - 1 ? page.type : 'page',
                        isDynamic: segment.startsWith('[') || segment.startsWith('('),
                        children: []
                    };
                    currentLevel.push(node);
                }

                currentLevel = node.children;
            }

            if (segments.length === 0) {
                const rootNode: RouteTreeNode = {
                    name: 'root',
                    path: '/',
                    type: page.type,
                    isDynamic: false,
                    children: []
                };
                root.push(rootNode);
            }
        }

        return root;
    }

    public generateTreeView(nodes: RouteTreeNode[], prefix: string = ''): string {
        let result = '';

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const isLastNode = i === nodes.length - 1;
            const connector = isLastNode ? '└── ' : '├── ';
            const dynamicIndicator = node.isDynamic ? ' (dynamic)' : '';

            result += `${prefix}${connector}${node.name} [${node.type}]${dynamicIndicator}\n`;

            if (node.children.length > 0) {
                const childPrefix = prefix + (isLastNode ? '    ' : '│   ');
                result += this.generateTreeView(node.children, childPrefix);
            }
        }

        return result;
    }
}

// Example configuration
const exampleConfig: ScreenshotConfig = {
    baseUrl: 'http://localhost:3000',
    outputDir: './screenshots',
    auth: {
        loginUrl: 'http://localhost:3000',
        credentials: {
            email: 'admin@changerawr.com', // admin seeder account email
            password: 'password123' // admin seeder account password
        },
        selectors: {
            emailInput: 'input[type="email"]',
            passwordInput: 'input[type="password"]',
            submitButton: 'button[type="submit"]'
        }
    },
    viewport: {
        width: 1920,
        height: 1080
    },
    // waitForSelector: '[data-testid="page-loaded"]', // disabled until eventually implemented
    delay: 1000, // Optional: additional delay in ms
    routeParams: {
        projectId: 'cmhy3qagr000dvt7kd5hoicrk', // Uses project ID from current testing database
    }
};

async function main(): Promise<void> {
    try {
        // Example with screenshots
        const scanner = new NextJSPageScanner('./app', exampleConfig);
        const routeTree = await scanner.scanPages();

        if (routeTree.length === 0) {
            console.log('No pages found in the app directory.');
        } else {
            console.log('\nRoute Tree:');
            console.log(scanner.generateTreeView(routeTree));
        }

    } catch (error) {
        console.error('Error scanning pages:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

export {NextJSPageScanner};
export type { PageInfo, RouteTreeNode, ScreenshotConfig };
