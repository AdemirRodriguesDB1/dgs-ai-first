# Skill — React Components

## Context

Use esta skill para componentes do painel web, especialmente cards de resposta e feedback.

Frase de ativação recomendada: create dashboard components following novatech UI patterns.

## Regras prescritivas

1. Componentes devem ser funcionais e tipados.
2. Toda resposta exibida deve apresentar source_document.
3. Mostrar estado de confiança com rótulo low/medium/high.
4. Evitar lógica de negócio no componente; receber dados por props.
5. Não usar qualquer tipagem any em props.

## DO

```tsx
type ResponseCardProps = {
	answer: string;
	sourceDocument: string | null;
	confidence: "low" | "medium" | "high";
};

export function ResponseCard({ answer, sourceDocument, confidence }: ResponseCardProps) {
	return (
		<section>
			<p>{answer}</p>
			<small>Source: {sourceDocument ?? "not available"}</small>
			<small>Confidence: {confidence}</small>
		</section>
	);
}
```

## DON'T

```tsx
export function Card(props: any) {
	return <div>{JSON.stringify(props)}</div>;
}
```

## Anti-padrões

- Renderizar resposta sem fonte.
- Hardcode de textos de erro sem considerar estado de confiança.
- Componentes gigantes com fetch interno.

## Dependências

- skills/foundation/typescript-conventions.md
- skills/foundation/project-structure.md
