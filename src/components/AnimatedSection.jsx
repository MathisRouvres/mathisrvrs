export default function AnimatedSection({
  id,
  children,
  className = '',
  delay = 0,
  inView = false,
}) {
  return (
    <section
      id={id}
      className={`transition-all duration-700 ease-out ${
        inView ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      } ${className}`}
      style={{ transitionDelay: inView ? `${delay}ms` : '0ms' }}
    >
      {children}
    </section>
  )
}
