const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { assertAccountDeletionSmokeContract } = require('./account-deletion-smoke');

const profile = readFileSync(resolve(__dirname, '../app/profile.tsx'), 'utf8');
const editor = readFileSync(resolve(__dirname, '../app/edit-profile.tsx'), 'utf8');

test('release deletion gate follows Your Studio into Edit Profile', () => {
  assert.doesNotThrow(() => assertAccountDeletionSmokeContract({ profile, editor }));
});

for (const [label, target, needle] of [
  ['unreachable editor', 'profile', "onEdit={() => router.push('/edit-profile')}"],
  ['missing deletion mutation', 'editor', 'useDeleteCurrentUser'],
  ['missing cancellation control', 'editor', 'testID="delete-confirm-cancel"'],
  ['unguarded deletion', 'editor', 'if (!deleteConfirmationOpen || deleteAccount.isPending) return;'],
  ['missing sign-in return', 'editor', "router.replace('/(auth)/sign-in')"],
]) {
  test(`release deletion gate rejects ${label}`, () => {
    const sources = { profile, editor };
    sources[target] = sources[target].split(needle).join('REMOVED_BY_REGRESSION_TEST');
    assert.throws(() => assertAccountDeletionSmokeContract(sources), /Account deletion smoke contract missing/);
  });
}
