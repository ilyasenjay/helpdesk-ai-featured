import { useEffect, useState } from "react";

export default function HomePage() {
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("unreachable"));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Home</h1>
      <p className="text-gray-600">Server status: {status ?? "checking…"}</p>
    </div>
  );
}
