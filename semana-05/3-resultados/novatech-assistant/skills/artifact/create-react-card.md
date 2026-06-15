# Skill — Create React Card

## Context

Use esta skill para gerar cards de resposta e feedback do painel web.

Frase de ativação: create a response or feedback card for the novatech panel.

## Pré-condições

1. Ler skills/domain/react-components.md.
2. Ler skills/foundation/typescript-conventions.md.

## Regras prescritivas

1. Card deve exibir answer, source document e confidence.
2. Props devem ser tipadas e sem any.
3. Componente deve ser puro e sem chamadas de rede.
4. Estados vazios devem ser explícitos.

## Template

```tsx
type QueryCardProps = {
	answer: string;
	sourceDocument: string | null;
	confidence: "low" | "medium" | "high";
};

export function QueryCard({ answer, sourceDocument, confidence }: QueryCardProps) {
	return (
		<article>
			<p>{answer}</p>
			<footer>
				<span>Source: {sourceDocument ?? "not available"}</span>
				<span>Confidence: {confidence}</span>
			</footer>
		</article>
	);
}
```

## DO

```tsx
<QueryCard answer={answer} sourceDocument={source_document} confidence={confidence} />
```

## DON'T

```tsx
<Card data={response} />
```

## Anti-padrões

- Não exibir source_document.
- Converter confidence em texto livre sem enum.
- Misturar formatação visual com chamada de API no mesmo componente.
