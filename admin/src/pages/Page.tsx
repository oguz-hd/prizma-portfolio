import type { ReactNode } from 'react'

export function Page({ title, lead, children }: { title: string; lead?: ReactNode; children: ReactNode }) {
  return (
    <section className="page" aria-labelledby="page-title">
      <header className="page-head">
        <h1 className="page-title" id="page-title">
          {title}
        </h1>
        {lead && <p className="page-lead">{lead}</p>}
      </header>
      {children}
    </section>
  )
}
