# GEO SaaS - End-to-End Test Guide

## Test Scenario: Badminton Racket Analysis

### Input Data
```json
{
  "prompt": "best badminton racket",
  "brand": "Yonex",
  "competitors": ["Li-Ning", "Victor"]
}
```

### Expected Workflow

#### 1. Frontend: User Submits Scan Request
```typescript
// GeoDashboard.tsx - handleRunScan()
const response = await geoAPI.runScan({
  prompt: "best badminton racket",
  brand: "Yonex",
  competitors: ["Li-Ning", "Victor"],
  engines: ["ChatGPT", "Gemini", "Claude"]
});

// Response:
{
  "success": true,
  "data": {
    "promptId": "prompt-uuid-123",
    "runs": [
      { "runId": "run-uuid-1", "engine": "ChatGPT", "status": "QUEUED" },
      { "runId": "run-uuid-2", "engine": "Gemini", "status": "QUEUED" },
      { "runId": "run-uuid-3", "engine": "Claude", "status": "QUEUED" }
    ],
    "message": "Analysis queued for 3 engines"
  }
}
```

#### 2. Backend: Create Prompt & Queue Jobs
```typescript
// geo.controller.ts - runAnalysis()
// 1. Create prompt record in DB
const newPrompt = {
  id: "prompt-uuid-123",
  projectId: "project-uuid",
  query: "best badminton racket",
  language: "en",
  isActive: true
};

// 2. Create run records for each engine
const runs = [
  { id: "run-uuid-1", promptId: "prompt-uuid-123", engineId: "engine-1", status: "PENDING" },
  { id: "run-uuid-2", promptId: "prompt-uuid-123", engineId: "engine-2", status: "PENDING" },
  { id: "run-uuid-3", promptId: "prompt-uuid-123", engineId: "engine-3", status: "PENDING" }
];

// 3. Add jobs to BullMQ queue
// queue.service.ts - addRunPromptJob()
// Jobs added to 'run_prompt' queue with retry logic
```

#### 3. Worker: Process Each Engine
```typescript
// worker/src/jobs/runPrompt.ts - runPromptJob()

// For each run:
// 1. Update status to RUNNING
// 2. Initialize Playwright engine
// 3. Query AI engine with prompt
// 4. Capture response (text + HTML)
// 5. Store Response in database

// Example: ChatGPT Response
const response = {
  id: "response-uuid-1",
  runId: "run-uuid-1",
  responseText: `
    The best badminton rackets depend on your skill level and playing style.
    
    Yonex is a leading manufacturer known for innovation and quality. Their Astrox series
    offers excellent control and power. Yonex rackets are trusted by professional players
    and recommended for serious enthusiasts.
    
    Li-Ning has made significant improvements in recent years. Their rackets are competitive
    in price and performance, though some players prefer Yonex for precision.
    
    Victor is another established brand with good rackets, but Yonex generally leads in
    market share and player satisfaction.
  `,
  responseHtml: "..."
};
```

#### 4. Backend: Parse & Analyze Response
```typescript
// geo.controller.ts - processResults()

// Step 1: Extract Brand Mentions
const extractor = new EntityExtractor();
const { brandMentions, competitorMentions } = extractor.extractBrandMentions(
  responseText,
  "Yonex",
  ["Li-Ning", "Victor"]
);

// Expected brand mentions:
const brandMentions = [
  {
    brand: "Yonex",
    brandNormalized: "yonex",
    type: "DIRECT",
    position: 1,
    paragraphIndex: 1,
    sentenceIndex: 0,
    context: "Yonex is a leading manufacturer...",
    confidence: 1.0,
    sentiment: "NEUTRAL", // Will be updated
    isAuthority: false,
    isFeatured: false
  },
  {
    brand: "Yonex",
    brandNormalized: "yonex",
    type: "DIRECT",
    position: 2,
    paragraphIndex: 1,
    sentenceIndex: 1,
    context: "Their Astrox series offers excellent control...",
    confidence: 1.0,
    sentiment: "NEUTRAL",
    isAuthority: false,
    isFeatured: false
  },
  {
    brand: "Yonex",
    brandNormalized: "yonex",
    type: "DIRECT",
    position: 1,
    paragraphIndex: 1,
    sentenceIndex: 2,
    context: "Yonex rackets are trusted by professional players...",
    confidence: 1.0,
    sentiment: "POSITIVE", // Updated by sentiment analyzer
    isAuthority: true,
    isFeatured: false
  },
  {
    brand: "Yonex",
    brandNormalized: "yonex",
    type: "DIRECT",
    position: 2,
    paragraphIndex: 2,
    sentenceIndex: 0,
    context: "...Yonex generally leads in market share...",
    confidence: 1.0,
    sentiment: "POSITIVE",
    isAuthority: false,
    isFeatured: false
  }
];

// Expected competitor mentions:
const competitorMentions = [
  {
    brand: "Li-Ning",
    brandNormalized: "li-ning",
    type: "DIRECT",
    position: 1,
    paragraphIndex: 2,
    sentenceIndex: 0,
    context: "Li-Ning has made significant improvements...",
    confidence: 1.0,
    sentiment: "NEUTRAL",
    isAuthority: false,
    isFeatured: false
  },
  {
    brand: "Victor",
    brandNormalized: "victor",
    type: "DIRECT",
    position: 1,
    paragraphIndex: 3,
    sentenceIndex: 0,
    context: "Victor is another established brand...",
    confidence: 1.0,
    sentiment: "NEUTRAL",
    isAuthority: false,
    isFeatured: false
  }
];

// Step 2: Analyze Sentiment
const sentimentAnalyzer = new SentimentAnalyzer();
for (const mention of brandMentions) {
  mention.sentiment = sentimentAnalyzer.analyzeSentiment(mention);
}

// Step 3: Analyze Positions
const positionDetector = new MentionPositionDetector();
const positionedBrandMentions = positionDetector.analyzeMentionPositions(
  brandMentions,
  responseText.length
);

// Step 4: Calculate GEO Score
const calculator = new GEOCalculator();
const geoScore = calculator.calculateScore(
  brandMentions,
  competitorMentions,
  responseText.length
);

// Expected GEO Score:
const geoScore = {
  totalScore: 78,
  components: {
    brandPresence: 85,      // 4 mentions, good positions
    authority: 75,          // 1 authority mention, positive sentiment
    competitor: 80,         // 4 brand vs 2 competitor mentions (67% ratio)
    visibility: 70           // 0 featured, 4 paragraphs covered
  },
  details: {
    totalMentions: 4,
    avgPosition: 1.5,
    authorityMentions: 1,
    featuredMentions: 0,
    competitorMentions: 2,
    sentimentScore: 75      // 2 positive, 2 neutral = 75
  },
  engineScores: {}
};
```

#### 5. Frontend: Poll for Results
```typescript
// GeoDashboard.tsx - useEffect polling
// Polls every 2 seconds: GET /api/geo/results/prompt-uuid-123

// After 5-10 seconds, all engines complete:
const response = {
  "success": true,
  "data": {
    "engineResults": [
      {
        "engine": "ChatGPT",
        "engineId": "engine-1",
        "prompt": "best badminton racket",
        "responseText": "...",
        "responseHtml": "...",
        "timestamp": "2026-03-12T17:05:00Z",
        "success": true,
        "error": null
      },
      {
        "engine": "Gemini",
        "engineId": "engine-2",
        "prompt": "best badminton racket",
        "responseText": "...",
        "responseHtml": "...",
        "timestamp": "2026-03-12T17:05:15Z",
        "success": true,
        "error": null
      },
      {
        "engine": "Claude",
        "engineId": "engine-3",
        "prompt": "best badminton racket",
        "responseText": "...",
        "responseHtml": "...",
        "timestamp": "2026-03-12T17:05:20Z",
        "success": true,
        "error": null
      }
    ],
    "geoScore": 78,
    "brandMentions": 12,      // 4 per engine × 3 engines
    "competitorMentions": 6,  // 2 per engine × 3 engines
    "sentiment": "POSITIVE"
  }
}
```

#### 6. Frontend: Display Results
```typescript
// GeoDashboard.tsx - render results
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* GEO Score Gauge: 78 (green) */}
  {/* Brand Mentions: 12 */}
  {/* Competitor Mentions: 6 */}
  {/* Sentiment: POSITIVE */}
</div>

// Engine Results Table
// ChatGPT: ✓ Success
// Gemini: ✓ Success
// Claude: ✓ Success
```

---

## Expected Output Format

```json
{
  "geoScore": 78,
  "brandMentions": 12,
  "competitorMentions": 6,
  "engineResults": [
    {
      "engine": "ChatGPT",
      "success": true,
      "responseText": "..."
    },
    {
      "engine": "Gemini",
      "success": true,
      "responseText": "..."
    },
    {
      "engine": "Claude",
      "success": true,
      "responseText": "..."
    }
  ],
  "sentiment": "POSITIVE"
}
```

---

## Testing Checklist

### Backend Tests
- [x] Brand normalization works correctly
- [x] Competitor detection finds all mentions
- [x] Sentiment analysis classifies correctly
- [x] Position detection calculates accurately
- [x] GEO score calculation is correct
- [x] Database queries work without errors
- [x] Error handling catches failures
- [x] Logging shows processing steps

### Frontend Tests
- [x] Form validation works
- [x] API request sends correct data
- [x] Polling mechanism starts after scan
- [x] Status updates display correctly
- [x] Results render when ready
- [x] Error messages show on failure
- [x] Loading state prevents duplicate submissions

### Integration Tests
- [x] End-to-end workflow completes
- [x] Data flows correctly through all layers
- [x] No race conditions occur
- [x] Async operations complete properly
- [x] Database transactions are consistent

---

## Debugging Tips

### If Brand Mentions = 0
1. Check brand normalization in EntityExtractor
2. Verify response text contains brand name
3. Check sentence splitting logic
4. Enable logging to see extraction steps

### If GEO Score is Wrong
1. Verify mention counts are correct
2. Check component weight calculations
3. Validate sentiment scoring
4. Review position calculation formula

### If Frontend Shows "NO_COMPLETED_RUNS"
1. Check worker is processing jobs
2. Verify database updates are working
3. Check run status transitions
4. Review error logs in worker

### If Polling Never Completes
1. Check polling interval (should be 2s)
2. Verify API endpoint exists
3. Check authentication token
4. Review network requests in DevTools
