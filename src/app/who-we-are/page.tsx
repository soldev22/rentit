export const metadata = {
  title: 'Who We Are | Rentsimple',
  description: 'Learn more about Rentsimple, our mission, and our team.'
};

export default function WhoWeArePage() {
  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">Who We Are</h1>
      <p className="text-lg text-slate-700">Rentsimple is dedicated to making renting easier, safer, and more transparent for everyone. Our team brings together years of experience in property management, technology, and customer service.</p>
      <section className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Our Mission</h2>
        <p>To connect landlords and tenants with a seamless, fair, and modern rental experience.</p>
      </section>
      <section className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Our Team</h2>
        <p>We are a diverse group of professionals passionate about property, technology, and helping people find their next home.</p>
      </section>
    </main>
  );
}
