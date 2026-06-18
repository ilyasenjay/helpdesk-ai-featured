import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";

function Home() {
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("unreachable"));
  }, []);

  return (
    <>
      <h1>Helpdesk</h1>
      <p>Server status: {status ?? "checking..."}</p>
    </>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  );
}

export default App;
