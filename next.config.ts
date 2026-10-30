import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
    reactStrictMode: false,
    // Exclude extensions/ — they are symlinked and Turbopack's filesystem classification
    // for that subtree breaks PlainSource::from_source when any diagnostic is emitted.
    transpilePackages: ['@changerawr/markdown'],
    reactCompiler: {
        sources: (filename: string) => !/[/\\]extensions[/\\]/.test(filename),
    },
    images: {
        formats: ["image/avif", "image/webp"],
        // No remote patterns needed - avatars are proxied through /api/avatar/[hash]
        remotePatterns: [],
    },
    turbopack: {
        // Set the root to the current project directory to avoid warnings about files outside the Git repo
        root: __dirname,
    },
    webpack: (config) => {
        // Exclude extensions folder from type checking and compilation
        config.module = config.module || {};
        config.module.rules = config.module.rules || [];

        config.module.rules.push({
            test: /\.(ts|tsx|js|jsx)$/,
            include: [path.join(__dirname, 'extensions')],
            use: 'ignore-loader',
        });

        return config;
    },
    typescript: {
        // Ignore build errors (extensions folder will always have errors)
        ignoreBuildErrors: true,
    },
    experimental: {
        // Enable optimized Fast Refresh for faster development
        optimizePackageImports: ['lucide-react', '@radix-ui/react-icons', '@heroicons/react'],
        // Turbo mode for faster builds
    },
    typedRoutes: false,
    // output: 'standalone', uses next-start, leave commented-out
    async headers() {
        return [
            {
                // All page routes (no file extension, not _next/* or /api/*).
                // Cloudflare's Rocket Loader rewrites <script> tags in HTML
                // responses, which breaks Next's chunk loading
                // ("Unexpected token '<'", font OTS errors). `no-transform`
                // tells Cloudflare to pass the response through untouched -
                // this disables Rocket Loader (and Polish/Auto-Minify) for
                // these responses regardless of the zone's dashboard config.
                source: '/((?!_next/|api/|.*\\..*).*)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'no-transform',
                    },
                ],
            },
        ];
    },
};

export default nextConfig;