import type { PropsWithChildren } from 'react'

export function Section({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <section className="section">
      <header className="section__header">
        <h1>{title}</h1>
      </header>
      <div className="section__content">{children}</div>
    </section>
  )
}
