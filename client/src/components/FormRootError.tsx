interface Props {
  message?: string;
}

export function FormRootError({ message }: Props) {
  if (!message) return null;

  return (
    <p data-testid="form-root-error" className="text-xs text-destructive">
      {message}
    </p>
  );
}
