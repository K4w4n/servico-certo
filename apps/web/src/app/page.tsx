export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-xl rounded-xl border bg-card p-8 text-card-foreground shadow-sm">
        <span className="inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          Em construção
        </span>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Serviço Certo</h1>

        <p className="mt-2 text-muted-foreground">
          Estrutura inicial do projeto. As funcionalidades de ordens de serviço, faturamento e
          estoque serão adicionadas em breve.
        </p>
      </section>
    </main>
  );
}
