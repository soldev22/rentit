export const metadata = {
  title: 'Contact Us | RentIT',
  description: 'Get in touch with RentIT for support, questions, or partnership opportunities.'
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">Contact Us</h1>
      <p className="text-lg text-slate-700">We would love to hear from you! Reach out for support, questions, or partnership opportunities.</p>
      <section className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Email</h2>
        <p><a href="mailto:info@rentit.com" className="text-indigo-600 hover:underline">info@rentit.com</a></p>
      </section>
      <section className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Phone</h2>
        <p>+44 1234 567890</p>
      </section>
      <section className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Address</h2>
        <p>123 Main Street, London, UK</p>
      </section>
    </main>
  );
}
