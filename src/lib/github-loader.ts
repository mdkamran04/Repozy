import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import { generate } from "node_modules/@langchain/core/dist/utils/fast-json-patch";
import { Document } from "@langchain/core/documents";
import { summarizeCode, generateEmbedding } from "./gemini";
import { db } from "@/server/db";

export const loadGithubRepo = async (githubUrl: string, githubToken?: string) => {
    const loader = new GithubRepoLoader(githubUrl, {
        accessToken: githubToken || '', // Optional: GitHub token for private repos or higher rate limits
        branch: 'main',
        // Ignore whole directories
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

        // Ignore specific files
        ignoreFiles: [
            '.gitignore',
            '.dockerignore',
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
            '.env.*',
            '*.log',
            '*.tmp',
        ],
        recursive: true,
        unknown: 'warn',
        maxConcurrency: 5,
    });

    const doc = await loader.load();
    return doc;
}

export const indexGithubRepo = async (projectId: string, githubUrl: string, githubToken?: string) => {
    const docs = await loadGithubRepo(githubUrl, githubToken);
    const allEmbeddings = await generateEmbeddings(docs);
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