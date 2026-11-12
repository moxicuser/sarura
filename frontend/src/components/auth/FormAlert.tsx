export function FormAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-sarura-red/40 bg-sarura-red/5 px-3 py-2 text-sm font-medium text-sarura-red"
    >
      {message}
    </div>
  );
}
