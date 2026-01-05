export const metadata = {
  title: 'Contact Us | Rentsimple',
  description: 'Get in touch with Rentsimple for support, questions, or partnership opportunities.'
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">Contact Us</h1>
      <p className="text-lg text-slate-700">We would love to hear from you! Reach out for support, questions, or partnership opportunities.</p>
      <section className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Email</h2>
        <p><a href="mailto:info@rentsimple.co.uk" className="text-indigo-600 hover:underline">info@rentsimple.co.uk</a></p>
      </section>
      <section className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Phone</h2>
        <p>+44 (0)7739870670</p>
      </section>
      <section className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Address</h2>
        <p>The Crown Hub,Main Street,Thornton, Fife, KY1 4AF </p>
      </section>
    </main>
  );
}
