/**
 * Guest Mode Testing Script for Life Design App
 * 
 * Usage:
 * 1. Open the deployed app: https://life-design-brown.vercel.app
 * 2. Open DevTools Console (F12)
 * 3. Paste this entire script and press Enter
 * 4. Run individual test commands
 * 
 * Available Commands:
 * - testStorage()          Check all localStorage keys
 * - testPersistence()      Test data persistence across refreshes
 * - testNavigation()       Test navigation guards
 * - testProfile()          Test profile operations
 * - testGoals()            Test goal operations
 * - testCheckins()         Test check-in operations
 * - clearAll()             Clear all guest data
 * - seedData()             Create test data
 * - runAllTests()          Run all tests automatically
 */

const GuestModeTests = {
  KEYS: {
    profile: 'life-design-guest-profile',
    goals: 'life-design-guest-goals',
    checkins: 'life-design-guest-checkins',
    integrations: 'life-design-guest-integrations',
    theme: 'life-design-theme',
    voice: 'life-design-voice-preference',
  },

  OLD_KEYS: {
    profile: 'life_design_guest_profile',
    goals: 'life_design_guest_goals',
    checkins: 'life_design_guest_checkins',
    integrations: 'life_design_guest_integrations',
    voice: 'life_design_voice_preference',
  },

  log(message, type = 'info') {
    const styles = {
      info: 'background: #3b82f6; color: white; padding: 4px 8px; border-radius: 4px;',
      success: 'background: #10b981; color: white; padding: 4px 8px; border-radius: 4px;',
      error: 'background: #ef4444; color: white; padding: 4px 8px; border-radius: 4px;',
      warning: 'background: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px;',
    };
    console.log(`%c${type.toUpperCase()}`, styles[type], message);
  },

  testStorage() {
    console.log('\n════════════════════════════════════');
    console.log('🧪 TEST: localStorage Keys');
    console.log('════════════════════════════════════\n');

    let allPass = true;

    // Check new keys (expected)
    console.log('✅ CHECKING NEW KEYS (life-design-*):');
    Object.entries(this.KEYS).forEach(([name, key]) => {
      const exists = localStorage.getItem(key) !== null;
      if (exists) {
        const value = localStorage.getItem(key);
        console.log(`  ✅ ${key} - Found (${value?.length || 0} chars)`);
      } else {
        console.log(`  ⚠️  ${key} - Not found (might be empty state)`);
      }
    });

    // Check old keys (should NOT exist)
    console.log('\n❌ CHECKING OLD KEYS (life_design_*):');
    Object.entries(this.OLD_KEYS).forEach(([name, key]) => {
      const exists = localStorage.getItem(key) !== null;
      if (exists) {
        console.log(`  ❌ ${key} - FOUND (BUG: Old key format still in use!)`);
        allPass = false;
      } else {
        console.log(`  ✅ ${key} - Not found (correct)`);
      }
    });

    // Calculate total storage
    let totalSize = 0;
    for (let key in localStorage) {
      if (key.startsWith('life-design-') || key.startsWith('life_design_')) {
        totalSize += (localStorage.getItem(key) || '').length;
      }
    }

    console.log(`\n📊 Total storage: ${totalSize} chars (${(totalSize / 1024).toFixed(2)} KB)`);
    console.log(`\n${allPass ? '✅ TEST PASSED' : '❌ TEST FAILED'}\n`);
    return allPass;
  },

  testProfile() {
    console.log('\n════════════════════════════════════');
    console.log('🧪 TEST: Profile Operations');
    console.log('════════════════════════════════════\n');

    const profile = localStorage.getItem(this.KEYS.profile);
    
    if (!profile) {
      console.log('⚠️  No profile found (guest not initialized)');
      return false;
    }

    try {
      const parsed = JSON.parse(profile);
      console.log('✅ Profile loaded successfully:');
      console.table(parsed);

      // Validate structure
      const required = ['id'];
      const optional = ['name', 'profession', 'postcode', 'interests', 'hobbies', 'onboarded'];
      
      console.log('\n📋 Profile Validation:');
      required.forEach(field => {
        if (parsed[field]) {
          console.log(`  ✅ ${field}: ${parsed[field]}`);
        } else {
          console.log(`  ❌ ${field}: Missing (required)`);
        }
      });

      optional.forEach(field => {
        if (parsed[field] !== undefined) {
          console.log(`  ✅ ${field}: ${JSON.stringify(parsed[field])}`);
        }
      });

      // Check onboarded status
      if (parsed.onboarded) {
        console.log('\n✅ User is onboarded');
      } else {
        console.log('\n⚠️  User NOT onboarded');
      }

      return true;
    } catch (error) {
      console.log(`❌ Failed to parse profile: ${error.message}`);
      return false;
    }
  },

  testGoals() {
    console.log('\n════════════════════════════════════');
    console.log('🧪 TEST: Goals Operations');
    console.log('════════════════════════════════════\n');

    const goals = localStorage.getItem(this.KEYS.goals);
    
    if (!goals) {
      console.log('⚠️  No goals key found');
      return false;
    }

    try {
      const parsed = JSON.parse(goals);
      console.log(`✅ Found ${parsed.length} goals`);
      
      if (parsed.length > 0) {
        console.table(parsed);

        // Validate each goal
        parsed.forEach((goal, i) => {
          console.log(`\nGoal ${i + 1}:`);
          const required = ['id', 'title', 'horizon', 'status', 'target_date'];
          required.forEach(field => {
            if (goal[field]) {
              console.log(`  ✅ ${field}: ${goal[field]}`);
            } else {
              console.log(`  ❌ ${field}: Missing`);
            }
          });
        });
      }

      return true;
    } catch (error) {
      console.log(`❌ Failed to parse goals: ${error.message}`);
      return false;
    }
  },

  testCheckins() {
    console.log('\n════════════════════════════════════');
    console.log('🧪 TEST: Check-in Operations');
    console.log('════════════════════════════════════\n');

    const checkins = localStorage.getItem(this.KEYS.checkins);
    
    if (!checkins) {
      console.log('⚠️  No checkins key found');
      return false;
    }

    try {
      const parsed = JSON.parse(checkins);
      console.log(`✅ Found ${parsed.length} check-ins`);
      
      if (parsed.length > 0) {
        // Show summary
        console.table(parsed.map(c => ({
          id: c.id,
          date: c.date,
          mood: c.mood,
          type: c.duration_type,
          dimensions: c.dimension_scores?.length || 0,
        })));

        // Validate first check-in
        const first = parsed[0];
        console.log('\nFirst check-in validation:');
        const required = ['id', 'date', 'mood', 'duration_type', 'dimension_scores'];
        required.forEach(field => {
          if (first[field] !== undefined) {
            console.log(`  ✅ ${field}: ${JSON.stringify(first[field])}`);
          } else {
            console.log(`  ❌ ${field}: Missing`);
          }
        });

        // Validate dimension scores
        if (first.dimension_scores?.length > 0) {
          console.log('\nDimension scores:');
          console.table(first.dimension_scores);
        }
      }

      return true;
    } catch (error) {
      console.log(`❌ Failed to parse check-ins: ${error.message}`);
      return false;
    }
  },

  testPersistence() {
    console.log('\n════════════════════════════════════');
    console.log('🧪 TEST: Data Persistence');
    console.log('════════════════════════════════════\n');

    // Store test data
    const testData = {
      timestamp: Date.now(),
      test: 'persistence-check',
    };

    localStorage.setItem('life-design-test-persistence', JSON.stringify(testData));
    console.log('✅ Test data written to localStorage');

    // Verify immediately
    const retrieved = localStorage.getItem('life-design-test-persistence');
    if (retrieved) {
      const parsed = JSON.parse(retrieved);
      if (parsed.timestamp === testData.timestamp) {
        console.log('✅ Test data retrieved successfully');
        console.log('\n⚠️  To complete this test:');
        console.log('   1. Refresh the page (F5)');
        console.log('   2. Run: testPersistenceVerify()');
        return true;
      }
    }

    console.log('❌ Test data could not be retrieved');
    return false;
  },

  testPersistenceVerify() {
    console.log('\n════════════════════════════════════');
    console.log('🧪 TEST: Verify Data Persistence');
    console.log('════════════════════════════════════\n');

    const retrieved = localStorage.getItem('life-design-test-persistence');
    if (retrieved) {
      const parsed = JSON.parse(retrieved);
      console.log('✅ Test data survived page refresh!');
      console.log(`   Timestamp: ${parsed.timestamp}`);
      console.log(`   Age: ${((Date.now() - parsed.timestamp) / 1000).toFixed(1)}s`);
      localStorage.removeItem('life-design-test-persistence');
      return true;
    } else {
      console.log('❌ Test data NOT found after refresh');
      return false;
    }
  },

  testNavigation() {
    console.log('\n════════════════════════════════════');
    console.log('🧪 TEST: Navigation Guards');
    console.log('════════════════════════════════════\n');

    const profile = localStorage.getItem(this.KEYS.profile);
    const currentPath = window.location.pathname;

    console.log(`Current path: ${currentPath}`);

    if (profile) {
      const parsed = JSON.parse(profile);
      const onboarded = parsed.onboarded;

      console.log(`Onboarded: ${onboarded}`);

      // Test protected routes
      if (currentPath.startsWith('/dashboard') && !onboarded) {
        console.log('❌ BUG: Accessing dashboard without being onboarded');
        return false;
      }

      if (currentPath.startsWith('/onboarding') && onboarded) {
        console.log('⚠️  On onboarding page despite being onboarded');
        console.log('   Expected: Should redirect to dashboard');
      }

      console.log('✅ Navigation state looks correct');
    } else {
      console.log('⚠️  No profile found - guest not initialized');
      if (currentPath.startsWith('/dashboard')) {
        console.log('❌ BUG: Can access dashboard without profile');
        return false;
      }
    }

    console.log('\n📋 Manual Navigation Tests:');
    console.log('   1. Try: window.location.href = "/dashboard"');
    console.log('   2. Try: window.location.href = "/onboarding"');
    console.log('   3. Observe redirect behavior');

    return true;
  },

  clearAll() {
    console.log('\n════════════════════════════════════');
    console.log('🗑️  Clearing All Guest Data');
    console.log('════════════════════════════════════\n');

    // Clear new keys
    Object.values(this.KEYS).forEach(key => {
      if (localStorage.getItem(key)) {
        console.log(`  🗑️  Removing: ${key}`);
        localStorage.removeItem(key);
      }
    });

    // Clear old keys
    Object.values(this.OLD_KEYS).forEach(key => {
      if (localStorage.getItem(key)) {
        console.log(`  🗑️  Removing: ${key} (old format)`);
        localStorage.removeItem(key);
      }
    });

    console.log('\n✅ All guest data cleared');
    console.log('   Refresh page to start fresh');
  },

  seedData() {
    console.log('\n════════════════════════════════════');
    console.log('🌱 Seeding Test Data');
    console.log('════════════════════════════════════\n');

    const profile = {
      id: 'guest-user',
      name: 'Test User',
      profession: 'Software Developer',
      postcode: 'SW1A 1AA',
      interests: ['Technology', 'Reading', 'Fitness'],
      hobbies: ['Coding', 'Hiking'],
      maritalStatus: 'single',
      onboarded: true,
      voicePreference: 'calm-british-female',
    };

    const goals = [
      {
        id: 'goal-1710345678901',
        title: 'Launch MVP',
        horizon: 'short',
        description: 'Complete and launch minimum viable product',
        status: 'active',
        target_date: '2026-06-01',
      },
      {
        id: 'goal-1710345678902',
        title: 'Get promoted',
        horizon: 'medium',
        description: 'Achieve senior developer position',
        status: 'active',
        target_date: '2026-12-31',
      },
      {
        id: 'goal-1710345678903',
        title: 'Achieve financial independence',
        horizon: 'long',
        description: 'Build passive income streams',
        status: 'active',
        target_date: '2029-03-13',
      },
    ];

    const checkins = [
      {
        id: 'checkin-1710345678901',
        date: '2026-03-13',
        mood: 8,
        duration_type: 'quick',
        journal_entry: 'Feeling productive today!',
        dimension_scores: [
          { dimension: 'physical', score: 7 },
          { dimension: 'mental', score: 8 },
          { dimension: 'emotional', score: 7 },
          { dimension: 'social', score: 6 },
          { dimension: 'professional', score: 9 },
          { dimension: 'financial', score: 7 },
          { dimension: 'spiritual', score: 6 },
        ],
      },
      {
        id: 'checkin-1710259278901',
        date: '2026-03-12',
        mood: 7,
        duration_type: 'quick',
        dimension_scores: [
          { dimension: 'physical', score: 6 },
          { dimension: 'mental', score: 7 },
          { dimension: 'emotional', score: 8 },
          { dimension: 'social', score: 7 },
          { dimension: 'professional', score: 8 },
          { dimension: 'financial', score: 7 },
          { dimension: 'spiritual', score: 6 },
        ],
      },
    ];

    const integrations = [
      {
        id: 'integration-1710345678901',
        provider: 'strava',
        access_token: 'mock_token_abc123',
        connected_at: new Date().toISOString(),
        metadata: { scope: 'read,activity:read' },
      },
    ];

    // Save all data
    localStorage.setItem(this.KEYS.profile, JSON.stringify(profile));
    localStorage.setItem(this.KEYS.goals, JSON.stringify(goals));
    localStorage.setItem(this.KEYS.checkins, JSON.stringify(checkins));
    localStorage.setItem(this.KEYS.integrations, JSON.stringify(integrations));
    localStorage.setItem(this.KEYS.theme, 'botanical');
    localStorage.setItem(this.KEYS.voice, 'calm-british-female');

    console.log('✅ Profile created');
    console.log(`✅ ${goals.length} goals added`);
    console.log(`✅ ${checkins.length} check-ins added`);
    console.log(`✅ ${integrations.length} integrations added`);
    console.log('✅ Theme set: botanical');
    console.log('✅ Voice set: calm-british-female');
    console.log('\n🎉 Test data seeded successfully!');
    console.log('   Refresh page to see changes');
  },

  runAllTests() {
    console.log('\n\n');
    console.log('╔════════════════════════════════════════════╗');
    console.log('║   🧪 GUEST MODE - FULL TEST SUITE 🧪      ║');
    console.log('╚════════════════════════════════════════════╝');

    const results = {
      storage: this.testStorage(),
      profile: this.testProfile(),
      goals: this.testGoals(),
      checkins: this.testCheckins(),
      navigation: this.testNavigation(),
    };

    console.log('\n\n');
    console.log('╔════════════════════════════════════════════╗');
    console.log('║           📊 TEST RESULTS SUMMARY          ║');
    console.log('╚════════════════════════════════════════════╝\n');

    Object.entries(results).forEach(([test, passed]) => {
      console.log(`  ${passed ? '✅' : '❌'} ${test.toUpperCase()}`);
    });

    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(Boolean).length;
    const passRate = ((passedTests / totalTests) * 100).toFixed(0);

    console.log(`\n📊 Pass Rate: ${passedTests}/${totalTests} (${passRate}%)\n`);

    if (passedTests === totalTests) {
      console.log('🎉 ALL TESTS PASSED!');
    } else {
      console.log('⚠️  SOME TESTS FAILED - Review output above');
    }
  },

  help() {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║      🧪 GUEST MODE TESTING COMMANDS        ║');
    console.log('╚════════════════════════════════════════════╝\n');
    console.log('testStorage()            - Check localStorage keys');
    console.log('testProfile()            - Test profile operations');
    console.log('testGoals()              - Test goal operations');
    console.log('testCheckins()           - Test check-in operations');
    console.log('testPersistence()        - Test data persistence');
    console.log('testPersistenceVerify()  - Verify after refresh');
    console.log('testNavigation()         - Test navigation guards');
    console.log('clearAll()               - Clear all guest data');
    console.log('seedData()               - Create test data');
    console.log('runAllTests()            - Run all tests');
    console.log('help()                   - Show this help\n');
  }
};

// Create global shortcuts
window.testStorage = () => GuestModeTests.testStorage();
window.testProfile = () => GuestModeTests.testProfile();
window.testGoals = () => GuestModeTests.testGoals();
window.testCheckins = () => GuestModeTests.testCheckins();
window.testPersistence = () => GuestModeTests.testPersistence();
window.testPersistenceVerify = () => GuestModeTests.testPersistenceVerify();
window.testNavigation = () => GuestModeTests.testNavigation();
window.clearAll = () => GuestModeTests.clearAll();
window.seedData = () => GuestModeTests.seedData();
window.runAllTests = () => GuestModeTests.runAllTests();

// Show help on load
GuestModeTests.help();

console.log('✅ Guest Mode Testing Suite loaded!');
console.log('💡 Run runAllTests() to test everything');
console.log('💡 Run help() to see all commands\n');
