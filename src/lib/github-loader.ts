import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import { Document } from "@langchain/core/documents";
import { summarizeCode, generateEmbedding } from "./gemini"; 
import { db } from "@/server/db";
import { Octokit } from "@octokit/rest";

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
const getFileCount = async (path: string, octokit: Octokit, githubOwner: string, githubRepo: string, acc: number = 0) => {
    const { data } = await octokit.rest.repos.getContent({
        owner: githubOwner,
        repo: githubRepo,
        path,
    });
    if (!Array.isArray(data) && data.type === 'file') return acc + 1;
    if (Array.isArray(data)) {
        let fileCount = 0;
        const directories: string[] = [];
        for (const item of data) {
            if (item.type === 'dir') {
                directories.push(item.path);
            } else {
                fileCount += 1;
            }
        }
        if (directories.length > 0) {
            const directoryCounts = await Promise.all(directories.map(dirPath => getFileCount(dirPath, octokit, githubOwner, githubRepo, 0)));
            fileCount += directoryCounts.reduce((acc, count) => acc + count, 0);
        }
        return acc + fileCount;

    }
    return acc;
}


export const checkCredits = async (githubUrl: string, githubToken?: string) => {
    //finds the number of files in the repo
    const octokit = new Octokit({
        auth: githubToken,
    })
    const githubOwner = githubUrl.split('/')[3];
    const githubRepo = githubUrl.split('/')[4];

    if (!githubOwner || !githubRepo) return 0;

    const fileCount = await getFileCount('', octokit, githubOwner, githubRepo, 0);
    return fileCount;

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


const generateEmbeddings = async (docs: Document[], userGeminiApiKey?: string) => {
    return await Promise.all(docs.map(async (doc) => {
        // Pass the key to the LLM functions
        const summary = await summarizeCode(doc, userGeminiApiKey);
        const embedding = await generateEmbedding(summary, userGeminiApiKey);
        return {
            summary,
            embedding,
            sourceCode: JSON.parse(JSON.stringify(doc.pageContent)),
            fileName: doc.metadata.source,
        }
    }));
}

export const indexGithubRepo = async (
    projectId: string, 
    githubUrl: string, 
    githubToken?: string, 
    userGeminiApiKey?: string
) => {
    const rawDocs = await loadGithubRepo(githubUrl, githubToken);

    const filteredDocs = rawDocs.filter(doc => {
        const sourcePath = doc.metadata.source;
        if (isIgnoredFile(sourcePath)) {
            console.log(`Manually skipping file: ${sourcePath}`);
            return false;
        }
        return true;
    });

    const allEmbeddings = await generateEmbeddings(filteredDocs, userGeminiApiKey);

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
