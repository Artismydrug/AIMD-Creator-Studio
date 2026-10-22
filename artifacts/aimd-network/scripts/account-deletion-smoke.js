const fs = require('fs');
const path = require('path');

const profilePath = path.resolve(__dirname, '..', 'app', 'profile.tsx');
const editorPath = path.resolve(__dirname, '..', 'app', 'edit-profile.tsx');

function assertIncludes(source, value, description) {
  if (!source.includes(value)) {
    throw new Error(`Account deletion smoke contract missing ${description}: ${value}`);
  }
}

function assertAccountDeletionSmokeContract({
  profile = fs.readFileSync(profilePath, 'utf8'),
  editor: source = fs.readFileSync(editorPath, 'utf8'),
} = {}) {
  assertIncludes(profile, "onEdit={() => router.push('/edit-profile')}", 'Your Studio link to Edit Profile');
  assertIncludes(source, 'testID="profile-basics-editor"', 'Edit Profile screen');

  assertIncludes(source, 'useDeleteCurrentUser', 'generated deletion mutation');
  assertIncludes(source, 'testID="delete-account"', 'visible delete action');
  assertIncludes(source, 'Delete your account permanently?', 'confirmation title');
  assertIncludes(source, 'This action cannot be undone.', 'permanence warning');
  assertIncludes(source, 'Delete permanently', 'destructive confirmation action');
  assertIncludes(source, 'testID="delete-confirm-cancel"', 'browser confirmation has a non-destructive cancel control');
  assertIncludes(source, 'testID="delete-confirm-submit"', 'browser deletion has an explicit destructive control');
  assertIncludes(source, 'if (!deleteConfirmationOpen || deleteAccount.isPending) return;', 'browser deletion requires an open confirmation');
  if (source.includes('window.confirm(')) {
    throw new Error('Account deletion must not depend on browser-native confirmation interception.');
  }
  assertIncludes(source, 'onPress: performDeletion', 'native destructive confirmation uses the same deletion action');
  assertIncludes(source, "window.alert(`${title}\\n\\n${message}`)", 'browser deletion notices are visible');
  assertIncludes(source, "router.replace('/(auth)/sign-in')", 'post-deletion sign-in route');

  console.log('Account deletion smoke contract passed');
}

if (require.main === module) {
  try {
    assertAccountDeletionSmokeContract();
  } catch (error) {
    console.error(`Account deletion smoke contract failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { assertAccountDeletionSmokeContract };