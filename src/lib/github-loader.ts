import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import { Document } from "@langchain/core/documents";
import { summarizeCode, generateEmbedding } from "./gemini";
import { db } from "@/server/db";

const ALL_IGNORED_FILES = new Set([
    '.gitignore',
    'README.md',
    'LICENSE',
    'CONTRIBUTING.md',
    'package.json',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'tsconfig.json',
    'jsconfig.json',
    '.env',
    '.dockerignore',
    'eslint.config.js',
    'vite.config.js',
    'next.config.js',
    'turbo.json',
    'tailwind.config.js',
    'index.html',
]);

const isIgnoredFile = (filePath: string): boolean => {
    if (ALL_IGNORED_FILES.has(filePath)) {
        return true;
    }
    
    if (filePath.endsWith('.svg') || 
        filePath.endsWith('.css') || 
        filePath.endsWith('.log') ||
        filePath.endsWith('.tmp') ||
        filePath.match(/\.env\./)) {
        return true;
    }

    return false;
}

export const loadGithubRepo = async (githubUrl: string, githubToken?: string) => {
    const loader = new GithubRepoLoader(githubUrl, {
        accessToken: githubToken || '', 
        branch: 'main',
        ignorePaths: [
            'node_modules',
            'dist',
            'build',
            '.next',
            '.out',
            '.git',
            '.github',
            '.vscode',
            '.idea',
            'coverage',
            '.cache',
            '__pycache__',
            '.pytest_cache',
        ],
        ignoreFiles: [], 
        recursive: true,
        unknown: 'warn',
        maxConcurrency: 5,
    });

    const doc = await loader.load();
    return doc;
}

const generateEmbeddings = async (docs: Document[]) => {
    return await Promise.all(docs.map(async (doc) => {
        const summary = await summarizeCode(doc);
        const embedding = await generateEmbedding(summary);
        return {
            summary,
            embedding,
            sourceCode: JSON.parse(JSON.stringify(doc.pageContent)),
            fileName: doc.metadata.source,
        }
    }));
}

export const indexGithubRepo = async (projectId: string, githubUrl: string, githubToken?: string) => {
    const rawDocs = await loadGithubRepo(githubUrl, githubToken);

    const filteredDocs = rawDocs.filter(doc => {
        const sourcePath = doc.metadata.source;
        if (isIgnoredFile(sourcePath)) {
            console.log(`Manually skipping file: ${sourcePath}`);
            return false;
        }
        return true;
    });

    const allEmbeddings = await generateEmbeddings(filteredDocs);
    
    await Promise.allSettled(allEmbeddings.map(async (embedding, index) => {
        console.log(`Processing ${index} of ${allEmbeddings.length}: `);
        if (!embedding) return;

        const sourceCodeEmbedding = await db.sourceCodeEmbedding.create({
            data: {
                summary: embedding.summary,
                sourceCode: embedding.sourceCode,
                fileName: embedding.fileName,
                projectId,
            }
        });
        await db.$executeRaw`
        UPDATE "SourceCodeEmbedding"
        SET "summaryEmbedding" = ${embedding.embedding}::vector
        WHERE id = ${sourceCodeEmbedding.id}
        `

    }));
}
