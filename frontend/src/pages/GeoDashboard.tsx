import React, { useState, useEffect } from 'react';
import { QueryInput } from '../components/geo/QueryInput';
import { EngineSelector } from '../components/geo/EngineSelector';
import { GEOScoreGauge } from '../components/geo/GEOScoreGauge';
import { geoAPI } from '../services/api';

interface ScanResult {
  engineResults: Array<{
    engine: string;
    responseText: string;
    success: boolean;
  }>;
  geoScore: number;
  brandMentions: number;
  competitorMentions: number;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
}

interface ScanStatus {
  promptId: string;
  runs: Array<{
    runId: string;
    engine: string;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  }>;
}

export const GeoDashboard: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [brand, setBrand] = useState('');
  const [competitors, setCompetitors] = useState('');
  const [selectedEngines, setSelectedEngines] = useState<string[]>(['ChatGPT', 'Gemini', 'Claude']);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);
  const pollingIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingCountRef = React.useRef<number>(0);
  const MAX_POLLING_ATTEMPTS = 60; // Max 5 minutes with 5s interval
  const POLLING_INTERVAL = 5000; // Poll every 5 seconds

  // Poll for job status
  useEffect(() => {
    if (!scanStatus) {
      // Clean up interval when scan completes
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      pollingCountRef.current = 0;
      return;
    }

    const poll = async () => {
      try {
        pollingCountRef.current += 1;
        console.log(`[GEO] Polling attempt ${pollingCountRef.current}/${MAX_POLLING_ATTEMPTS} for promptId: ${scanStatus.promptId}`);
        
        const response = await geoAPI.getAnalysisResults(scanStatus.promptId);
        
        console.log('[GEO] Poll response data:', {
          status: response.data.data.status,
          hasEngineResults: !!response.data.data.engineResults,
          engineCount: response.data.data.engineResults?.length || 0,
          geoScore: response.data.data.geoScore,
          brandMentions: response.data.data.brandMentions,
          competitorMentions: response.data.data.competitorMentions
        });
        
        if (response.data.data.status === 'NO_COMPLETED_RUNS') {
          console.log(`[GEO] Still processing (attempt ${pollingCountRef.current}/${MAX_POLLING_ATTEMPTS}), will poll again in ${POLLING_INTERVAL / 1000}s`);
          
          // Check if we've exceeded max attempts
          if (pollingCountRef.current >= MAX_POLLING_ATTEMPTS) {
            console.error('[GEO] Max polling attempts reached, stopping');
            setError('Analysis took too long. Please try again.');
            setScanStatus(null);
            setLoading(false);
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          }
          return;
        }

        // Results ready
        console.log('[GEO] Results received after', pollingCountRef.current, 'attempts, stopping polling');
        console.log('[GEO] Full result data:', response.data.data);
        setResult(response.data.data);
        setScanStatus(null);
        setLoading(false);
        
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      } catch (err) {
        console.error('[GEO] Polling error on attempt', pollingCountRef.current, ':', err);
        // Continue polling on error
      }
    };

    // Call poll immediately on first run
    console.log('[GEO] Starting polling for promptId:', scanStatus.promptId);
    pollingCountRef.current = 0;
    poll();

    // Then set up interval for subsequent polls
    pollingIntervalRef.current = setInterval(poll, POLLING_INTERVAL);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [scanStatus]);

  const handleRunScan = async () => {
    if (!prompt.trim() || !brand.trim()) {
      setError('Prompt and brand are required');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await geoAPI.runScan({
        prompt,
        brand,
        competitors: competitors.split(',').map(c => c.trim()).filter(c => c),
        engines: selectedEngines,
      });

      // Set up polling for results
      setScanStatus({
        promptId: response.data.data.promptId,
        runs: response.data.data.runs,
      });
    } catch (err) {
      console.error('Scan failed:', err);
      setError('Failed to run scan. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">GEO Dashboard</h1>

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <QueryInput value={prompt} onChange={setPrompt} />
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand Name
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g., Yonex"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Competitors (comma-separated)
                </label>
                <input
                  type="text"
                  value={competitors}
                  onChange={(e) => setCompetitors(e.target.value)}
                  placeholder="e.g., Li-Ning, Victor"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <EngineSelector
                selected={selectedEngines}
                onChange={setSelectedEngines}
              />
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleRunScan}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Running Analysis...' : 'Run GEO Analysis'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {/* Status Section */}
          {scanStatus && (
            <div className="mt-4 p-4 bg-blue-50 rounded-md">
              <h3 className="font-medium text-blue-900 mb-2">Processing Status</h3>
              <div className="space-y-2">
                {scanStatus.runs.map((run) => (
                  <div key={run.runId} className="flex items-center justify-between text-sm">
                    <span className="text-blue-800">{run.engine}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      run.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      run.status === 'RUNNING' ? 'bg-yellow-100 text-yellow-800' :
                      run.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {run.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        {result && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Results</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* GEO Score */}
              <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                <GEOScoreGauge score={result.geoScore} size="md" />
                <div className="mt-2 text-center">
                  <p className="text-sm text-gray-600">Overall GEO Score</p>
                </div>
              </div>

              {/* Brand Mentions */}
              <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">{result.brandMentions}</div>
                <div className="text-sm text-gray-600">Brand Mentions</div>
              </div>

              {/* Competitor Mentions */}
              <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-orange-600">{result.competitorMentions}</div>
                <div className="text-sm text-gray-600">Competitor Mentions</div>
              </div>

              {/* Sentiment */}
              <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg">
                <div className={`text-3xl font-bold ${
                  result.sentiment === 'POSITIVE' ? 'text-green-600' :
                  result.sentiment === 'NEGATIVE' ? 'text-red-600' : 'text-yellow-600'
                }`}>
                  {result.sentiment}
                </div>
                <div className="text-sm text-gray-600">Sentiment</div>
              </div>
            </div>

            {/* Engine Results */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Engine Results</h3>
              <div className="space-y-4">
                {result.engineResults.map((engineResult, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900">{engineResult.engine}</h4>
                      <span className={`px-2 py-1 text-xs rounded ${
                        engineResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {engineResult.success ? 'Success' : 'Failed'}
                      </span>
                    </div>
                    {engineResult.success && (
                      <div className="prose text-sm text-gray-700 max-h-48 overflow-y-auto">
                        <p>{engineResult.responseText.substring(0, 500)}...</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};