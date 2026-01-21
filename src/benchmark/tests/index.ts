/**
 * Test Loader Module
 *
 * Loads comprehensive end-to-end test cases from each MCP server folder.
 * Each test simulates real user prompts to Claude Code CLI.
 */

/**
 * E2E Test Case interface.
 */
export interface E2ETestCase {
  id: string;
  /** The exact command/prompt a user would give to Claude Code CLI */
  userPrompt: string;
  /** The tool(s) that should be found and used */
  expectedTools: string[];
  /** MCP server this test covers */
  mcpServer: string;
  /** Description of what this tests */
  description: string;
  /** Prompt length category */
  promptType: "short" | "medium" | "long";
  /** Whether this is a primary test (one per MCP for quick mode) */
  isPrimary?: boolean;
}

/**
 * Map of MCP server names to their test module paths.
 */
const TEST_MODULE_PATHS: Record<string, string> = {
  playwright: "./playwright",
  plane: "./plane",
  context7: "./context7",
  markitdown: "./markitdown",
  minimax: "./minimax",
};

/**
 * Load all tests for specified MCP servers.
 */
export async function loadAllTests(
  mcpServers: string[]
): Promise<E2ETestCase[]> {
  const allTests: E2ETestCase[] = [];

  for (const serverName of mcpServers) {
    const normalized = serverName.toLowerCase();
    const testPath = TEST_MODULE_PATHS[normalized];

    if (testPath) {
      try {
        const testModule = await import(testPath + "/index.ts");
        if (testModule && typeof testModule === "object") {
          const testKeys = Object.keys(testModule).filter(
            (key) =>
              key.startsWith("test") &&
              testModule[key as keyof typeof testModule] !== null
          );

          for (const key of testKeys) {
            const testExport = testModule[key as keyof typeof testModule] as
              | E2ETestCase
              | { default?: E2ETestCase };

            // Check if it's directly the test or has a default export
            if ("id" in testExport && "expectedTools" in testExport) {
              allTests.push(testExport as E2ETestCase);
            } else if ("default" in testExport && testExport.default) {
              allTests.push(testExport.default);
            }
          }

          console.log(`  Loaded ${testKeys.length} tests for ${serverName}`);
        }
      } catch (error) {
        console.warn(
          `  Warning: Could not load tests for ${serverName}: ${error}`
        );
      }
    }
  }

  return allTests;
}

/**
 * Load primary tests only (one per MCP server for quick mode).
 */
export async function loadPrimaryTests(
  mcpServers: string[]
): Promise<E2ETestCase[]> {
  const allTests = await loadAllTests(mcpServers);
  return allTests.filter((t) => t.isPrimary === true);
}

/**
 * Get list of available test modules.
 */
export function getAvailableTestModules(): string[] {
  return Object.keys(TEST_MODULE_PATHS);
}

// Legacy exports for backward compatibility
export interface TestCase {
  id: string;
  query: string;
  expectedTools: string[];
  description: string;
}

export async function loadPrePreparedTests(
  mcpServers: string[]
): Promise<TestCase[]> {
  const e2eTests = await loadAllTests(mcpServers);
  return e2eTests.map((t) => ({
    id: t.id,
    query: t.userPrompt,
    expectedTools: t.expectedTools,
    description: t.description,
  }));
}

export function generateDynamicTests(
  serverName: string,
  tools: Array<{ name: string; description: string }>
): TestCase[] {
  const tests: TestCase[] = [];
  let testId = 1;

  for (const tool of tools.slice(0, 5)) {
    const query =
      tool.description?.slice(0, 50) || tool.name.replace(/_/g, " ");
    tests.push({
      id: `${serverName}-dynamic-${String(testId).padStart(3, "0")}`,
      query,
      expectedTools: [tool.name],
      description: `Auto-generated test for ${tool.name}`,
    });
    testId++;
  }

  return tests;
}

export default {
  loadAllTests,
  loadPrimaryTests,
  getAvailableTestModules,
  loadPrePreparedTests,
  generateDynamicTests,
};
