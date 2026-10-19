// Prints the admin settings for your .env file.
//   npm run hash-password
// You'll be asked for the password (it isn't shown while typing). You can
// also pipe it in: echo 'secret' | npm run hash-password --silent
const crypto = require('crypto');
const readline = require('readline');
const { hashPassword } = require('../config/auth');

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });
    if (process.stdin.isTTY) {
      // Hide what's typed.
      rl._writeToOutput = (text) => {
        if (text.includes(question)) rl.output.write(text);
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (process.stdin.isTTY) process.stdout.write('\n');
      resolve(answer);
    });
  });
}

(async () => {
  const password = await ask('Admin password: ');
  if (password.length < 12) {
    console.error('Use at least 12 characters.');
    process.exit(1);
  }
  if (process.stdin.isTTY) {
    const again = await ask('Repeat it: ');
    if (again !== password) {
      console.error("Those don't match.");
      process.exit(1);
    }
  }
  console.log('\nAdd these to your .env file:\n');
  console.log(`ADMIN_PASSWORD_HASH=${hashPassword(password)}`);
  console.log(`JWT_SECRET=${crypto.randomBytes(48).toString('base64url')}`);
})();
