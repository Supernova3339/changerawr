import * as esbuild from 'esbuild';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

if (!process.env.NEXT_PUBLIC_APP_URL) {
    throw new Error('NEXT_PUBLIC_APP_URL is required');
}

function copyDirectory(src: string, dest: string) {
    // Create destination directory if it doesn't exist
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    // Read all files/folders in source directory
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            // Recursively copy subdirectories
            copyDirectory(srcPath, destPath);
        } else {
            // Copy file
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

async function buildWidget() {
    try {
        const variants = [
            { name: 'legacy', entry: 'widgets/changelog/index.js', output: 'public/widget-bundle.js', globalName: 'ChangerawrWidgetLoader' },
            { name: 'classic', entry: 'widgets/variants/classic.js', output: 'public/widget-classic.js', globalName: 'ChangerawrWidget' },
            { name: 'floating', entry: 'widgets/variants/floating.js', output: 'public/widget-floating.js', globalName: 'ChangerawrWidget' },
            { name: 'modal', entry: 'widgets/variants/modal.js', output: 'public/widget-modal.js', globalName: 'ChangerawrWidget' },
            { name: 'announcement', entry: 'widgets/variants/announcement.js', output: 'public/widget-announcement.js', globalName: 'ChangerawrWidget' },
        ];

        // Build JavaScript bundles
        for (const variant of variants) {
            await esbuild.build({
                entryPoints: [variant.entry],
                bundle: true,
                minify: true,
                sourcemap: true,
                target: ['es2018'],
                format: 'iife',
                // Don't use globalName - let the widget code set window.ChangerawrWidget directly
                outfile: variant.output,
                define: {
                    'process.env.NEXT_PUBLIC_APP_URL': `"${process.env.NEXT_PUBLIC_APP_URL}"`,
                },
            });

            console.log(`✅ ${variant.name.charAt(0).toUpperCase() + variant.name.slice(1)} variant built successfully`);
        }

        // Copy CSS files to public directory
        const cssSourceDir = 'widgets/core/styles';
        const cssDestDir = 'public/widgets/core/styles';

        console.log('\n📦 Copying CSS files...');
        copyDirectory(cssSourceDir, cssDestDir);
        console.log(`✅ CSS files copied to ${cssDestDir}`);

    } catch (error) {
        console.error('❌ Widget build failed:', error);
        process.exit(1);
    }
}

buildWidget();