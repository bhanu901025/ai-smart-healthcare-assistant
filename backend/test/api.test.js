/**
 * Automated Enterprise API Integration & Validation Test Suite
 * Tests End-to-End System Reliability:
 *  1. Server Health & Database Telemetry
 *  2. AI Model Evaluation & Scientific Evidence
 *  3. AI Disease Prediction (Random Forest Microservice / Fallback)
 *  4. RBAC Authentication & Session Token Generation
 *  5. Smart Appointment Optimization & Double-Booking Prevention (HTTP 409)
 *  6. Appointment Rescheduling & Slot Release
 *  7. Patient Record Isolation & Role-Based Access Control
 *  8. DPDP Act (India) Data Export & Privacy Consent
 *  9. Tamper-Evident Security Audit Logs
 */

const assert = require('assert');

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000/api';

let totalTests = 0;
let passedTests = 0;

async function runTest(testName, fn) {
  totalTests++;
  try {
    process.stdout.write(`  [TEST ${totalTests}] ${testName} ... `);
    await fn();
    passedTests++;
    console.log('✅ PASSED');
  } catch (err) {
    console.log('❌ FAILED');
    console.error(`     Error: ${err.message}`);
  }
}

async function startSuite() {
  console.log('\n' + '='.repeat(70));
  console.log('  🏥 HEALTHPULSE ENTERPRISE HEALTHCARE ASSISTANT - API TEST SUITE');
  console.log('  Target: ' + BASE_URL);
  console.log('='.repeat(70) + '\n');

  // Test 1: System Telemetry & Database Status
  await runTest('System Health & 4-Table Persistent JSON Store', async () => {
    const res = await fetch(`${BASE_URL}/database/overview`);
    assert.strictEqual(res.status, 200, 'Expected HTTP 200');
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert(json.tables.users.count >= 3, 'Users table should contain at least 3 seeded accounts');
    assert(json.tables.doctors.count >= 1, 'Doctors table should contain records');
    assert(json.tables.records.count >= 1, 'EHR records should exist');
  });

  // Test 2: AI Scientific Validation Metrics (Defensible AI Claims)
  await runTest('AI Model Validation Evidence (Split, Accuracy, Confusion Matrix)', async () => {
    const res = await fetch(`${BASE_URL}/ai/evaluation`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.algorithm, 'RandomForestClassifier');
    assert.strictEqual(json.dataset_info.total_records, 2200, 'Dataset must have 2,200 records');
    assert.strictEqual(json.dataset_info.split_ratio, '80/20 Stratified');
    assert(json.evaluation_metrics.test_accuracy >= 97.0, 'Test accuracy must meet/exceed 97.0%');
    assert(json.confusion_matrix.classes.length === 22, 'Confusion matrix must cover 22 classes');
    assert(json.queue_optimization_study.results.baseline_walkin_mean_wait_min > 60);
  });

  // Test 3: AI Prediction Accuracy on Multi-Symptom Vector
  await runTest('AI Disease Prediction (cough, high_fever, breathlessness -> Pneumonia)', async () => {
    const res = await fetch(`${BASE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symptoms: ['cough', 'high_fever', 'breathlessness'] })
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.status, 'success');
    const data = json.data;
    assert(['Pneumonia', 'Bronchial Asthma', 'COVID-19'].includes(data.predicted_disease));
    assert(data.confidence >= 50, 'Confidence score should be >= 50% for 3 symptoms');
    assert(data.precautions && data.precautions.length > 0);
  });

  // Test 4: RBAC Authentication & Credential Verification
  await runTest('Patient, Doctor & Admin Authentication & Password Validation', async () => {
    // Valid Patient Login
    const validPatient = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alex.patient@healthpulse.ai', password: 'password123' })
    });
    assert.strictEqual(validPatient.status, 200);
    const patJson = await validPatient.json();
    assert.strictEqual(patJson.user.role, 'patient');
    assert(!patJson.user.password, 'Password must never be exposed');

    // Invalid Login Credentials
    const invalidLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alex.patient@healthpulse.ai', password: 'wrongpassword' })
    });
    assert.strictEqual(invalidLogin.status, 401, 'Invalid password must return 401');

    // Valid Admin Login
    const validAdmin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@healthpulse.ai', password: 'admin123' })
    });
    assert.strictEqual(validAdmin.status, 200);
    const admJson = await validAdmin.json();
    assert.strictEqual(admJson.user.role, 'admin');
  });

  // Test 5: Smart Slot Optimization & Fitness Scoring
  await runTest('Smart Appointment Optimization Engine & Wait Reduction', async () => {
    const res = await fetch(`${BASE_URL}/appointments/optimize?specialist=Pulmonologist&urgency=3`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert(json.doctors.length > 0);
    const doc = json.doctors[0];
    assert(doc.optimizedSlots.length > 0);
    const recommended = doc.optimizedSlots.find(s => s.isRecommended);
    assert(recommended, 'An optimal recommended slot should be calculated');
    assert(recommended.optimizationScore >= 80);
    assert(recommended.savedMinutesVsWalkin >= 30);
  });

  // Test 6: Double-Booking Prevention (HTTP 409 Conflict)
  await runTest('Strict Double-Booking Prevention rejects already booked slots with HTTP 409', async () => {
    // Attempt to book a doctor's slot
    const bookReq = {
      patientName: 'Test Automation User',
      age: 29,
      gender: 'Male',
      phone: '+91 99999 11111',
      doctorId: 'doc-01',
      slotTime: '11:00 AM',
      slotDate: '2026-10-20',
      predictedDisease: 'Automated Unit Verification',
      urgencyScore: 2
    };

    // First booking
    const firstRes = await fetch(`${BASE_URL}/appointments/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookReq)
    });
    const firstData = await firstRes.json();

    // Second booking on exact same slot should return 409 Conflict
    const secondRes = await fetch(`${BASE_URL}/appointments/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookReq)
    });

    assert.strictEqual(secondRes.status, 409, 'Double booking must be blocked with HTTP 409');
    const conflictData = await secondRes.json();
    assert.strictEqual(conflictData.success, false);
    assert(conflictData.error.includes('Schedule Conflict'));

    // Clean up created appointment if any
    if (firstData.appointment && firstData.appointment.id) {
      await fetch(`${BASE_URL}/appointments/${firstData.appointment.id}`, { method: 'DELETE' });
    }
  });

  // Test 7: Patient Record Isolation (RBAC)
  await runTest('Patient Record Isolation (Patients restricted to personal records)', async () => {
    // Patient usr-01 requesting their records
    const resPatient = await fetch(`${BASE_URL}/records`, {
      headers: { 'x-user-id': 'usr-01', 'x-user-role': 'patient' }
    });
    assert.strictEqual(resPatient.status, 200);
    const patRecords = await resPatient.json();
    for (const r of patRecords.records) {
      assert.strictEqual(r.patientId, 'usr-01', 'Patient must only see records with patientId usr-01');
    }

    // Doctor requesting records can see records across patients
    const resDoctor = await fetch(`${BASE_URL}/records`, {
      headers: { 'x-user-id': 'usr-02', 'x-user-role': 'doctor' }
    });
    assert.strictEqual(resDoctor.status, 200);
  });

  // Test 8: DPDP Act (India) Data Portability & Consent Logging
  await runTest('DPDP Act 2023 Patient Data Portability & Consent Tracking', async () => {
    const resExport = await fetch(`${BASE_URL}/patient/export-data`, {
      headers: { 'x-user-id': 'usr-01' }
    });
    assert.strictEqual(resExport.status, 200);
    const expJson = await resExport.json();
    assert.strictEqual(expJson.success, true);
    assert(expJson.data.complianceStandard.includes('DPDP Act'));
    assert(expJson.data.patientProfile.name === 'Alexander Wright');
    assert(Array.isArray(expJson.data.medicalHistory));

    // Update consent
    const resConsent = await fetch(`${BASE_URL}/patient/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'usr-01' },
      body: JSON.stringify({ consentGiven: true })
    });
    assert.strictEqual(resConsent.status, 200);
  });

  // Test 9: Tamper-Evident Security Audit Logs
  await runTest('Tamper-Evident Audit Trail captures system and security actions', async () => {
    const resAudit = await fetch(`${BASE_URL}/audit/logs`);
    assert.strictEqual(resAudit.status, 200);
    const auditJson = await resAudit.json();
    assert.strictEqual(auditJson.success, true);
    assert(auditJson.count > 0);
    const log = auditJson.logs[0];
    assert(log.id && log.timestamp && log.action && log.status);
  });

  console.log('\n' + '='.repeat(70));
  console.log(`  📊 TEST RUN SUMMARY: ${passedTests}/${totalTests} Tests Passed (${Math.round((passedTests/totalTests)*100)}% Success Rate)`);
  console.log('='.repeat(70) + '\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

startSuite().catch(err => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});
