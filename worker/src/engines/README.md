# AI Chat Engines - Improved Architecture

## Overview

This directory contains a refactored, robust Playwright-based automation system for interacting with multiple AI chat platforms:
- **ChatGPT** (OpenAI)
- **Gemini** (Google)
- **Claude** (Anthropic)

## Architecture

```
engines/
├── IEngine.ts           # Interface definition
├── EngineBase.ts        # Abstract base class with common functionality
├── EngineFactory.ts     # Factory for creating engine instances
├── ChatGPTEngine.ts     # ChatGPT-specific implementation
├── GeminiEngine.ts      # Gemini-specific implementation
├── ClaudeEngine.ts      # Claude-specific implementation
└── baseEngine.ts        # Legacy implementation (deprecated)
```

## Key Improvements

### 1. Separation of Concerns
- Each AI platform has its own engine class
- Common functionality is in `EngineBase`
- Platform-specific logic is isolated in engine implementations

### 2. Robust Selectors
- Uses `data-testid` attributes when available (most stable)
- Falls back to role-based selectors
- Multiple fallback selectors for reliability
- Dynamic DOM search as last resort

### 3. Engine-Specific Behaviors
- **ChatGPT**: Uses Enter key to submit, contenteditable input
- **Gemini**: Uses submit button, textarea input
- **Claude**: Uses Enter key, contenteditable input

### 4. Persistent Sessions
- Login sessions are stored in `chrome-profile/<engine>/`
- Sessions persist across runs
- No need to re-login frequently

## Usage

### Running the Worker

The worker automatically uses the new engine architecture:

```bash
cd worker
npm run dev
```

### Login Scripts

Before running the worker, login to each platform:

```bash
# ChatGPT
npm run login:chatgpt

# Gemini
npm run login:gemini

# Claude
npm run login:claude
```

Each login script will:
1. Open Chrome with a persistent profile
2. Navigate to the platform
3. Wait for you to login manually
4. Save the session for future use

### Programmatic Usage

```typescript
import { getEngine } from "./engines/EngineFactory.js";

// Create an engine instance
const engine = getEngine("ChatGPT");

// Initialize (sets up browser context)
await engine.initialize();

// Run a query
const result = await engine.query("Hello, how are you?");

console.log(result.text);  // Plain text response
console.log(result.html);  // HTML response

// Clean up
await engine.cleanup();
```

## Engine Options

Each engine can be configured with options:

```typescript
const options: EngineOptions = {
  pageLoadWait: 3000,       // Wait after page load (ms)
  submitWait: 1000,         // Wait after submit (ms)
  maxResponseWait: 90000,   // Max wait for response (ms)
  useEnterToSubmit: true,   // Use Enter key to submit
  useSubmitButton: false,   // Click submit button instead
};
```

## Selector Strategy

### Priority Order
1. **data-testid attributes** - Most stable, recommended
2. **Role-based selectors** - Semantic and reliable
3. **Class-based selectors** - As fallback
4. **DOM search** - Last resort

### Example: ChatGPT Input Selectors

```typescript
input: [
  // Primary: data-testid
  'div[data-testid="prompt-textarea"]',
  // Fallback: role-based
  'div[contenteditable="true"][role="textbox"]',
  // Legacy
  'div[contenteditable="true"][data-id="root"]',
]
```

## Troubleshooting

### Login Issues
- Run the login script again
- Clear the profile directory: `rm -rf chrome-profile/<engine>/`
- Check for CAPTCHA prompts

### Input Field Not Found
- The page might have changed
- Check browser console for selector errors
- Add fallback selectors to the engine

### Response Not Found
- Check if the response selector is correct
- The page might still be loading
- Increase `maxResponseWait` option

### Session Expired
- Run the login script again
- Sessions typically last days to weeks

## Adding a New Engine

1. Create a new engine class extending `EngineBase`:

```typescript
import { EngineBase } from "./EngineBase.js";
import { EngineConfig, EngineSelectors, EngineOptions } from "./IEngine.js";

class MyEngine extends EngineBase {
  constructor() {
    super(
      { name: "MyEngine", url: "https://example.com", baseUrl: "example.com" },
      { input: [...], response: [...], ... },
      { ...options }
    );
  }
}
```

2. Add to `EngineFactory.ts`:

```typescript
case "myengine":
  return new MyEngine();
```

3. Create a login script in `src/scripts/`

## Migration from Legacy

The old `baseEngine.ts` is still available for backward compatibility. To migrate:

1. Update imports:
   ```typescript
   // Old
   import { getEngine } from "./engines/baseEngine.js";
   // New
   import { getEngine } from "./engines/EngineFactory.js";
   ```

2. The API remains the same, so no code changes needed

3. The new engines are more reliable and maintainable

## Notes

- All engines use persistent Chrome profiles for session storage
- Headless mode can be enabled in `browserPool.ts` (set `headless: true`)
- Stealth plugins are enabled via `browserPool.ts`
- CAPTCHA detection is built-in with manual resolution fallback