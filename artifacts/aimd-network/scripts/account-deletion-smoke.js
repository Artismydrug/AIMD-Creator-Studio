const fs = require('fs');
const path = require('path');

const profilePath = path.resolve(__dirname, '..', 'app', 'profile.tsx');

function assertIncludes(source, value, description) {
  if (!source.includes(value)) {
    throw new Error(`Account deletion smoke contract missing ${description}: ${value}`);
  }
}

function assertAccountDeletionSmokeContract() {
  const source = fs.readFileSync(profilePath, 'utf8');

  assertIncludes(source, 'useDeleteCurrentUser', 'generated deletion mutation');
  assertIncludes(source, 'testID="delete-account"', 'visible delete action');
  assertIncludes(source, 'Delete your account permanently?', 'confirmation title');
  assertIncludes(source, 'This action cannot be undone.', 'permanence warning');
  assertIncludes(source, 'Delete permanently', 'destructive confirmation action');
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