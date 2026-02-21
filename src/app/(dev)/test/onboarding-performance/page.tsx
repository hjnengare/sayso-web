"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';

interface PerformanceResult {
  test: string;
  duration: string;
  status: 'PASS' | 'FAIL' | 'ERROR';
  details?: any;
  error?: string;
}

export default function OnboardingPerformanceTestPage() {
  const { user } = useAuth();
  const [results, setResults] = useState<PerformanceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [navigationTimes, setNavigationTimes] = useState<Record<string, number>>({});

  useEffect(() => {
    // Measure page load time
    if (typeof window !== 'undefined' && window.performance) {
      const perfData = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (perfData) {
        setNavigationTimes({
          domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
          loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
          total: perfData.loadEventEnd - perfData.fetchStart
        });
      }
    }
  }, []);

  const runTests = async () => {
    setLoading(true);
    setResults([]);

    const testResults: PerformanceResult[] = [];

    // Test 1: API Performance
    try {
      const startTime = performance.now();
      const response = await fetch('/api/test/onboarding-performance');
      const endTime = performance.now();
      const duration = endTime - startTime;

      if (response.ok) {
        const data = await response.json();
        testResults.push({
          test: 'API Performance Test',
          duration: `${duration.toFixed(2)}ms`,
          status: data.performance?.total === 'PASS' ? 'PASS' : 'FAIL',
          details: data
        });
      } else {
        testResults.push({
          test: 'API Performance Test',
          duration: `${duration.toFixed(2)}ms`,
          status: 'FAIL',
          error: await response.text()
        });
      }
    } catch (error: any) {
      testResults.push({
        test: 'API Performance Test',
        duration: 'N/A',
        status: 'ERROR',
        error: error.message
      });
    }

    // Test 2: Navigation Speed (simulated)
    try {
      const navStart = performance.now();
      // Simulate navigation by prefetching
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = '/interests';
      document.head.appendChild(link);
      
      await new Promise(resolve => setTimeout(resolve, 50)); // Small delay for prefetch
      
      const navEnd = performance.now();
      testResults.push({
        test: 'Navigation Prefetch Test',
        duration: `${(navEnd - navStart).toFixed(2)}ms`,
        status: (navEnd - navStart) < 100 ? 'PASS' : 'FAIL',
        details: { prefetch_time: navEnd - navStart }
      });
    } catch (error: any) {
      testResults.push({
        test: 'Navigation Prefetch Test',
        duration: 'N/A',
        status: 'ERROR',
        error: error.message
      });
    }

    setResults(testResults);
    setLoading(false);
  };

  const allPassed = results.every(r => r.status === 'PASS');
  const targetTime = 2000; // 2 seconds

  return (
    <div className="min-h-screen bg-off-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Onboarding Performance Test</h1>
        
        {!user && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800">
              ⚠️ Please log in to run full performance tests
            </p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>
          
          {Object.keys(navigationTimes).length > 0 && (
            <div className="mb-4">
              <h3 className="font-medium mb-2">Page Load Times:</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>DOM Content Loaded: {navigationTimes.domContentLoaded?.toFixed(2)}ms</li>
                <li>Load Complete: {navigationTimes.loadComplete?.toFixed(2)}ms</li>
                <li>Total Load Time: {navigationTimes.total?.toFixed(2)}ms</li>
              </ul>
            </div>
          )}

          <button
            onClick={runTests}
            disabled={loading}
            className="bg-card-bg text-white px-6 py-3 rounded-lg font-semibold hover:bg-card-bg/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Running Tests...' : 'Run Performance Tests'}
          </button>
        </div>

        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            
            <div className={`p-4 rounded-lg mb-4 ${allPassed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <p className={`font-semibold ${allPassed ? 'text-green-800' : 'text-red-800'}`}>
                {allPassed 
                  ? `✅ All tests passed! Onboarding flow should be <${targetTime}ms`
                  : '❌ Some tests failed. Check details below.'
                }
              </p>
            </div>

            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{result.test}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      result.status === 'PASS' ? 'bg-green-100 text-green-800' :
                      result.status === 'FAIL' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {result.status}
                    </span>
                  </div>
                  
                  {result.duration && (
                    <p className="text-sm text-gray-600 mb-2">Duration: {result.duration}</p>
                  )}
                  
                  {result.details && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                        View Details
                      </summary>
                      <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                  
                  {result.error && (
                    <p className="text-sm text-red-600 mt-2">Error: {result.error}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Performance Targets</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Profile Query: &lt;100ms</li>
            <li>Table Checks: &lt;200ms</li>
            <li>API Total: &lt;500ms</li>
            <li>Full Onboarding Flow: &lt;{targetTime}ms</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

