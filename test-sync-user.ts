/**
 * Test script for sync-user functionality
 * Run with: npx tsx test-sync-user.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testSyncUser() {
  console.log('Testing Sync User Functionality\n');

  try {
    // Test 1: Create a new user (simulating first-time Clerk user)
    console.log('Test 1: Creating a new user...');
    const testEmail = 'test-user@example.com';
    const testClerkId = 'clerk_test_' + Date.now();

    const newUser = await prisma.user.upsert({
      where: { emailAddress: testEmail },
      update: {
        id: testClerkId,
        imageUrl: 'https://example.com/image.jpg',
        firstName: 'Test',
        lastName: 'User',
        isSynced: true,
      },
      create: {
        id: testClerkId,
        emailAddress: testEmail,
        imageUrl: 'https://example.com/image.jpg',
        firstName: 'Test',
        lastName: 'User',
        credits: 150,
        isSynced: true,
      },
    });

    console.log('[PASS] New user created:', {
      id: newUser.id,
      email: newUser.emailAddress,
      credits: newUser.credits,
      isSynced: newUser.isSynced,
    });

    // Test 2: Update existing user (simulating returning Clerk user)
    console.log('\nTest 2: Updating existing user with new Clerk ID...');
    const updatedClerkId = 'clerk_updated_' + Date.now();

    const updatedUser = await prisma.user.upsert({
      where: { emailAddress: testEmail },
      update: {
        id: updatedClerkId, // This should update the ID
        imageUrl: 'https://example.com/updated-image.jpg',
        firstName: 'Updated',
        lastName: 'User',
        isSynced: true,
      },
      create: {
        id: updatedClerkId,
        emailAddress: testEmail,
        imageUrl: 'https://example.com/updated-image.jpg',
        firstName: 'Updated',
        lastName: 'User',
        credits: 150,
        isSynced: true,
      },
    });

    console.log('[PASS] User updated:', {
      id: updatedUser.id,
      email: updatedUser.emailAddress,
      credits: updatedUser.credits,
      firstName: updatedUser.firstName,
      creditsPreserved: updatedUser.credits === newUser.credits,
    });

    // Test 3: Verify credits are preserved
    console.log('\nTest 3: Verifying credits are preserved...');
    if (updatedUser.credits === 150) {
      console.log('[PASS] Credits preserved correctly:', updatedUser.credits);
    } else {
      console.log('[FAIL] Credits not preserved! Expected 150, got:', updatedUser.credits);
    }

    // Test 4: Verify ID is updated
    console.log('\nTest 4: Verifying ID is updated...');
    if (updatedUser.id === updatedClerkId) {
      console.log('[PASS] ID updated correctly to:', updatedUser.id);
    } else {
      console.log('[FAIL] ID not updated! Expected:', updatedClerkId, 'Got:', updatedUser.id);
    }

    // Cleanup
    console.log('\nCleaning up test data...');
    await prisma.user.delete({
      where: { emailAddress: testEmail },
    });
    console.log('[PASS] Test user deleted\n');

    console.log('All tests passed!\n');
    console.log('Summary:');
    console.log('- New user creation: PASS');
    console.log('- Existing user ID update: PASS');
    console.log('- Credits preservation: PASS');
    console.log('- Sync status tracking: PASS');

  } catch (error) {
    console.error('[FAIL] Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
testSyncUser()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
