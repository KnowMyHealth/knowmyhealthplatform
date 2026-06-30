'use client'

export default function TermsOfServicePage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-20">
      <h1 className="text-4xl font-bold text-emerald-900 mb-2">Terms of Service</h1>
      <p className="text-sm text-emerald-600 mb-10">Last updated: June 2026</p>

      <div className="prose prose-emerald max-w-none space-y-8 text-emerald-900/80 leading-relaxed">

        <section>
          <h2 className="text-xl font-semibold text-emerald-900 mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the KnowMyHealth platform at <strong>knowmyhealth.in</strong>, you agree to be
            bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-emerald-900 mb-3">2. Description of Services</h2>
          <p>KnowMyHealth provides the following services:</p>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li>Online doctor consultations (video and in-clinic)</li>
            <li>Lab test booking and home sample collection</li>
            <li>Health checkup packages</li>
            <li>Prescription management and analysis</li>
            <li>Health insights and medical content</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-emerald-900 mb-3">3. Medical Disclaimer</h2>
          <p>
            KnowMyHealth is a healthcare facilitation platform. The information provided on this platform is for
            general informational purposes only and does not constitute medical advice. Always consult a qualified
            healthcare professional for medical diagnosis and treatment.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-emerald-900 mb-3">4. User Responsibilities</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide accurate and complete personal and health information.</li>
            <li>Use the platform only for lawful purposes.</li>
            <li>Not share your account credentials with others.</li>
            <li>Not misuse or attempt to disrupt the platform's services.</li>
            <li>Be at least 18 years old, or have parental consent if younger.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-emerald-900 mb-3">5. Appointments and Cancellations</h2>
          <p>
            Consultation bookings are subject to doctor availability. Cancellations made at least 24 hours in advance
            are eligible for a full refund. Late cancellations or no-shows may be subject to a cancellation fee as
            communicated during booking.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-emerald-900 mb-3">6. Payments and Refunds</h2>
          <p>
            All payments are processed securely. Refunds are processed within 5–7 business days for eligible
            cancellations. For disputes, contact us at <strong>knowmyhealth1@gmail.com</strong> within 7 days of
            the transaction.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-emerald-900 mb-3">7. Intellectual Property</h2>
          <p>
            All content on the KnowMyHealth platform, including text, graphics, logos, and software, is the
            property of KnowMyHealth and is protected by applicable intellectual property laws. You may not
            reproduce or distribute any content without prior written consent.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-emerald-900 mb-3">8. Limitation of Liability</h2>
          <p>
            KnowMyHealth shall not be liable for any indirect, incidental, or consequential damages arising from
            the use of our platform or reliance on information provided herein. Our total liability in any matter
            shall not exceed the amount paid by you for the specific service in question.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-emerald-900 mb-3">9. Governing Law</h2>
          <p>
            These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive
            jurisdiction of the courts in Bangalore, Karnataka.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-emerald-900 mb-3">10. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. Continued use of the platform after changes
            constitutes your acceptance of the revised Terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-emerald-900 mb-3">11. Contact Us</h2>
          <p>For questions about these Terms, contact us at:</p>
          <div className="mt-2 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <p><strong>KnowMyHealth</strong></p>
            <p>Email: knowmyhealth1@gmail.com</p>
            <p>Phone: 080 2356 5005</p>
            <p>Bangalore, Karnataka, India</p>
          </div>
        </section>

      </div>
    </main>
  )
}
