import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
    reactStrictMode: false,
    images: {
        formats: ["image/avif", "image/webp"],
        remotePatterns: [
            {
                protocol: "https",
                hostname: "www.gravatar.com",
                port: "",
                pathname: "/avatar/**",
            }
        ],
    },
    webpack: (config) => {
        // Required for Redoc
        config.resolve.fallback = {
            ...config.resolve.fallback,
            fs: false,
            path: false,
        };

        return config;
    },
    turbopack: {
        root: path.join(__dirname, '..'),
    },
    // output: 'standalone', uses next-start, leave commented-out
};

export default nextConfig;