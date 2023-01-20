import * as fs from "fs";
import * as path from "path";

import * as toolrunner from "@actions/exec/lib/toolrunner";
import * as safeWhich from "@chrisgavin/safe-which";
import test from "ava";

import * as externalQueries from "./external-queries";
import { getRunnerLogger } from "./logging";
import { setupTests } from "./testing-utils";
import * as util from "./util";

setupTests(test);

test("checkoutExternalQueries", async (t) => {
  await util.withTmpDir(async (tmpDir) => {
    // Create a test repo in a subdir of the temp dir.
    // It should have a default branch with two commits after the initial commit, where
    // - the first commit contains files 'a' and 'b'
    // - the second commit contains only 'a'
    // Place the repo in a subdir because we're going to checkout a copy in tmpDir
    const testRepoBaseDir = path.join(tmpDir, "test-repo-dir");
    const repoName = "some/repo";
    const repoPath = path.join(testRepoBaseDir, repoName);
    const repoGitDir = path.join(repoPath, ".git");

    // Run the given git command, and return the output.
    // Passes --git-dir and --work-tree.
    // Any stderr output is suppressed until the command fails.
    const runGit = async function (command: string[]): Promise<string> {
      let stdout = "";
      let stderr = "";
      command = [
        `--git-dir=${repoGitDir}`,
        `--work-tree=${repoPath}`,
        ...command,
      ];
      console.log(`Running: git ${command.join(" ")}`);
      try {
        await new toolrunner.ToolRunner(
          await safeWhich.safeWhich("git"),
          command,
          {
            silent: true,
            listeners: {
              stdout: (data) => {
                stdout += data.toString();
              },
              stderr: (data) => {
                stderr += data.toString();
              },
            },
          }
        ).exec();
      } catch (e) {
        console.log(`Command failed: git ${command.join(" ")}`);
        process.stderr.write(stderr);
        throw e;
      }
      return stdout.trim();
    };

    fs.mkdirSync(repoPath, { recursive: true });
    await runGit(["init", repoPath]);
    await runGit(["config", "user.email", "test@github.com"]);
    await runGit(["config", "user.name", "Test Test"]);
    await runGit(["config", "commit.gpgsign", "false"]);

    fs.writeFileSync(path.join(repoPath, "a"), "a content");
    await runGit(["add", "a"]);
    await runGit(["commit", "-m", "commit1"]);

    fs.writeFileSync(path.join(repoPath, "b"), "b content");
    await runGit(["add", "b"]);
    await runGit(["commit", "-m", "commit1"]);
    const commit1Sha = await runGit(["rev-parse", "HEAD"]);

    fs.unlinkSync(path.join(repoPath, "b"));
    await runGit(["add", "b"]);
    await runGit(["commit", "-m", "commit2"]);
    const commit2Sha = await runGit(["rev-parse", "HEAD"]);

    // Checkout the first commit, which should contain 'a' and 'b'
    t.false(fs.existsSync(path.join(tmpDir, repoName)));
    await externalQueries.checkoutExternalRepository(
      repoName,
      commit1Sha,
      {
        url: `file://${testRepoBaseDir}`,
        externalRepoAuth: "",
        apiURL: undefined,
      },
      tmpDir,
      getRunnerLogger(true)
    );
    t.true(fs.existsSync(path.join(tmpDir, repoName)));
    t.true(fs.existsSync(path.join(tmpDir, repoName, commit1Sha)));
    t.true(fs.existsSync(path.join(tmpDir, repoName, commit1Sha, "a")));
    t.true(fs.existsSync(path.join(tmpDir, repoName, commit1Sha, "b")));

    // Checkout the second commit as well, which should only contain 'a'
    t.false(fs.existsSync(path.join(tmpDir, repoName, commit2Sha)));
    await externalQueries.checkoutExternalRepository(
      repoName,
      commit2Sha,
      {
        url: `file://${testRepoBaseDir}`,
        externalRepoAuth: "",
        apiURL: undefined,
      },
      tmpDir,
      getRunnerLogger(true)
    );
    t.true(fs.existsSync(path.join(tmpDir, repoName, commit2Sha)));
    t.true(fs.existsSync(path.join(tmpDir, repoName, commit2Sha, "a")));
    t.false(fs.existsSync(path.join(tmpDir, repoName, commit2Sha, "b")));
  });
});

test("buildCheckoutURL", (t) => {
  t.deepEqual(
    externalQueries.buildCheckoutURL("foo/bar", {
      url: "https://github.com",
      externalRepoAuth: undefined,
      apiURL: undefined,
    }),
    "https://github.com/foo/bar"
  );
  t.deepEqual(
    externalQueries.buildCheckoutURL("foo/bar", {
      url: "https://github.example.com/",
      externalRepoAuth: undefined,
      apiURL: undefined,
    }),
    "https://github.example.com/foo/bar"
  );

  t.deepEqual(
    externalQueries.buildCheckoutURL("foo/bar", {
      url: "https://github.com",
      externalRepoAuth: "abc",
      apiURL: undefined,
    }),
    "https://x-access-token:abc@github.com/foo/bar"
  );
  t.deepEqual(
    externalQueries.buildCheckoutURL("foo/bar", {
      url: "https://github.example.com/",
      externalRepoAuth: "abc",
      apiURL: undefined,
    }),
    "https://x-access-token:abc@github.example.com/foo/bar"
  );
});
