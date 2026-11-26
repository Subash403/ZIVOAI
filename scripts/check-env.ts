import { validateEnvironment } from '../src/lib/security';

const report = validateEnvironment();

console.log('=== Zivo AI Environment Validation (Redacted) ===');
console.log(`NODE_ENV: ${report.nodeEnv}`);
console.log(`Razorpay Mode: ${report.razorpayMode}`);
console.log(`Ready for Production: ${report.readyForProduction ? 'YES' : 'NO'}`);

console.log('\nChecks:');
for (const item of report.checks) {
  const status = item.configured ? 'OK' : item.requiredInProd ? 'MISSING (REQUIRED IN PROD)' : 'OPTIONAL (UNSET)';
  console.log(`- [${item.category.toUpperCase()}] ${item.key}: ${status}${item.note ? ` — ${item.note}` : ''}`);
}

if (report.warnings.length > 0) {
  console.log('\nWarnings:');
  for (const warning of report.warnings) {
    console.log(`- ${warning}`);
  }
}

if (report.missingRequired.length > 0) {
  console.log(`\nMissing production-required variables (${report.missingRequired.length}): ${report.missingRequired.join(', ')}`);
  if (process.argv.includes('--strict') || process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}
