/**
 * Complete test for user sync flow
 * Run with: npx tsx test-user-flow.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testUserFlow() {
  console.log('Testing Complete User Sync Flow\n');
  console.log('='.repeat(50));

  try {
    // Test 1: Check if database is accessible
    console.log('\nTest 1: Database Connection');
    await prisma.$connect();
    console.log('[PASS] Database connected successfully');

    // Test 2: Simulate new user sign-up
    console.log('\nTest 2: New User Sign-Up Flow');
    const newUserEmail = 'newuser@test.com';
    const clerkUserId = 'clerk_new_' + Date.now();

    const newUser = await prisma.user.upsert({
      where: { emailAddress: newUserEmail },
      update: {
        id: clerkUserId,
        imageUrl: 'https://img.clerk.com/test.jpg',
        firstName: 'New',
        lastName: 'User',
        isSynced: true,
      },
      create: {
        id: clerkUserId,
        emailAddress: newUserEmail,
        imageUrl: 'https://img.clerk.com/test.jpg',
        firstName: 'New',
        lastName: 'User',
        credits: 150,
        isSynced: true,
      },
    });

    console.log('[PASS] New user created with:', {
      id: newUser.id,
      email: newUser.emailAddress,
      credits: newUser.credits,
      isSynced: newUser.isSynced,
    });

    // Test 3: Verify user has correct starting credits
    console.log('\nTest 3: Credit Verification');
    if (newUser.credits === 150) {
      console.log('[PASS] New user has correct starting credits: 150');
    } else {
      console.log('[FAIL] Expected 150 credits, got:', newUser.credits);
      throw new Error('Credits not set correctly');
    }

    // Test 4: Simulate existing user re-login
    console.log('\nTest 4: Existing User Re-Login');
    const returnUserId = 'clerk_return_' + Date.now();
    
    const returningUser = await prisma.user.upsert({
      where: { emailAddress: newUserEmail },
      update: {
        id: returnUserId,
        imageUrl: 'https://img.clerk.com/updated.jpg',
        firstName: 'Updated',
        lastName: 'User',
        isSynced: true,
      },
      create: {
        id: returnUserId,
        emailAddress: newUserEmail,
        imageUrl: 'https://img.clerk.com/updated.jpg',
        firstName: 'Updated',
        lastName: 'User',
        credits: 150,
        isSynced: true,
      },
    });

    console.log('[PASS] Returning user synced with:', {
      id: returningUser.id,
      email: returningUser.emailAddress,
      credits: returningUser.credits,
      firstName: returningUser.firstName,
    });

    // Test 5: Verify credits preserved on re-login
    console.log('\nTest 5: Credits Preservation on Re-Login');
    if (returningUser.credits === 150) {
      console.log('[PASS] Credits preserved correctly: 150');
    } else {
      console.log('[FAIL] Credits changed unexpectedly to:', returningUser.credits);
      throw new Error('Credits not preserved');
    }

    // Test 6: Verify ID update on re-login
    console.log('\nTest 6: ID Update on Re-Login');
    if (returningUser.id === returnUserId) {
      console.log('[PASS] User ID updated to match Clerk ID');
    } else {
      console.log('[FAIL] ID not updated. Expected:', returnUserId, 'Got:', returningUser.id);
      throw new Error('ID not updated');
    }

    // Test 7: Test fetching user by ID (as layout does)
    console.log('\nTest 7: User Lookup by ID (Layout Check)');
    const foundUser = await prisma.user.findUnique({
      where: { id: returningUser.id },
      select: { id: true, isSynced: true, credits: true }
    });

    if (foundUser && foundUser.isSynced) {
      console.log('[PASS] User found by ID and is synced');
      console.log('   Credits visible:', foundUser.credits);
    } else {
      console.log('[FAIL] User not found or not synced');
      throw new Error('User lookup failed');
    }

    // Cleanup
    console.log('\nCleaning up test data...');
    await prisma.user.delete({
      where: { emailAddress: newUserEmail },
    });
    console.log('[PASS] Test user deleted');

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('ALL TESTS PASSED!\n');
    console.log('Summary:');
    console.log('  [PASS] Database connection');
    console.log('  [PASS] New user creation with 150 credits');
    console.log('  [PASS] Credit verification');
    console.log('  [PASS] Existing user re-login');
    console.log('  [PASS] Credits preservation');
    console.log('  [PASS] ID update on re-login');
    console.log('  [PASS] User lookup by ID (layout check)');
    console.log('\nYour sync-user flow is working correctly!');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n[FAIL] TEST FAILED:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
testUserFlow()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
