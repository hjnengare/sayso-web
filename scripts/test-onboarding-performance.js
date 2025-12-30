/**
 * Performance test script for onboarding flow
 * Tests navigation speed between onboarding pages
 * 
 * Usage: node scripts/test-onboarding-performance.js
 * Or visit: http://localhost:3000/api/test/onboarding-performance
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testOnboardingPerformance() {
  console.log('🚀 Testing Onboarding Flow Performance...\n');
  
  const tests = [
    {
      name: 'API Performance Test',
      url: `${BASE_URL}/api/test/onboarding-performance`,
      description: 'Tests database query performance'
    }
  ];

  const results = [];

  for (const test of tests) {
    console.log(`Testing: ${test.name}`);
    console.log(`  ${test.description}`);
    
    try {
      const startTime = Date.now();
      const response = await fetch(test.url);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      if (response.ok) {
        const data = await response.json();
        results.push({
          test: test.name,
          duration: `${duration}ms`,
          status: 'PASS',
          details: data
        });
        
        console.log(`  ✅ PASSED in ${duration}ms`);
        if (data.results) {
          console.log(`  Profile Query: ${data.results.profile_query_ms?.toFixed(2)}ms`);
          console.log(`  Table Checks: ${data.results.table_checks_ms?.toFixed(2)}ms`);
          console.log(`  Total: ${data.results.total_ms?.toFixed(2)}ms`);
        }
        if (data.performance) {
          console.log(`  Performance: ${JSON.stringify(data.performance, null, 2)}`);
        }
      } else {
        const error = await response.text();
        results.push({
          test: test.name,
          duration: `${duration}ms`,
          status: 'FAIL',
          error: error
        });
        console.log(`  ❌ FAILED: ${error}`);
      }
    } catch (error) {
      results.push({
        test: test.name,
        status: 'ERROR',
        error: error.message
      });
      console.log(`  ❌ ERROR: ${error.message}`);
    }
    
    console.log('');
  }

  // Summary
  console.log('📊 Test Summary:');
  console.log('================');
  results.forEach(result => {
    console.log(`${result.status === 'PASS' ? '✅' : '❌'} ${result.test}: ${result.duration || 'N/A'}`);
  });

  const allPassed = results.every(r => r.status === 'PASS');
  console.log(`\n${allPassed ? '✅ All tests passed!' : '❌ Some tests failed'}`);
  
  return allPassed;
}

// Run if called directly
if (require.main === module) {
  testOnboardingPerformance()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testOnboardingPerformance };

