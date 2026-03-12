# GEO Product Specification vs. Implementation Analysis

## Executive Summary

The GEO SaaS platform has a solid foundation with many core features implemented, but there are **critical gaps** in key areas like content gap analysis, advanced benchmarking, and multi-model tracking enhancements. This analysis identifies missing components and proposes a detailed implementation roadmap **without modifying any code**.

---

## 1. Specification Requirements vs. Implementation Status

### IMPLEMENTED FEATURES ✅

| Feature | Status | Evidence |
|---------|--------|----------|
| **Multi-model Tracking** | ✅ Partial | AIEngine table, runs table, multiple engines supported (ChatGPT, Claude, Gemini, Perplexity, SearchGPT) |
| **Share of Model (SoM)** | ✅ Complete | Dedicated `som.controller.ts` with bucket aggregation, brand mention calculation, historical tracking |
| **Citation Tracking** | ✅ Complete | Citations table with source type classification (OWN, COMPETITOR, THIRD_PARTY), URL validation, position tracking |
| **Sentiment Analysis** | ✅ Complete | ResponseAnalysis table, sentiment scores (POSITIVE/NEUTRAL/NEGATIVE), narrative tag extraction |
| **Historical Data** | ✅ Partial | ScanSchedule table for daily/weekly scans, historical result storage |
| **Project Management** | ✅ Complete | Full CRUD for projects, prompts, competitors, engines |
| **Authentication** | ✅ Complete | JWT-based auth, user registration/login |
| **Dashboard** | ✅ Complete | Results aggregation, competitor comparison visualization |

### MISSING / INCOMPLETE FEATURES ❌

| Feature | Gap | Severity |
|---------|-----|----------|
| **Content Gap Analysis** | No website content crawler, no structured content recommendations (tables, schema markup, FAQs) | 🔴 HIGH |
| **Content Quality Assessment** | Missing metrics for content structure suitability for LLM extraction | 🔴 HIGH |
| **Advanced Benchmarking UI** | ScanSchedule exists but frontend lacks schedule management interface | 🟡 MEDIUM |
| **Real-time Alerts** | Alert table exists but triggering logic not fully implemented | 🟡 MEDIUM |
| **Competitive Benchmarking** | Limited historical trend comparison between own brand and competitors | 🟡 MEDIUM |
| **Content Recommendations Engine** | Recommendation table exists but generation logic incomplete | 🟡 MEDIUM |
| **LLM Extraction Optimization** | No guidance on improving content for AI consumption | 🔴 HIGH |
| **Brand Narrative Tracking** | Narrative tags extracted but not actionable insights provided | 🟡 MEDIUM |
| **Multi-Language Content Analysis** | Only extraction, no cross-language comparison | 🟡 MEDIUM |

---

## 2. Detailed Gap Analysis

### 2.1 Content Gap Analysis (CRITICAL MISSING)

**Specification Requirement:**
> "Compare website content against sources AI prefers... The system should suggest: structured tables, bullet lists, schema markup, FAQ blocks"

**Current State:**
- ❌ No website crawler implemented
- ❌ No content analysis service
- ❌ No schema markup detection
- ❌ No content quality scoring
- ❌ No structured data recommendations

**Missing Components:**
1. **WebContentCrawler** - Extract and analyze website content
2. **ContentAnalyzer** - Assess content structure quality
3. **StructuredDataDetector** - Check for JSON-LD, schema.org, microdata
4. **ContentRecommendationEngine** - Generate specific improvements
5. **ContentGapService** - Compare company content vs. AI-preferred sources

**Database Tables Needed:**
```
ContentAnalysis table:
  - id, projectId, url
  - hasStructuredData, hasSchemaMarkup
  - hasTableContent, hasFAQSection, hasBulletLists
  - contentScore, recommendationScore
  - analyzedAt

ContentRecommendation table enhancements:
  - Add URL field for specific page recommendations
  - Add implementation_guide for actionable steps
  - Add category field (SCHEMA_MARKUP, STRUCTURED_TABLE, FAQ_SECTION, etc)
```

---

### 2.2 Advanced Benchmarking (PARTIAL)

**Specification Requirement:**
> "Track changes over time... Measure how AI perception changes after content updates"

**Current State:**
- ✅ ScanSchedule table exists with DAILY/WEEKLY frequency
- ❌ Frontend schedule management missing
- ❌ Automated schedule execution not implemented (no cron trigger)
- ❌ Pre/post content update comparison missing
- ❌ Trend analysis dashboard missing
- ❌ Historical snapshot tracking incomplete

**Missing Components:**
1. **ScheduleManagerUI** - Frontend to create/edit/delete schedules
2. **ScheduleExecutor Service** - Cron-like execution of scheduled scans
3. **TrendAnalysisService** - Calculate growth/decline metrics over time
4. **BenchmarkSnapshotService** - Capture daily/weekly state snapshots
5. **HistoricalComparisonUI** - Visualize changes after content updates

**Database Tables Needed:**
```
BenchmarkSnapshot table:
  - id, projectId, snapshotDate
  - som (Share of Model %), sentimentScore
  - citationCount, brandMentionCount
  - createdAt

Tracks baseline metrics at regular intervals for comparison
```

---

### 2.3 Alert System (PARTIAL)

**Specification Requirement:**
> "Alert if: AI mentions brand but links to competitor"

**Current State:**
- ✅ Alert table exists with AlertStatus enum (OPEN, ACKNOWLEDGED, RESOLVED)
- ✅ AlertSeverity enum (LOW, MEDIUM, HIGH) exists
- ❌ Alert triggering logic not implemented
- ❌ Alert rules not configurable by users
- ❌ Alert notification system missing (email/webhook)
- ❌ Alert dashboard UI missing in frontend

**Missing Components:**
1. **AlertRuleEngine** - Define and execute custom alert rules
2. **AlertTriggerService** - Monitor citations for alert conditions
3. **NotificationService** - Email/webhook delivery
4. **AlertConfigUI** - Frontend for managing alert rules
5. **AlertDashboardUI** - View and manage triggered alerts

**Example Alert Rules to Support:**
- Brand mentioned but links to competitor
- Sentiment score dropped below threshold
- Citation from AI model missing
- Negative sentiment on specific keywords

---

### 2.4 Recommendation Generation (PARTIAL)

**Specification Requirement:**
> "The system should suggest: structured tables, bullet lists, schema markup, FAQ blocks"

**Current State:**
- ✅ Recommendation table exists with fields for type, priority, status
- ✅ Basic recommendation CRUD operations
- ❌ Recommendation generation logic incomplete
- ❌ Evidence linking to citation data missing
- ❌ Priority scoring algorithm not implemented
- ❌ Frontend recommendations dashboard missing

**Missing Components:**
1. **RecommendationGenerator Service** - Auto-generate based on gaps
2. **RecommendationPrioritizer** - Score by impact/effort/feasibility
3. **EvidenceLinkerService** - Connect recommendations to specific citations
4. **RecommendationTracker** - Track implementation status
5. **RecommendationsUI** - Display with evidence and guidance

**Example Recommendations to Generate:**
- "Add FAQ section for 'AI Automation' - 3 AI responses mention this but have no FAQ data"
- "Implement schema.org markup on product pages - Competitors have JSON-LD, you don't"
- "Create structured comparison tables - Gemini prefers formatted data"

---

### 2.5 Competitive Benchmarking (PARTIAL)

**Specification Requirement:**
> "Compare how different AI models describe the brand... Compare against competitors"

**Current State:**
- ✅ Competitor table and tracking exists
- ✅ SoM calculation includes competitor mentions
- ❌ Deep competitive sentiment analysis missing
- ❌ Competitor content gap analysis missing
- ❌ Win/loss analysis missing (areas where we beat competitors)
- ❌ Competitive recommendations missing
- ❌ Historical competitor comparison missing

**Missing Components:**
1. **CompetitiveAnalysisService** - Compare sentiment, citations, narratives
2. **GapIdentificationService** - Find features/content competitors have
3. **StrengthHighlightService** - Identify competitive advantages
4. **HistoricalComparisonService** - Track competitor movements
5. **CompetitiveBenchmarkingUI** - Charts and detailed breakdowns

**Missing Metrics:**
- Sentiment comparison by AI model per competitor
- Citation quality comparison (own vs competitor links)
- Narrative positioning differences
- Growth/decline rate comparison

---

### 2.6 Worker Job Gaps

**Current State:**
- ✅ BullMQ job queue implemented
- ✅ `run_prompt` job processor exists for querying AI models
- ❌ Content analysis job missing
- ❌ Recommendation generation job missing
- ❌ Scheduled scan job not hooked to actual execution
- ❌ Benchmark snapshot job missing
- ❌ Alert evaluation job missing

**Missing Job Types:**
```
Jobs needed in worker:
1. analyze_content - Crawl website and assess structure
2. generate_recommendations - Create actionable recommendations
3. execute_schedule - Run scheduled scans at configured times
4. snapshot_benchmark - Capture daily/weekly metrics
5. evaluate_alerts - Check alert conditions on new data
6. analyze_competitive - Deep analysis of competitor data
```

---

### 2.7 Frontend Component Gaps

**Current Pages (11 files):**
- App.tsx, Layout.tsx, Login.tsx, Register.tsx, Dashboard.tsx, ProjectDetail.tsx

**Current State:**
- ✅ Dashboard shows projects and metrics
- ✅ ProjectDetail shows overview, rankings, prompts, competitors
- ❌ Missing content analysis UI
- ❌ Missing recommendations dashboard
- ❌ Missing schedule manager (CRUD for scans)
- ❌ Missing alert rules configuration
- ❌ Missing competitive benchmark details
- ❌ Missing trend visualization
- ❌ Missing content quality scoring display

**Missing Components to Build:**
1. **ContentGapAnalysis.tsx** - Show website content vs AI preferences
2. **RecommendationsDashboard.tsx** - View, prioritize, track recommendations
3. **ScheduleManager.tsx** - Create/edit/manage automated scans
4. **AlertRulesConfig.tsx** - Configure alert conditions
5. **BenchmarkTrends.tsx** - Historical trend visualization
6. **CompetitiveAnalysisDashboard.tsx** - Detailed competitive breakdown

---

### 2.8 API Endpoint Gaps

**Existing Endpoints (from routes):**
- Authentication (3 endpoints)
- Projects CRUD (6 endpoints)
- Prompts CRUD (3 endpoints)
- Competitors CRUD (3 endpoints)
- Engines (1 endpoint)
- Results & History (3 endpoints)
- Citations (2 endpoints)
- SoM (1 endpoint)
- Sentiment Analysis (2 endpoints)
- Alerts CRUD (5 endpoints)
- Recommendations CRUD (5 endpoints)
- Schedules CRUD (4 endpoints)
- Dashboard table (1 endpoint)

**Missing API Endpoints:**

Content Analysis:
```
GET  /api/projects/:projectId/content/analysis
POST /api/projects/:projectId/content/analyze (trigger)
GET  /api/projects/:projectId/content/recommendations
PUT  /api/projects/:projectId/content/recommendations/:id
```

Benchmarking:
```
GET  /api/projects/:projectId/benchmarks/snapshot/:date
GET  /api/projects/:projectId/benchmarks/trends
GET  /api/projects/:projectId/benchmarks/comparison
POST /api/projects/:projectId/benchmarks/export
```

Competitive Analysis:
```
GET  /api/projects/:projectId/competitors/:id/analysis
GET  /api/projects/:projectId/competitive-insights
```

---

## 3. Database Schema Additions Required

### New Tables

```sql
-- Content Analysis Results
ContentAnalysis (
  id UUID PRIMARY KEY
  projectId UUID (FK Project)
  url VARCHAR
  hasStructuredData BOOLEAN
  hasSchemaMarkup BOOLEAN
  hasTableContent BOOLEAN
  hasFAQSection BOOLEAN
  hasBulletLists BOOLEAN
  contentScore DECIMAL(5,2) -- 0-100
  recommendationScore DECIMAL(5,2)
  analyzedAt TIMESTAMP
  createdAt TIMESTAMP
)

-- Enhanced Recommendations (extend existing table)
Recommendation (
  ... existing fields ...
  url VARCHAR -- specific page URL
  category VARCHAR -- SCHEMA_MARKUP, FAQ, TABLE, LIST, etc
  implementationGuide TEXT
  estimatedImpact DECIMAL(5,2) -- 0-100
  sourceType VARCHAR -- CONTENT_GAP, SENTIMENT, CITATION, COMPETITIVE
)

-- Benchmark Snapshots for Historical Tracking
BenchmarkSnapshot (
  id UUID PRIMARY KEY
  projectId UUID (FK Project)
  snapshotDate DATE
  som DECIMAL(5,2) -- Share of Model %
  sentimentScore DECIMAL(5,2) -- avg -1 to 1
  citationCount INT
  brandMentionCount INT
  competitorMentionCount INT
  createdAt TIMESTAMP
)

-- Alert Rules Configuration
AlertRule (
  id UUID PRIMARY KEY
  projectId UUID (FK Project)
  name VARCHAR
  description TEXT
  condition JSON -- flexible rule definition
  severity VARCHAR (LOW, MEDIUM, HIGH)
  isActive BOOLEAN
  createdAt TIMESTAMP
  updatedAt TIMESTAMP
)

-- Competitive Analysis Cache
CompetitiveInsight (
  id UUID PRIMARY KEY
  projectId UUID (FK Project)
  competitorId UUID (FK Competitor)
  metricType VARCHAR -- SENTIMENT, CITATION_QUALITY, NARRATIVE, SOM
  ourValue DECIMAL(10,2)
  competitorValue DECIMAL(10,2)
  gap DECIMAL(10,2) -- negative = we're behind
  createdAt TIMESTAMP
)
```

---

## 4. Implementation Roadmap

### Phase 1: Content Gap Analysis Foundation (Weeks 1-2) 🔴 CRITICAL

**Objective:** Implement website content crawling and basic quality assessment

**Tasks:**
- [ ] Add ContentAnalysis table to schema
- [ ] Implement WebContentCrawler service (Puppeteer)
  - Crawl website domain for all pages
  - Extract metadata, structure, content
  - Detect JSON-LD, schema.org, microdata
- [ ] Implement ContentAnalyzer service
  - Score content for AI extraction suitability
  - Detect tables, lists, FAQ blocks
  - Generate content quality metrics
- [ ] Create backend API endpoints:
  - `POST /api/projects/:projectId/content/analyze`
  - `GET /api/projects/:projectId/content/analysis`
  - `GET /api/projects/:projectId/content/recommendations`
- [ ] Add AnalyzeContentJob to worker
- [ ] Add frontend ContentGapAnalysis page (basic)

**Deliverable:**
- Content analysis shows website structure quality score
- List of structural recommendations (missing schema, FAQ, etc)

**Effort:** 80-100 hours

---

### Phase 2: Recommendation Engine & Backend APIs (Weeks 3-4) 🔴 CRITICAL

**Objective:** Generate actionable recommendations based on gaps and data

**Tasks:**
- [ ] Implement RecommendationGenerator service
  - Analyze gaps between own content and competitor content
  - Link recommendations to specific citation evidence
  - Prioritize by impact/feasibility
- [ ] Enhance Recommendation table:
  - Add URL, category, implementation_guide fields
  - Add evidence linking
- [ ] Create backend API endpoints:
  - `GET /api/projects/:projectId/recommendations` (with filtering)
  - `PUT /api/projects/:projectId/recommendations/:id/status`
  - `DELETE /api/projects/:projectId/recommendations/:id`
- [ ] Add GenerateRecommendationsJob to worker
- [ ] Implement RecommendationPrioritizer algorithm
- [ ] Build frontend RecommendationsDashboard page

**Deliverable:**
- Auto-generated recommendations with priority scores
- Recommendations dashboard showing implementation status
- Evidence linking recommendations to citations

**Effort:** 60-80 hours

---

### Phase 3: Advanced Benchmarking & Trends (Weeks 5-6) 🟡 MEDIUM

**Objective:** Enable time-series tracking and trend analysis

**Tasks:**
- [ ] Add BenchmarkSnapshot table
- [ ] Implement BenchmarkSnapshotService
  - Daily/weekly snapshot of key metrics (SoM, sentiment, citations)
- [ ] Add SnapshotBenchmarkJob to worker
  - Hook into schedule execution
- [ ] Create trend analysis API endpoints:
  - `GET /api/projects/:projectId/benchmarks/snapshot/:date`
  - `GET /api/projects/:projectId/benchmarks/trends`
  - `GET /api/projects/:projectId/benchmarks/comparison`
- [ ] Build ScheduleManager frontend component
  - CRUD for ScanSchedule
  - Display execution history
- [ ] Build BenchmarkTrends frontend component
  - Line charts showing SoM/sentiment over time
  - Compare before/after content updates
  - Competitor comparison

**Deliverable:**
- Automated daily/weekly scans
- Historical trend charts
- Pre/post update comparison

**Effort:** 70-90 hours

---

### Phase 4: Alert System & Notifications (Weeks 7-8) 🟡 MEDIUM

**Objective:** Implement proactive monitoring with alerts

**Tasks:**
- [ ] Add AlertRule table
- [ ] Implement AlertRuleEngine service
  - Define rule types (brand mention + competitor link, low sentiment, etc)
  - Execute rules against new data
- [ ] Implement AlertTriggerService
  - Monitor runs for alert conditions
  - Create Alert records when triggered
- [ ] Implement NotificationService
  - Email notifications
  - Webhook support (optional)
- [ ] Create alert management API endpoints:
  - `GET /api/projects/:projectId/alert-rules`
  - `POST /api/projects/:projectId/alert-rules`
  - `PUT /api/projects/:projectId/alert-rules/:id`
  - `DELETE /api/projects/:projectId/alert-rules/:id`
- [ ] Add EvaluateAlertsJob to worker
- [ ] Build AlertRulesConfig frontend component
- [ ] Build AlertDashboard component (view triggered alerts)

**Deliverable:**
- Configurable alert rules
- Email notifications for critical alerts
- Alert dashboard

**Effort:** 60-80 hours

---

### Phase 5: Competitive Analysis (Weeks 9-10) 🟡 MEDIUM

**Objective:** Deep competitive benchmarking

**Tasks:**
- [ ] Add CompetitiveInsight table
- [ ] Implement CompetitiveAnalysisService
  - Sentiment comparison vs competitors
  - Citation quality comparison
  - Narrative positioning analysis
  - Historical tracking of competitor movements
- [ ] Implement GapIdentificationService
  - Identify where competitors beat us
  - Analyze competitor content strategies
- [ ] Create competitive analysis API endpoints:
  - `GET /api/projects/:projectId/competitors/:id/analysis`
  - `GET /api/projects/:projectId/competitive-insights`
  - `GET /api/projects/:projectId/competitive-benchmarks`
- [ ] Add CompetitiveAnalysisJob to worker
- [ ] Build CompetitiveBenchmarkingUI component
  - Sentiment heatmaps
  - Citation quality comparison
  - Narrative positioning charts
  - Win/loss analysis

**Deliverable:**
- Detailed competitive benchmarking dashboard
- Actionable competitive recommendations
- Historical competitor tracking

**Effort:** 70-90 hours

---

### Phase 6: Frontend Enhancements & Polish (Weeks 11-12) 🟢 LOW

**Objective:** Complete UI/UX and performance optimization

**Tasks:**
- [ ] Add content quality scoring visualization to ProjectDetail
- [ ] Enhance dashboard with trend indicators
- [ ] Add export functionality (PDF reports)
- [ ] Implement caching for analysis results
- [ ] Optimize crawler performance
  - Rate limiting
  - Batch processing
- [ ] Add loading states and error handling
- [ ] Performance testing and optimization
- [ ] User onboarding for new features

**Deliverable:**
- Polished UI across all new features
- Performance optimized
- Ready for production

**Effort:** 60-80 hours

---

## 5. Technology & Architecture Recommendations

### Services to Add

**ContentAnalysisService**
- Uses Puppeteer for crawling
- Integrates with Claude API for content quality assessment
- Detects structured data (JSON-LD, schema.org)
- Returns content quality score (0-100)

**RecommendationGenerator**
- Analyzes gaps between metrics and citations
- Uses Claude API for generating human-readable recommendations
- Links to specific evidence
- Scores by impact and effort

**BenchmarkSnapshotService**
- Runs on schedule
- Aggregates metrics from responses, citations, sentiment analysis
- Creates historical record for trends

**AlertRuleEngine**
- Evaluates JSON rule definitions against data
- Supports multiple condition types
- Scales to 100+ alerts per project

### Tool Integration

**Existing:**
- Puppeteer (already in worker) ✅
- BullMQ (job queue) ✅
- Claude API (already in backend) ✅

**Recommended:**
- **OpenAI** - Use GPT-4 Vision for advanced content quality assessment
- **Cheerio** - Lightweight HTML parsing for schema detection
- **node-cron** - Schedule execution (or use BullMQ scheduler)

---

## 6. Data Flow Diagrams

### Content Gap Analysis Flow
```
Website URL
    ↓
WebContentCrawler (Puppeteer)
    ↓
Extract: HTML, structure, metadata, links
    ↓
StructuredDataDetector
    ├→ Check for JSON-LD
    ├→ Check for schema.org
    ├→ Check for microdata
    ↓
ContentAnalyzer (Claude API)
    ├→ Assess structure quality
    ├→ Identify content types (table, list, FAQ, etc)
    ↓
ContentAnalysis record
    ↓
RecommendationGenerator
    ├→ Link to citation data
    ├→ Compare with competitor content
    ↓
Recommendation records
    ↓
Frontend Display
```

### Alert Triggering Flow
```
New Citation/Response
    ↓
AlertTriggerService
    ↓
Query AlertRules for project
    ↓
For each rule: Evaluate condition
    ├→ IF brand mentioned AND competitor link → TRIGGER
    ├→ IF sentiment < threshold → TRIGGER
    ├→ IF missing on engine X → TRIGGER
    ↓
Create Alert record
    ↓
NotificationService
    ├→ Send email
    ├→ Send webhook
    ↓
Alert appears in dashboard
```

---

## 7. Risk Assessment & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|-----------|
| Website crawler timeout/failure | Partial data loss | Medium | Implement retry logic, timeout handling, fallbacks |
| Content analysis accuracy | Poor recommendations | Medium | Use Claude API, manual validation, user feedback loop |
| Alert rule complexity explosion | Maintenance burden | Medium | Simple rule format, pre-built templates, testing framework |
| Database performance at scale | Slow queries | Low | Proper indexing, archival strategy, read replicas |
| False positive alerts | Alert fatigue | Medium | Tunable thresholds, noise filtering, confidence scoring |
| Job processing bottleneck | Delayed results | Low | Scale worker concurrency, optimize queries, caching |

---

## 8. Success Metrics

Track these KPIs after implementation:

**Content Analysis:**
- % of users who view content recommendations
- % of recommended actions implemented
- Average content quality score
- Content quality improvement over time

**Benchmarking:**
- # of scheduled scans executed successfully
- % of projects with historical trend data
- Accuracy of trend predictions

**Alerts:**
- # of alerts triggered per project
- Alert response rate (% acknowledged)
- False positive rate
- Time to resolution

**Recommendations:**
- # of recommendations per project (average)
- Implementation rate
- Impact of implemented recommendations

**Competitive:**
- % of projects tracking competitors
- Engagement with competitive insights
- Actionability of competitive recommendations

---

## 9. Summary Table

| Component | Type | Priority | Status | Est. Hours | Phase |
|-----------|------|----------|--------|-----------|-------|
| Content Crawler | Service | CRITICAL | ❌ Missing | 30 | 1 |
| Content Analyzer | Service | CRITICAL | ❌ Missing | 25 | 1 |
| Recommendation Generator | Service | CRITICAL | ❌ Missing | 35 | 2 |
| Benchmark Snapshot | Service | HIGH | ❌ Missing | 20 | 3 |
| Schedule Executor | Service | HIGH | ❌ Missing | 25 | 3 |
| Alert Rule Engine | Service | HIGH | ❌ Missing | 30 | 4 |
| Competitive Analysis | Service | MEDIUM | ❌ Missing | 35 | 5 |
| Content Gap UI | Component | CRITICAL | ❌ Missing | 25 | 1 |
| Recommendations Dashboard | Component | CRITICAL | ❌ Missing | 30 | 2 |
| Schedule Manager | Component | HIGH | ❌ Missing | 20 | 3 |
| Alert Rules Config | Component | HIGH | ❌ Missing | 25 | 4 |
| Benchmark Trends | Component | MEDIUM | ❌ Missing | 30 | 3 |
| Competitive Dashboard | Component | MEDIUM | ❌ Missing | 35 | 5 |
| API Endpoints | Backend | HIGH | ⚠️ Partial | 40 | Multiple |
| Worker Jobs | Processing | CRITICAL | ⚠️ Partial | 50 | Multiple |
| **TOTAL** | | | | **465-535 hours** | **12 weeks** |

---

## 10. File Structure for New Components

```
backend/src/
├── services/
│   ├── contentAnalyzer.service.ts (NEW)
│   ├── recommendationGenerator.service.ts (NEW)
│   ├── benchmarkSnapshot.service.ts (NEW)
│   ├── alertRuleEngine.service.ts (NEW)
│   ├── competitiveAnalysis.service.ts (NEW)
│   ├── webContentCrawler.service.ts (NEW)
│   └── notification.service.ts (NEW)
├── controllers/
│   ├── contentAnalysis.controller.ts (NEW)
│   ├── benchmark.controller.ts (NEW)
│   ├── alertRules.controller.ts (ENHANCE)
│   └── competitiveInsights.controller.ts (NEW)
├── routes/
│   ├── contentAnalysis.routes.ts (NEW)
│   ├── benchmark.routes.ts (NEW)
│   ├── alertRules.routes.ts (NEW)
│   └── competitiveInsights.routes.ts (NEW)

worker/src/
├── jobs/
│   ├── analyzeContent.ts (NEW)
│   ├── generateRecommendations.ts (NEW)
│   ├── snapshotBenchmark.ts (NEW)
│   ├── executeSchedule.ts (NEW)
│   └── evaluateAlerts.ts (NEW)

frontend/src/
├── pages/
│   ├── ContentGapAnalysis.tsx (NEW)
│   ├── RecommendationsDashboard.tsx (NEW)
│   ├── ScheduleManager.tsx (NEW)
│   ├── AlertRulesConfig.tsx (NEW)
│   ├── BenchmarkTrends.tsx (NEW)
│   └── CompetitiveAnalysis.tsx (NEW)
├── components/
│   ├── ContentQualityScore.tsx (NEW)
│   ├── RecommendationCard.tsx (NEW)
│   ├── TrendChart.tsx (NEW)
│   └── AlertPanel.tsx (NEW)
```

---

## 11. Next Steps

1. **Review this analysis** with product team
2. **Prioritize phases** based on business needs
3. **Allocate resources** for implementation
4. **Create detailed task breakdown** for Phase 1
5. **Set up development environment** with database migrations
6. **Begin Phase 1 implementation** (Content Gap Analysis)

This roadmap provides a complete path to full specification compliance while maintaining code quality and performance.
