import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export const summariseCommit = async (diff: string) => {
  //https://github.com/owner/repoName/commit/<commitHash>.diff

  const response = await model.generateContent([
    `
    You are an expert programmer, and you are working on a project to summarize a git diff .
Reminders about the git diff format:
For every file, there are a few metadata lines, like (for example) :
\'\'\'
diff --git a/lib/index.js b/lib/index.js
index aadf691. .bfef603 100644
--- a/lib/index.js
+++ b/lib/index.js
\'\'\'
This means that \ 'lib/index.js\ was modified in this commit. Note that this is only an example.
Then there is a specifier of the lines that were modified.
A line starting with \' + \' means it was added.
A line that starting with \'- \' means that line was deleted.
A line that starts with neither \ ' + \ ' nor \' - \' is code given for context and better understanding.
It is not part Of the diff.
[...]
EXAMPLE SUMMARY COMMENTS:
\'\'\'
⭐ Raised the amount of returned recordings from \'10 to \'100 [ packages/ server/ recordings_api.tsx ], [ packages/ server/constants.tsx ]',
⭐ Fixed a typo in the github action name [.github/workflows/gpt-commit-summarizer.yml]
⭐ Moved the \'octokit\' initialization to a separate file [src/octokit.ts],[src/index.ts]
⭐ Added an OpenAI API for completions [packages/ utils/apis/openai .ts]
⭐ Lowered numeric tolerance for test files
\'\'\'

Most commits will have less comments than this examples list .
The last comment does not include the file names ,
because there were more than two relevant files in the hypothetical commit.
Do not include parts of the example in your summary .
It is given only as an example of appropriate comments.
Please summarise the following diff file: \n\n${diff}
  `,
  ]);
  return response.response.text();
};

console.log(
  await summariseCommit(`
    diff --git a/.eslintrc.cjs b/.eslintrc.cjs
index a92fb0b..17f931d 100644
--- a/.eslintrc.cjs
+++ b/.eslintrc.cjs
@@ -1,42 +1,9 @@
 /** @type {import("eslint").Linter.Config} */
 const config = {
-  "parser": "@typescript-eslint/parser",
-  "parserOptions": {
-    "project": true
+  parser: "@typescript-eslint/parser",
+  parserOptions: {
+    project: true,
   },
-  "plugins": [
-    "@typescript-eslint"
-  ],
-  "extends": [
-    "next/core-web-vitals",
-    "plugin:@typescript-eslint/recommended-type-checked",
-    "plugin:@typescript-eslint/stylistic-type-checked"
-  ],
-  "rules": {
-    "@typescript-eslint/array-type": "off",
-    "@typescript-eslint/consistent-type-definitions": "off",
-    "@typescript-eslint/consistent-type-imports": [
-      "warn",
-      {
-        "prefer": "type-imports",
-        "fixStyle": "inline-type-imports"
-      }
-    ],
-    "@typescript-eslint/no-unused-vars": [
-      "warn",
-      {
-        "argsIgnorePattern": "^_"
-      }
-    ],
-    "@typescript-eslint/require-await": "off",
-    "@typescript-eslint/no-misused-promises": [
-      "error",
-      {
-        "checksVoidReturn": {
-          "attributes": false
-        }
-      }
-    ]
-  }
-}
-module.exports = config;
\ No newline at end of file
+  plugins: ["@typescript-eslint"],
+};
+module.exports = config;
diff --git a/src/app/dashboard/page.tsx b/src/app/dashboard/page.tsx
new file mode 100644
index 0000000..40c965c
--- /dev/null
+++ b/src/app/dashboard/page.tsx
@@ -0,0 +1,17 @@
+"use client"
+
+import React from 'react';
+import { useUser } from '@clerk/nextjs';
+
+const DashboardPage = () => {
+    const {user}=  useUser();
+
+  return (
+    <div>
+       {user?.firstName} 
+      
+    </div>
+  )
+}
+
+export default DashboardPage;
diff --git a/src/app/sync-user/page.tsx b/src/app/sync-user/page.tsx
new file mode 100644
index 0000000..1a1aeda
--- /dev/null
+++ b/src/app/sync-user/page.tsx
@@ -0,0 +1,34 @@
+import { notFound, redirect } from "next/navigation";
+import { db } from "@/server/db";
+import { auth, clerkClient } from "@clerk/nextjs/server";
+const SyncUser = async () => {
+  const { userId } = await auth();
+  if (!userId) {
+    throw new Error("User not found");
+  }
+  const client = await clerkClient();
+  const user = await client.users.getUser(userId);
+  if (!user.emailAddresses[0]?.emailAddress) {
+    return notFound();
+  }
+  await db.user.upsert({
+    where: {
+      emailAddress: user.emailAddresses[0]?.emailAddress ?? "",
+    },
+    update: {
+      imageUrl: user.imageUrl,
+      firstName: user.firstName,
+      lastName: user.lastName,
+    },
+    create: {
+      id: userId,
+      emailAddress: user.emailAddresses[0]?.emailAddress ?? "",
+      imageUrl: user.imageUrl,
+      firstName: user.firstName,
+      lastName: user.lastName,
+    },
+  });
+  return redirect('/dashboard');
+};
+
+export default SyncUser;`),
);
