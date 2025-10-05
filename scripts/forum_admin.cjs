#!/usr/bin/env node
/**
 * forum_admin.cjs
 * CommonJS variant to run in projects with "type": "module" in package.json
 */
const admin = require('firebase-admin');

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) return usage();

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.warn('WARNING: GOOGLE_APPLICATION_CREDENTIALS is not set.');
    console.warn('The script requires a service account with Firestore access.');
  }

  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } catch (e) {
    console.error('Failed to initialize firebase-admin:', e.message || e);
    process.exit(1);
  }

  const db = admin.firestore();
  const cmd = args[0];
  const dryRun = args.includes('--dry-run');

  if (cmd === 'reconcile') {
    console.log((dryRun ? '[DRY RUN] ' : '') + 'Reconciling user stars from forum_posts...');

    const postsSnap = await db.collection('forum_posts').get();
    const userStars = {}; // uid -> stars sum
    const userPostCount = {}; // uid -> #posts

    postsSnap.forEach((p) => {
      const data = p.data() || {};
      const authorId = data.authorId;
      if (!authorId) return; // skip orphaned posts
      const likes = Number(data.likes || 0);
      const stars = Number(data.stars || 0);
      const total = likes + stars; // both count as 1 point per spec
      userStars[authorId] = (userStars[authorId] || 0) + total;
      userPostCount[authorId] = (userPostCount[authorId] || 0) + 1;
    });

    console.log('Found posts for', Object.keys(userStars).length, 'authors.');

    // Optionally include users with zero posts: we will set to 0 if they exist in users collection
    const usersSnap = await db.collection('users').get();
    let batch = db.batch();
    let writes = 0;

    for (const uDoc of usersSnap.docs) {
      const uid = uDoc.id;
      const desiredStars = userStars[uid] || 0;
      const desiredPostCount = userPostCount[uid] || 0;
      if (dryRun) {
        console.log(`[DRY] would set users/${uid}.stars = ${desiredStars}, postCount = ${desiredPostCount}`);
      } else {
        const ref = db.collection('users').doc(uid);
        batch.update(ref, { stars: desiredStars, postCount: desiredPostCount });
        writes += 1;
        // Firestore batch limit is 500; commit earlier to be safe
        if (writes >= 450) {
          // commit and start new batch
          await batch.commit();
          batch = db.batch();
          writes = 0;
        }
      }
    }

    if (!dryRun) {
      // commit remaining writes
      if (writes > 0) await batch.commit();
      console.log('Reconciliation complete: updated users collection.');
    } else {
      console.log('Dry run finished. No writes performed.');
    }

  } else if (cmd === 'reset-user') {
    const uid = args[1];
    if (!uid) return usage();
    const dry = dryRun;
    if (dry) {
      console.log(`[DRY] would set users/${uid}.stars = 0`);
      return;
    }
    const uRef = db.collection('users').doc(uid);
    const uDoc = await uRef.get();
    if (!uDoc.exists) {
      console.error('User not found:', uid);
      process.exit(2);
    }
    await uRef.update({ stars: 0 });
    console.log('User stars reset to 0 for', uid);
  } else {
    usage();
  }
}

function usage() {
  console.log('Usage: node scripts/forum_admin.cjs <command> [args] [--dry-run]');
  console.log('Commands:');
  console.log('  reconcile       Recompute users/*.stars and users/*.postCount from forum_posts');
  console.log('  reset-user UID  Set users/UID.stars = 0');
  console.log('Options: --dry-run   Do not write, only show actions');
  process.exit(1);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
